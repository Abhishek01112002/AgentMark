r"""
session_status.py — AgentMark MCP Session Evidence Writer

Writes a tamper-evident, atomic JSON status file that records real MCP
protocol events (initialize, tools/list, transport close). The backend
reads this file to determine the truthful connection state.

File location: %APPDATA%\AgentMark\mcp_session_status.json  (Windows)
               ~/.local/share/AgentMark/mcp_session_status.json  (Linux)
               ~/Library/Application Support/AgentMark/... (macOS)

Security: This file NEVER contains API keys, tokens, or secrets.
"""

import asyncio
import hashlib
import hmac
import json
import logging
import os
import platform
import sys
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

logger = logging.getLogger("agentmark-mcp-server")

# ---------------------------------------------------------------------------
# Status file location helpers
# ---------------------------------------------------------------------------

def _get_status_dir() -> Path:
    """Return OS-appropriate per-user application data directory."""
    system = platform.system()
    if system == "Windows":
        appdata = os.environ.get("APPDATA") or Path.home() / "AppData" / "Roaming"
        return Path(appdata) / "AgentMark"
    elif system == "Darwin":
        return Path.home() / "Library" / "Application Support" / "AgentMark"
    else:
        xdg = os.environ.get("XDG_DATA_HOME") or Path.home() / ".local" / "share"
        return Path(xdg) / "AgentMark"


def get_status_file_path() -> Path:
    return _get_status_dir() / "mcp_session_status.json"


# ---------------------------------------------------------------------------
# Stale-session / PID-reuse detection helper
# ---------------------------------------------------------------------------

def _is_pid_alive(pid: int, start_time_iso: Optional[str]) -> bool:
    """
    Return True only if:
      1. The process with the given PID exists.
      2. Its actual OS start time matches the recorded start_time_iso
         (prevents false-positive when OS reuses the PID).

    start_time_iso comparison is best-effort; if it cannot be retrieved we
    fall back to a simple existence check.
    """
    if pid <= 0:
        return False
    try:
        os.kill(pid, 0)  # raises OSError if process doesn't exist
    except OSError:
        return False

    # Try to match start time via psutil (optional dependency).
    if start_time_iso:
        try:
            import psutil  # type: ignore
            proc = psutil.Process(pid)
            recorded_ts = datetime.fromisoformat(start_time_iso).timestamp()
            actual_ts = proc.create_time()
            # Allow 2-second tolerance for OS timer resolution differences.
            if abs(actual_ts - recorded_ts) > 2.0:
                return False
        except Exception:
            pass  # psutil unavailable or process vanished — accept PID check

    return True


def _get_own_process_start_time() -> Optional[str]:
    """Return current process create time as ISO-8601 UTC string."""
    try:
        import psutil  # type: ignore
        t = psutil.Process(os.getpid()).create_time()
        return datetime.fromtimestamp(t, tz=timezone.utc).isoformat()
    except Exception:
        return None


# ---------------------------------------------------------------------------
# SessionStatusWriter
# ---------------------------------------------------------------------------

class SessionStatusWriter:
    """
    Writes real MCP protocol events to an atomic JSON status file.

    Lifecycle:
      1. server_started()       — called in lifespan startup
      2. on_initialize()        — called when 'initialize' method is intercepted
      3. on_tools_list()        — called when 'tools/list' method is intercepted
      4. on_tool_registered()   — called for each registered tool
      5. heartbeat loop         — updates heartbeatAt every HEARTBEAT_INTERVAL_SECS
      6. on_transport_closed()  — called on stdin EOF or graceful shutdown
    """

    HEARTBEAT_INTERVAL_SECS = 30
    STALE_HEARTBEAT_SECS = 90  # Backend uses same threshold

    def __init__(self, registered_tool_names: List[str]) -> None:
        self._session_id = str(uuid.uuid4())
        self._pid = os.getpid()
        self._process_started_at = _get_own_process_start_time()
        self._registered_tool_names = list(registered_tool_names)
        self._status_path = get_status_file_path()
        self._heartbeat_task: Optional[asyncio.Task] = None
        self._transport_open = True

        # Evidence flags — only set on real protocol events
        self._initialize_received = False
        self._initialize_received_at: Optional[str] = None
        self._client_info_name: Optional[str] = None
        self._client_info_version: Optional[str] = None
        self._tools_list_requested = False
        self._tools_list_requested_at: Optional[str] = None
        self._last_activity_at: Optional[str] = None
        self._last_error: Optional[str] = None

    # ------------------------------------------------------------------
    # Public event methods
    # ------------------------------------------------------------------

    def server_started(self) -> None:
        """Write initial status immediately on server start."""
        self._write(disconnect_reason=None)
        logger.info(
            "[SessionStatus] Server started. Session ID: %s  PID: %d  StatusFile: %s",
            self._session_id, self._pid, self._status_path,
        )

    def on_initialize(
        self,
        client_name: Optional[str] = None,
        client_version: Optional[str] = None,
    ) -> None:
        """Record that Claude sent an MCP 'initialize' request."""
        now = _now_iso()
        self._initialize_received = True
        self._initialize_received_at = now
        self._last_activity_at = now
        self._client_info_name = client_name
        self._client_info_version = client_version
        self._write(disconnect_reason=None)
        logger.info(
            "[SessionStatus] MCP initialize received from client '%s' %s",
            client_name, client_version,
        )

    def on_tools_list(self) -> None:
        """Record that Claude sent a 'tools/list' request."""
        now = _now_iso()
        self._tools_list_requested = True
        self._tools_list_requested_at = now
        self._last_activity_at = now
        self._write(disconnect_reason=None)
        logger.info(
            "[SessionStatus] tools/list requested. %d tools registered.",
            len(self._registered_tool_names),
        )

    def on_activity(self) -> None:
        """Update last activity timestamp (called on any JSON-RPC message)."""
        self._last_activity_at = _now_iso()
        # Don't write on every activity — heartbeat covers recency

    def on_transport_closed(self, reason: str = "stdin_eof") -> None:
        """
        Mark the transport/session as closed.
        Called on stdin EOF or explicit shutdown — NOT merely on process exit.
        This is the key distinction: transport closed = Claude disconnected.
        """
        self._transport_open = False
        self._write(disconnect_reason=reason)
        logger.info("[SessionStatus] Transport closed: %s", reason)

    def set_error(self, error_message: str) -> None:
        """Record a last-error string for diagnostic purposes."""
        self._last_error = error_message[:500]
        self._write(disconnect_reason=None)

    # ------------------------------------------------------------------
    # Heartbeat loop
    # ------------------------------------------------------------------

    async def start_heartbeat(self) -> None:
        """Start background asyncio heartbeat task."""
        self._heartbeat_task = asyncio.create_task(self._heartbeat_loop())

    async def stop_heartbeat(self) -> None:
        """Cancel heartbeat task gracefully."""
        if self._heartbeat_task and not self._heartbeat_task.done():
            self._heartbeat_task.cancel()
            try:
                await self._heartbeat_task
            except asyncio.CancelledError:
                pass

    async def _heartbeat_loop(self) -> None:
        """Update heartbeatAt every HEARTBEAT_INTERVAL_SECS seconds."""
        while True:
            try:
                await asyncio.sleep(self.HEARTBEAT_INTERVAL_SECS)
                if self._transport_open:
                    self._write(disconnect_reason=None)
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.debug("[SessionStatus] Heartbeat write error: %s", exc)

    # ------------------------------------------------------------------
    # Graceful shutdown
    # ------------------------------------------------------------------

    async def shutdown(self, reason: str = "graceful_shutdown") -> None:
        """Stop heartbeat and mark session disconnected."""
        await self.stop_heartbeat()
        self.on_transport_closed(reason)

    # ------------------------------------------------------------------
    # Atomic file writer
    # ------------------------------------------------------------------

    def _write(self, disconnect_reason: Optional[str]) -> None:
        """Write status atomically: temp file → rename.

        Session guard: reads the existing status file before writing.
        If it already belongs to a different (newer) session AND we have
        already established our session previously, this write is suppressed.
        This prevents a slow-shutting Session A from overwriting an already-active
        Session B's status file.
        """
        status_dir = self._status_path.parent
        try:
            status_dir.mkdir(parents=True, exist_ok=True)
        except OSError as exc:
            logger.warning("[SessionStatus] Cannot create status dir: %s", exc)
            return

        # ── Session guard ─────────────────────────────────────────────────────────
        try:
            existing_text = self._status_path.read_text(encoding="utf-8")
            existing = json.loads(existing_text)
            existing_sid = existing.get("sessionId", "")
            
            if existing_sid and existing_sid != self._session_id:
                if getattr(self, "_has_written_once", False):
                    logger.info(
                        "[SessionStatus] Write suppressed — file now owned by session %s, "
                        "this session is %s (likely shutting down). Not overwriting.",
                        existing_sid[:8], self._session_id[:8],
                    )
                    return
                # Else: we are a new session taking over. Overwrite is expected.
        except (OSError, json.JSONDecodeError, KeyError):
            pass  # File absent or unreadable — safe to write fresh

        payload = {
            "sessionId": self._session_id,
            "serverPid": self._pid,
            "processStartedAt": self._process_started_at,
            "serverStartedAt": _SERVER_STARTED_AT,
            "transportOpen": self._transport_open,
            "initializeReceived": self._initialize_received,
            "initializeReceivedAt": self._initialize_received_at,
            "clientInfo": {
                "name": self._client_info_name,
                "version": self._client_info_version,
            },
            "toolsListRequested": self._tools_list_requested,
            "toolsListRequestedAt": self._tools_list_requested_at,
            "registeredToolCount": len(self._registered_tool_names),
            "registeredToolNames": self._registered_tool_names,
            "lastActivityAt": self._last_activity_at,
            "heartbeatAt": _now_iso(),
            "disconnectReason": disconnect_reason,
            "lastError": self._last_error,
        }

        # ── Sign Payload ─────────────────────────────────────────────────────────
        # Add HMAC signature to prevent local forgery of connection state
        api_key = os.environ.get("AGENTMARK_API_KEY", "")
        if api_key:
            # Serialize without signature to compute hash
            raw_payload = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
            signature = hmac.new(api_key.encode("utf-8"), raw_payload, hashlib.sha256).hexdigest()
            payload["signature"] = signature

        tmp_path = self._status_path.with_suffix(".tmp")
        try:
            with open(tmp_path, "w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2)
                f.flush()
                os.fsync(f.fileno())
            # Atomic rename (works on same filesystem)
            os.replace(tmp_path, self._status_path)
            self._has_written_once = True
        except OSError as exc:
            logger.warning("[SessionStatus] Failed to write status file: %s", exc)
            try:
                tmp_path.unlink(missing_ok=True)
            except OSError:
                pass


# ---------------------------------------------------------------------------
# Module-level singleton helpers
# ---------------------------------------------------------------------------

_SERVER_STARTED_AT: str = datetime.now(tz=timezone.utc).isoformat()
_writer_instance: Optional[SessionStatusWriter] = None


def get_writer() -> Optional[SessionStatusWriter]:
    return _writer_instance


def init_writer(tool_names: List[str]) -> SessionStatusWriter:
    global _writer_instance
    _writer_instance = SessionStatusWriter(tool_names)
    return _writer_instance


def _now_iso() -> str:
    return datetime.now(tz=timezone.utc).isoformat()
