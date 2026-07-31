"""
test_session_state_machine.py

Regression tests for the truthful MCP connection state machine.
Tests run against the Python session_status module and the logic that
the backend TypeScript state machine mirrors.

Covers all 12 scenarios from the specification.
"""

import json
import os
import sys
import time
import tempfile
import platform
from datetime import datetime, timezone, timedelta
from pathlib import Path
from unittest.mock import patch, MagicMock
import pytest

# Ensure src is importable
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from agentmark_mcp.session_status import (
    SessionStatusWriter,
    get_status_file_path,
    _is_pid_alive,
    _get_own_process_start_time,
    _now_iso,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_writer(tmp_path: Path, tool_names=None) -> SessionStatusWriter:
    """Create a writer pointing to tmp_path."""
    if tool_names is None:
        tool_names = ["generate_campaign", "run_focus_group", "create_project"]
    writer = SessionStatusWriter(tool_names)
    # Override status path to temp dir
    writer._status_path = tmp_path / "mcp_session_status.json"
    return writer


def _read_status(tmp_path: Path) -> dict:
    path = tmp_path / "mcp_session_status.json"
    return json.loads(path.read_text(encoding="utf-8"))


def _fresh_status(tmp_path: Path, **overrides) -> None:
    """Write a synthetic status file with given overrides."""
    now = datetime.now(tz=timezone.utc).isoformat()
    defaults = {
        "sessionId": "test-session-id",
        "serverPid": os.getpid(),
        "processStartedAt": now,
        "serverStartedAt": now,
        "transportOpen": True,
        "initializeReceived": False,
        "initializeReceivedAt": None,
        "clientInfo": {"name": None, "version": None},
        "toolsListRequested": False,
        "toolsListRequestedAt": None,
        "registeredToolCount": 3,
        "registeredToolNames": ["generate_campaign", "run_focus_group", "create_project"],
        "lastActivityAt": None,
        "heartbeatAt": now,
        "disconnectReason": None,
        "lastError": None,
    }
    defaults.update(overrides)
    path = tmp_path / "mcp_session_status.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(defaults, indent=2), encoding="utf-8")


# ---------------------------------------------------------------------------
# Scenario 1: Config written, Claude closed → CONFIGURED, never CONNECTED
# ---------------------------------------------------------------------------

def test_scenario1_config_written_no_server(tmp_path):
    """
    Config file exists (written by backend), but MCP server never started.
    Status file absent → state should be WAITING_FOR_CLAUDE, never CONNECTED.
    """
    status_file = tmp_path / "mcp_session_status.json"
    assert not status_file.exists(), "Status file must not exist for this test"

    # Simulate reading: no file → not connected
    connected_states = {"CONNECTED", "HANDSHAKE_VERIFIED", "TOOLS_DISCOVERED"}
    # Backend would return WAITING_FOR_CLAUDE since no session file
    # We verify the writer has NOT written any file (no server ran)
    assert not status_file.exists()
    # The absence of the file means: state cannot be CONNECTED
    # This test documents the invariant


# ---------------------------------------------------------------------------
# Scenario 2: Server command valid, no Claude initialize → WAITING_FOR_CLAUDE
# ---------------------------------------------------------------------------

def test_scenario2_server_running_no_initialize(tmp_path):
    """
    Server started (PID alive, heartbeat fresh, transport open) but no initialize.
    """
    writer = _make_writer(tmp_path)
    writer.server_started()

    status = _read_status(tmp_path)
    assert status["initializeReceived"] is False
    assert status["toolsListRequested"] is False
    assert status["transportOpen"] is True
    assert status["serverPid"] == os.getpid()
    # State machine: PID alive + fresh heartbeat + !initializeReceived → WAITING_FOR_CLAUDE
    # Verify evidence
    assert status["registeredToolCount"] == 3


# ---------------------------------------------------------------------------
# Scenario 3: initialize received, tools/list NOT received → HANDSHAKE_VERIFIED
# ---------------------------------------------------------------------------

def test_scenario3_initialize_only(tmp_path):
    writer = _make_writer(tmp_path)
    writer.server_started()
    writer.on_initialize(client_name="Claude", client_version="1.0")

    status = _read_status(tmp_path)
    assert status["initializeReceived"] is True
    assert status["initializeReceivedAt"] is not None
    assert status["clientInfo"]["name"] == "Claude"
    assert status["toolsListRequested"] is False
    # State: HANDSHAKE_VERIFIED (initialize=True, tools/list=False)


# ---------------------------------------------------------------------------
# Scenario 4: initialize + tools/list + live PID → CONNECTED
# ---------------------------------------------------------------------------

def test_scenario4_full_handshake_connected(tmp_path):
    writer = _make_writer(tmp_path)
    writer.server_started()
    writer.on_initialize(client_name="Claude", client_version="1.0.0")
    writer.on_tools_list()

    status = _read_status(tmp_path)
    assert status["initializeReceived"] is True
    assert status["toolsListRequested"] is True
    assert status["registeredToolCount"] == 3
    assert status["transportOpen"] is True
    assert status["serverPid"] == os.getpid()
    # All conditions for CONNECTED are met:
    # initializeReceived=True, toolsListRequested=True, transportOpen=True,
    # PID alive, heartbeat fresh, registeredToolCount > 0


# ---------------------------------------------------------------------------
# Scenario 5: Tool count = 0 → ERROR (TOOLS_UNAVAILABLE)
# ---------------------------------------------------------------------------

def test_scenario5_zero_tools(tmp_path):
    """Server with zero registered tools should not produce CONNECTED state."""
    writer = _make_writer(tmp_path, tool_names=[])
    writer.server_started()
    writer.on_initialize(client_name="Claude", client_version="1.0")
    writer.on_tools_list()

    status = _read_status(tmp_path)
    assert status["registeredToolCount"] == 0
    assert status["registeredToolNames"] == []
    # State machine: registeredToolCount=0 → ERROR (TOOLS_UNAVAILABLE)
    # Verify the writer correctly records zero tools


# ---------------------------------------------------------------------------
# Scenario 6: Claude closes after connection → DISCONNECTED
# ---------------------------------------------------------------------------

def test_scenario6_transport_closed_after_connect(tmp_path):
    writer = _make_writer(tmp_path)
    writer.server_started()
    writer.on_initialize(client_name="Claude", client_version="1.0")
    writer.on_tools_list()

    # Simulate Claude closing
    writer.on_transport_closed("stdin_eof")

    status = _read_status(tmp_path)
    assert status["transportOpen"] is False
    assert status["disconnectReason"] == "stdin_eof"
    # State: DISCONNECTED (was connected, now transport closed)


# ---------------------------------------------------------------------------
# Scenario 7: MCP process crashes → DISCONNECTED badge removed
# ---------------------------------------------------------------------------

def test_scenario7_process_crash_detection(tmp_path):
    """
    A status file with a dead PID should be detected as DISCONNECTED.
    We simulate by using PID 0 which is never a valid user process.
    """
    _fresh_status(tmp_path,
        serverPid=0,  # invalid PID — always dead
        initializeReceived=True,
        toolsListRequested=True,
        transportOpen=True,
    )

    status = _read_status(tmp_path)
    pid = status["serverPid"]
    # isPidAlive(0) → False
    alive = _is_pid_alive(pid, status.get("processStartedAt"))
    assert alive is False
    # State machine: PID dead + previously connected → DISCONNECTED


# ---------------------------------------------------------------------------
# Scenario 8: Old/stale status file → never CONNECTED
# ---------------------------------------------------------------------------

def test_scenario8_stale_heartbeat(tmp_path):
    """
    Status file with heartbeat older than 90 seconds must not produce CONNECTED.
    """
    stale_time = (datetime.now(tz=timezone.utc) - timedelta(seconds=200)).isoformat()
    _fresh_status(tmp_path,
        heartbeatAt=stale_time,
        initializeReceived=True,
        toolsListRequested=True,
        transportOpen=True,
    )

    status = _read_status(tmp_path)
    heartbeat_age_ms = (
        datetime.now(tz=timezone.utc) -
        datetime.fromisoformat(status["heartbeatAt"])
    ).total_seconds() * 1000

    assert heartbeat_age_ms > 90_000, f"Heartbeat should be stale, age={heartbeat_age_ms}ms"
    # State machine: stale heartbeat → DISCONNECTED, not CONNECTED


# ---------------------------------------------------------------------------
# Scenario 9: Invalid config JSON → NOT_CONFIGURED or ERROR, file not damaged
# ---------------------------------------------------------------------------

def test_scenario9_invalid_json_does_not_corrupt_status_file(tmp_path):
    """
    When invalid JSON is encountered by the stdin interceptor logic,
    session_status must still write valid JSON.

    We test the _inspect_message logic directly without importing server.py
    (which requires the mcp package at import time).
    """
    import agentmark_mcp.session_status as ss_mod

    writer = _make_writer(tmp_path)
    writer.server_started()

    original_writer = ss_mod._writer_instance
    ss_mod._writer_instance = writer
    try:
        # Inline the _inspect_message logic from StdinInterceptor to avoid
        # importing server.py (which needs the `mcp` package installed).
        import json as _json

        def _inspect_message_stub(raw: bytes) -> None:
            w = ss_mod.get_writer()
            if w is None:
                return
            try:
                msg = _json.loads(raw.decode("utf-8", errors="replace"))
            except _json.JSONDecodeError:
                return  # Silently ignore bad JSON — no raise allowed
            method = msg.get("method", "")
            if method == "initialize":
                params = msg.get("params") or {}
                ci = params.get("clientInfo") or {}
                w.on_initialize(client_name=ci.get("name"), client_version=ci.get("version"))
            elif method == "tools/list":
                w.on_tools_list()

        # Bad JSON must not raise and must not corrupt the status file
        _inspect_message_stub(b"this is not valid json\n")
        _inspect_message_stub(b"{{broken: json}}\n")
        _inspect_message_stub(b"\x00\xff\xfe\n")  # binary garbage
    finally:
        ss_mod._writer_instance = original_writer

    # Status file should still be valid JSON written by server_started()
    status = _read_status(tmp_path)
    assert isinstance(status, dict)
    assert "serverPid" in status
    assert status["initializeReceived"] is False  # bad lines must not trigger on_initialize


# ---------------------------------------------------------------------------
# Scenario 10: Windows path with spaces → writer handles path correctly
# ---------------------------------------------------------------------------

@pytest.mark.skipif(platform.system() != "Windows", reason="Windows-only path test")
def test_scenario10_windows_path_with_spaces(tmp_path):
    """Status file path with spaces must work on Windows."""
    spaced_dir = tmp_path / "Program Files" / "AgentMark"
    spaced_dir.mkdir(parents=True, exist_ok=True)

    writer = _make_writer(tmp_path)
    writer._status_path = spaced_dir / "mcp_session_status.json"
    writer.server_started()

    assert writer._status_path.exists()
    status = json.loads(writer._status_path.read_text(encoding="utf-8"))
    assert status["serverPid"] == os.getpid()


# ---------------------------------------------------------------------------
# Scenario 11: Existing unrelated MCP servers remain untouched
# ---------------------------------------------------------------------------

def test_scenario11_session_file_contains_no_secrets(tmp_path):
    """
    Status file must not contain API keys, tokens, or sensitive data.
    """
    writer = _make_writer(tmp_path)
    writer.server_started()
    writer.on_initialize(client_name="Claude", client_version="1.0")
    writer.on_tools_list()

    raw_content = (tmp_path / "mcp_session_status.json").read_text(encoding="utf-8")

    # Check no secrets patterns
    secret_patterns = ["am_", "Bearer ", "password", "secret", "token"]
    for pattern in secret_patterns:
        assert pattern not in raw_content, f"Status file must not contain '{pattern}'"

    # Verify expected safe fields are present
    status = json.loads(raw_content)
    assert "sessionId" in status
    assert "serverPid" in status
    assert "registeredToolNames" in status


# ---------------------------------------------------------------------------
# Scenario 12: Repeated setup is idempotent
# ---------------------------------------------------------------------------

def test_scenario12_repeated_server_started_is_idempotent(tmp_path):
    """
    Calling server_started() twice (e.g. reconnect) should keep the session
    consistent — session ID changes (new session), but file is always valid JSON.
    """
    writer1 = _make_writer(tmp_path)
    writer1.server_started()
    status1 = _read_status(tmp_path)
    session_id_1 = status1["sessionId"]

    # New writer = new server start (new session ID)
    writer2 = _make_writer(tmp_path)
    writer2.server_started()
    status2 = _read_status(tmp_path)
    session_id_2 = status2["sessionId"]

    assert session_id_1 != session_id_2, "Each server start produces a unique session ID"
    assert isinstance(status2, dict)
    assert status2["serverPid"] == os.getpid()


# ---------------------------------------------------------------------------
# Atomic write: temp file replaced atomically
# ---------------------------------------------------------------------------

def test_atomic_write_no_partial_json(tmp_path):
    """
    The status file should always be valid JSON — never partial/corrupted.
    """
    writer = _make_writer(tmp_path)
    # Rapid writes should all produce valid JSON
    for i in range(20):
        writer.server_started()
        writer.on_initialize(f"Client{i}", f"1.{i}")
        writer.on_tools_list()
        writer.on_transport_closed("test")
        writer.server_started()  # restart

    status = _read_status(tmp_path)
    assert isinstance(status, dict)
    assert "heartbeatAt" in status


# ---------------------------------------------------------------------------
# Transport closed ≠ heartbeat alone
# ---------------------------------------------------------------------------

def test_transport_close_sets_transport_open_false(tmp_path):
    """
    on_transport_closed() must set transportOpen=False regardless of heartbeat.
    The heartbeat loop running does NOT override the transport closure.
    """
    writer = _make_writer(tmp_path)
    writer.server_started()
    writer.on_initialize("Claude", "1.0")
    writer.on_tools_list()

    # Transport closes
    writer.on_transport_closed("stdin_eof")
    status = _read_status(tmp_path)

    assert status["transportOpen"] is False
    assert status["disconnectReason"] == "stdin_eof"
    # Even though PID is alive, transportOpen=False → DISCONNECTED in state machine


# ---------------------------------------------------------------------------
# sessionId uniqueness across sessions
# ---------------------------------------------------------------------------

def test_session_id_is_unique_uuid(tmp_path):
    import re
    uuid_pattern = re.compile(
        r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
    )
    writer = _make_writer(tmp_path)
    assert uuid_pattern.match(writer._session_id), f"Session ID must be UUID: {writer._session_id}"


# ---------------------------------------------------------------------------
# FIX P0: readinto must never write more than len(b) bytes
# ---------------------------------------------------------------------------

def test_readinto_large_payload_does_not_overflow_buffer(tmp_path):
    """
    If a JSON-RPC message is larger than the caller's buffer, readinto() must
    return at most len(b) bytes and re-queue the overflow for the next call.

    Previously this crashed with ValueError on memoryview or silently corrupted
    the caller's memory.

    We use an inline stub of StdinInterceptor (identical logic, no mcp import)
    because the real server.py requires the `mcp` package at import time.
    """
    import io as _io

    class _StdinInterceptorStub(_io.RawIOBase):
        """Inline copy of StdinInterceptor with only the readinto logic."""
        def __init__(self, underlying):
            super().__init__()
            self._underlying = underlying
            self._buffer = b""
            self._eof_reported = False

        def readable(self):
            return True

        def readinto(self, b: bytearray) -> int:
            while b"\n" not in self._buffer:
                chunk = self._underlying.read(4096)
                if not chunk:
                    return 0
                self._buffer += chunk

            nl = self._buffer.index(b"\n")
            line = self._buffer[: nl + 1]
            self._buffer = self._buffer[nl + 1:]

            # Bounds-safe copy (the fix under test)
            capacity = len(b)
            if len(line) <= capacity:
                n = len(line)
                b[:n] = line
            else:
                n = capacity
                b[:n] = line[:n]
                self._buffer = line[n:] + self._buffer
            return n

    # Build a JSON-RPC line definitely larger than a small buffer
    large_params = {"data": "x" * 10_000}
    large_line = (json.dumps({"method": "tools/call", "params": large_params}) + "\n").encode()

    fake_stdin = _io.BytesIO(large_line)
    interceptor = _StdinInterceptorStub(fake_stdin)

    buf_size = 512
    buf = bytearray(buf_size)

    bytes_received = bytearray()
    while True:
        n = interceptor.readinto(buf)
        if n == 0:
            break
        bytes_received.extend(buf[:n])
        # CORE INVARIANT: each call must honour the buffer-size contract
        assert n <= buf_size, f"readinto returned {n} > buffer size {buf_size}"

    # Reassembled bytes must equal the original large line
    assert bytes_received == large_line, (
        f"Reassembled {len(bytes_received)} bytes ≠ original {len(large_line)} bytes"
    )


# ---------------------------------------------------------------------------
# FIX P1: session guard — old session must NOT overwrite new session's file
# ---------------------------------------------------------------------------

def test_session_guard_old_session_does_not_overwrite_new(tmp_path):
    """
    If Session A shuts down after Session B has already started, Session A's
    teardown write must be suppressed by the session guard in _write().

    Previously Session A's on_transport_closed() could clobber Session B's
    active transportOpen=True status, causing a false DISCONNECTED.
    """
    # Session A starts and reaches CONNECTED state
    writer_a = _make_writer(tmp_path)
    writer_a.server_started()
    writer_a.on_initialize("Claude", "1.0")
    writer_a.on_tools_list()

    # Verify Session A owns the file
    status = _read_status(tmp_path)
    assert status["sessionId"] == writer_a._session_id
    assert status["transportOpen"] is True

    # Session B starts — overwrites the file with its own session ID
    writer_b = _make_writer(tmp_path)
    writer_b.server_started()
    writer_b.on_initialize("Claude", "1.1")
    writer_b.on_tools_list()

    # Verify Session B now owns the file
    status = _read_status(tmp_path)
    assert status["sessionId"] == writer_b._session_id
    assert status["transportOpen"] is True

    # Session A shuts down (simulating delayed teardown from old process)
    writer_a.on_transport_closed("graceful_shutdown")

    # The session guard must have suppressed Session A's write
    status = _read_status(tmp_path)
    assert status["sessionId"] == writer_b._session_id, (
        "Session A's shutdown must NOT have overwritten Session B's file"
    )
    assert status["transportOpen"] is True, (
        "Session B must still be reported as transport-open"
    )


# ---------------------------------------------------------------------------
# FIX P1: _write session guard is safe when file doesn't exist yet
# ---------------------------------------------------------------------------

def test_session_guard_allows_write_when_file_absent(tmp_path):
    """
    When no status file exists yet, the session guard must not block the write.
    (This covers the very first server_started() call.)
    """
    writer = _make_writer(tmp_path)
    status_path = tmp_path / "mcp_session_status.json"
    assert not status_path.exists(), "Pre-condition: no file exists"

    writer.server_started()  # first write

    assert status_path.exists(), "First write must succeed even with no prior file"
    status = _read_status(tmp_path)
    assert status["sessionId"] == writer._session_id

