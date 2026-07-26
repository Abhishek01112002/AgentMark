"""
client.py — AgentMark HTTP Client

Async HTTP client wrapping httpx.AsyncClient with:
  - Explicit connection pool limits (prevents socket starvation under load)
  - Granular connect vs. read timeouts
  - Automatic exponential-backoff retry on transient 429/5xx errors
  - get_campaign(): canonical unwrapper for the { campaign: {...} } response
    envelope that GET /api/campaigns/:id always returns

All logger calls use %-style lazy formatting — the string is never built
unless the log level is active.
"""

import httpx
import logging
import uuid
from typing import Any, Dict, List, Optional

from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
    before_sleep_log,
)

from .config import (
    AGENTMARK_API_URL,
    AGENTMARK_API_KEY,
    HTTP_MAX_CONNECTIONS,
    HTTP_MAX_KEEPALIVE_CONNECTIONS,
    HTTP_CONNECT_TIMEOUT_SECS,
    HTTP_READ_TIMEOUT_SECS,
)

logger = logging.getLogger("agentmark-mcp-server")


class TransientAPIError(Exception):
    """Raised on retryable 429 / 5xx responses so tenacity can retry them."""


import json
import os
import platform
from pathlib import Path

def _get_all_config_paths() -> List[Path]:
    """Return all OS-specific Claude Desktop config file paths (mirrors backend getAllClaudeConfigPaths)."""
    system = platform.system()
    paths: List[Path] = []

    if system == "Windows":
        appdata = os.environ.get("APPDATA")
        primary = (
            Path(appdata) / "Claude" / "claude_desktop_config.json"
            if appdata
            else Path.home() / "AppData" / "Roaming" / "Claude" / "claude_desktop_config.json"
        )
        paths.append(primary)

        # UWP Microsoft Store app paths (Claude_ prefix in Packages dir)
        local_app_data = os.environ.get("LOCALAPPDATA")
        packages_dir = (
            Path(local_app_data) / "Packages"
            if local_app_data
            else Path.home() / "AppData" / "Local" / "Packages"
        )
        try:
            if packages_dir.exists():
                for entry in packages_dir.iterdir():
                    if entry.name.lower().startswith("claude_"):
                        uwp_config = entry / "LocalCache" / "Roaming" / "Claude" / "claude_desktop_config.json"
                        if uwp_config.parent.exists():
                            paths.append(uwp_config)
        except Exception:
            pass
    elif system == "Darwin":
        paths.append(Path.home() / "Library" / "Application Support" / "Claude" / "claude_desktop_config.json")
    else:
        paths.append(Path.home() / ".config" / "Claude" / "claude_desktop_config.json")

    return paths


import time

_api_key_cache: Optional[str] = None
_api_key_cache_expiry: float = 0.0
_API_KEY_CACHE_TTL_SECS: float = 10.0


def get_live_api_key() -> Optional[str]:
    """Read the latest API key with environment variable precedence and in-memory TTL caching."""
    global _api_key_cache, _api_key_cache_expiry

    # 1. Environment variables take precedence
    env_key = os.environ.get("AGENTMARK_API_KEY")
    if env_key and isinstance(env_key, str) and env_key.startswith("am_"):
        return env_key

    # 2. Check in-memory TTL cache
    now = time.time()
    if _api_key_cache is not None and now < _api_key_cache_expiry:
        return _api_key_cache

    # 3. Read from Claude Desktop config paths
    for config_path in _get_all_config_paths():
        try:
            if config_path.exists():
                with open(config_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    key = data.get("mcpServers", {}).get("agentmark", {}).get("env", {}).get("AGENTMARK_API_KEY")
                    if key and isinstance(key, str) and key.startswith("am_"):
                        logger.debug("Loaded live API key from: %s", config_path)
                        _api_key_cache = key
                        _api_key_cache_expiry = now + _API_KEY_CACHE_TTL_SECS
                        return key
        except Exception as exc:
            logger.debug("Failed to read dynamic key from %s: %s", config_path, exc)

    # 4. Fallback to module-level config
    _api_key_cache = AGENTMARK_API_KEY
    _api_key_cache_expiry = now + _API_KEY_CACHE_TTL_SECS
    return AGENTMARK_API_KEY


class AgentMarkClient:
    """
    Async HTTP client for all AgentMark backend API calls.

    Manages a single shared httpx.AsyncClient instance across the server
    lifespan, configured with explicit pool limits and timeouts.
    """

    def __init__(self) -> None:
        self.base_url = AGENTMARK_API_URL
        self.active_tool_name: Optional[str] = None
        self.invocation_id: Optional[str] = None

        # Explicit pool caps prevent socket exhaustion in concurrent-tool scenarios.
        limits = httpx.Limits(
            max_connections=HTTP_MAX_CONNECTIONS,
            max_keepalive_connections=HTTP_MAX_KEEPALIVE_CONNECTIONS,
        )

        # Separate connect and read timeouts:
        #   connect: 10s — enough for local or cloud backend to accept TCP
        #   read:   300s — AI pipeline responses can take several minutes
        timeout = httpx.Timeout(HTTP_READ_TIMEOUT_SECS, connect=HTTP_CONNECT_TIMEOUT_SECS)

        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={"Content-Type": "application/json"},
            limits=limits,
            timeout=timeout,
        )

    async def close(self) -> None:
        """Release the underlying connection pool safely. Called during server lifespan teardown."""
        if hasattr(self, "client") and self.client and not self.client.is_closed:
            try:
                await self.client.aclose()
                logger.info("AgentMark Client connection pool closed cleanly.")
            except Exception as exc:
                logger.warning("Exception during connection pool teardown: %s", exc)

    # ── POST ──────────────────────────────────────────────────────────────────

    def set_active_tool(self, tool_name: Optional[str]) -> None:
        """Set the active MCP tool name and generate a unique invocation ID for header injection."""
        self.active_tool_name = tool_name
        self.invocation_id = str(uuid.uuid4()) if tool_name else None

    def _build_headers(self, extra_headers: Optional[Dict[str, str]] = None) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        api_key = get_live_api_key()
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
            logger.info("Using dynamic API Key prefix: %s...", api_key[:12])
        if self.active_tool_name:
            headers["X-MCP-Tool-Name"] = self.active_tool_name
        if self.invocation_id:
            headers["X-MCP-Invocation-ID"] = self.invocation_id
            headers["X-Request-ID"] = f"mcp_{self.invocation_id[:12]}"
        if extra_headers:
            headers.update(extra_headers)
        return headers

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(TransientAPIError),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True,
    )
    async def post(
        self,
        path: str,
        payload: Dict[str, Any],
        extra_headers: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """POST to `path` with JSON `payload`. Merges `extra_headers` into the request."""
        headers = self._build_headers(extra_headers)

        try:
            logger.info("POST %s%s", self.base_url, path)
            response = await self.client.post(path, json=payload, headers=headers)

            if response.status_code in (429, 502, 503, 504):
                raise TransientAPIError(
                    "Transient status %d on POST %s: %s"
                    % (response.status_code, path, response.text[:200])
                )

            response.raise_for_status()
            return response.json()

        except httpx.HTTPStatusError as exc:
            logger.error(
                "HTTP %d on POST %s: %s",
                exc.response.status_code,
                path,
                exc.response.text[:400],
            )
            raise RuntimeError(
                "AgentMark API returned %d on POST %s: %s"
                % (exc.response.status_code, path, exc.response.text[:400])
            ) from exc

        except httpx.RequestError as exc:
            raise TransientAPIError("Request error on POST %s: %s" % (path, exc)) from exc

    # ── PATCH ─────────────────────────────────────────────────────────────────

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(TransientAPIError),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True,
    )
    async def patch(
        self,
        path: str,
        payload: Dict[str, Any],
        extra_headers: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """PATCH to `path` with JSON `payload`. Merges `extra_headers` into the request."""
        headers = self._build_headers(extra_headers)

        try:
            logger.info("PATCH %s%s", self.base_url, path)
            response = await self.client.patch(path, json=payload, headers=headers)

            if response.status_code in (429, 502, 503, 504):
                raise TransientAPIError(
                    "Transient status %d on PATCH %s: %s"
                    % (response.status_code, path, response.text[:200])
                )

            response.raise_for_status()
            return response.json()

        except httpx.HTTPStatusError as exc:
            logger.error(
                "HTTP %d on PATCH %s: %s",
                exc.response.status_code,
                path,
                exc.response.text[:400],
            )
            raise RuntimeError(
                "AgentMark API returned %d on PATCH %s: %s"
                % (exc.response.status_code, path, exc.response.text[:400])
            ) from exc

        except httpx.RequestError as exc:
            raise TransientAPIError("Request error on PATCH %s: %s" % (path, exc)) from exc

    # ── PUT ───────────────────────────────────────────────────────────────────

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(TransientAPIError),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True,
    )
    async def put(
        self,
        path: str,
        payload: Dict[str, Any],
        extra_headers: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """PUT to `path` with JSON `payload`. Merges `extra_headers` into the request."""
        headers = self._build_headers(extra_headers)

        try:
            logger.info("PUT %s%s", self.base_url, path)
            response = await self.client.put(path, json=payload, headers=headers)

            if response.status_code in (429, 502, 503, 504):
                raise TransientAPIError(
                    "Transient status %d on PUT %s: %s"
                    % (response.status_code, path, response.text[:200])
                )

            response.raise_for_status()
            return response.json()

        except httpx.HTTPStatusError as exc:
            logger.error(
                "HTTP %d on PUT %s: %s",
                exc.response.status_code,
                path,
                exc.response.text[:400],
            )
            raise RuntimeError(
                "AgentMark API returned %d on PUT %s: %s"
                % (exc.response.status_code, path, exc.response.text[:400])
            ) from exc

        except httpx.RequestError as exc:
            raise TransientAPIError("Request error on PUT %s: %s" % (path, exc)) from exc

    # ── GET ───────────────────────────────────────────────────────────────────

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(TransientAPIError),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True,
    )
    async def get(
        self,
        path: str,
        params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """GET `path` and return the parsed JSON body."""
        headers = self._build_headers()
        try:
            logger.info("GET %s%s", self.base_url, path)
            response = await self.client.get(path, params=params, headers=headers)

            if response.status_code in (429, 502, 503, 504):
                raise TransientAPIError(
                    "Transient status %d on GET %s: %s"
                    % (response.status_code, path, response.text[:200])
                )

            response.raise_for_status()
            return response.json()

        except httpx.HTTPStatusError as exc:
            logger.error(
                "HTTP %d on GET %s: %s",
                exc.response.status_code,
                path,
                exc.response.text[:400],
            )
            raise RuntimeError(
                "AgentMark API returned %d on GET %s: %s"
                % (exc.response.status_code, path, exc.response.text[:400])
            ) from exc

        except httpx.RequestError as exc:
            raise TransientAPIError("Request error on GET %s: %s" % (path, exc)) from exc

    # ── DELETE ────────────────────────────────────────────────────────────────

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(TransientAPIError),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True,
    )
    async def delete(
        self,
        path: str,
    ) -> Dict[str, Any]:
        """DELETE `path` and return the parsed JSON body."""
        headers = self._build_headers()
        try:
            logger.info("DELETE %s%s", self.base_url, path)
            response = await self.client.delete(path, headers=headers)

            if response.status_code in (429, 502, 503, 504):
                raise TransientAPIError(
                    "Transient status %d on DELETE %s: %s"
                    % (response.status_code, path, response.text[:200])
                )

            response.raise_for_status()
            return response.json() if response.content else {"success": True}

        except httpx.HTTPStatusError as exc:
            logger.error(
                "HTTP %d on DELETE %s: %s",
                exc.response.status_code,
                path,
                exc.response.text[:400],
            )
            raise RuntimeError(
                "AgentMark API returned %d on DELETE %s: %s"
                % (exc.response.status_code, path, exc.response.text[:400])
            ) from exc

        except httpx.RequestError as exc:
            raise TransientAPIError("Request error on DELETE %s: %s" % (path, exc)) from exc

    # ── Campaign-specific helper ───────────────────────────────────────────────

    async def get_campaign(self, campaign_id: str) -> Dict[str, Any]:
        """
        Fetch a campaign by ID and unwrap the response envelope.

        The Express getCampaign controller returns:
            res.json({ campaign: campaignData })     # campaign.controller.ts L288

        Callers that read this raw dict and call .get("status") always receive None
        because the data sits one level deeper than expected. This method is the
        single canonical unwrapper — all tool implementations that need campaign
        data must call this instead of calling get() directly.
        """
        raw = await self.get(f"/api/campaigns/{campaign_id}")
        campaign = raw.get("campaign")
        if not campaign or not isinstance(campaign, dict):
            raise RuntimeError(
                "Unexpected response shape for campaign '%s'. "
                "Expected {\"campaign\": {...}}, received: %s"
                % (campaign_id, str(raw)[:300])
            )
        return campaign

    async def get_campaign_status(self, campaign_id: str) -> Dict[str, Any]:
        """
        Fetch lightweight campaign status metadata via GET /api/campaigns/:id/status.
        Returns a dict containing: { id, status, reviewScore, updatedAt }.
        """
        raw = await self.get(f"/api/campaigns/{campaign_id}/status")
        return raw

    async def delete_campaign(self, campaign_id: str) -> Dict[str, Any]:
        """
        Delete a campaign by ID via DELETE /api/campaigns/:id.
        """
        return await self.delete(f"/api/campaigns/{campaign_id}")

    async def get_memory_hub(self, project_id: str) -> Dict[str, Any]:
        """
        Fetch Memory Hub insights for a project via GET /api/campaigns/project-memory/:projectId.
        """
        return await self.get(f"/api/campaigns/project-memory/{project_id}")

    async def get_user_profile(self) -> Dict[str, Any]:
        """
        Fetch the authenticated user's profile details (name, email, etc.)
        via GET /api/auth/me.
        """
        raw = await self.get("/api/auth/me")
        user = raw.get("user")
        if not user or not isinstance(user, dict):
            raise RuntimeError(
                "Unexpected response shape for /api/auth/me. "
                "Expected {\"user\": {...}}, received: %s"
                % str(raw)[:300]
            )
        return user

    async def list_projects(self) -> List[Dict[str, Any]]:
        """
        Fetch all projects owned by the authenticated user via GET /api/projects.
        """
        raw = await self.get("/api/projects")
        projects = raw.get("projects")
        if not isinstance(projects, list):
            # Fallback if raw is direct array
            if isinstance(raw, list):
                return raw
            raise RuntimeError(
                "Unexpected response shape for /api/projects. "
                "Expected {\"projects\": [...]}, received: %s"
                % str(raw)[:300]
            )
        return projects

    async def list_campaigns(self, project_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Fetch all campaigns owned by the authenticated user.
        If project_id is provided, fetches campaigns under that specific project.
        """
        if project_id:
            raw = await self.get("/api/campaigns", params={"projectId": project_id})
        else:
            raw = await self.get("/api/campaigns/all")

        campaigns = raw.get("campaigns")
        if isinstance(campaigns, list):
            return campaigns
        if isinstance(raw, list):
            return raw
        return []

    async def update_project(self, project_id: str, name: Optional[str] = None, description: Optional[str] = None) -> Dict[str, Any]:
        """
        Update a project's details via PATCH /api/projects/:id.
        """
        payload = {}
        if name is not None:
            payload["name"] = name
        if description is not None:
            payload["description"] = description
        return await self.patch(f"/api/projects/{project_id}", payload)

    async def delete_project(self, project_id: str) -> Dict[str, Any]:
        """
        Delete a project by ID via DELETE /api/projects/:id.
        """
        return await self.delete(f"/api/projects/{project_id}")

    async def get_dashboard_stats(self) -> Dict[str, Any]:
        """
        Get user dashboard stats via GET /api/projects/stats/dashboard.
        """
        return await self.get("/api/projects/stats/dashboard")

    async def get_memory_status(self, project_id: str) -> Dict[str, Any]:
        """
        Get memory status for a project via GET /api/projects/:id/memory-status.
        """
        return await self.get(f"/api/projects/{project_id}/memory-status")

    async def generate_copy_variant(self, campaign_id: str, channel: str, steering_note: str, extra_headers: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """
        Generate a creative copy variant for a channel via POST /api/campaigns/:id/variants/copy.
        """
        payload = {
            "channel": channel,
            "steeringNote": steering_note
        }
        return await self.post(f"/api/campaigns/{campaign_id}/variants/copy", payload, extra_headers=extra_headers)

    async def enhance_prompt(self, prompt: str, user_input: Optional[str] = None, extra_headers: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """
        Enhance a marketing prompt using AI via POST /api/campaigns/enhance-prompt.
        """
        payload = {
            "prompt": prompt
        }
        if user_input:
            payload["userInput"] = user_input
        return await self.post("/api/campaigns/enhance-prompt", payload, extra_headers=extra_headers)

    async def list_personas(self) -> List[Dict[str, Any]]:
        """
        Fetch all focus group personas via GET /api/focus-group/personas.
        """
        raw = await self.get("/api/focus-group/personas")
        personas = raw.get("personas")
        if isinstance(personas, list):
            return personas
        if isinstance(raw, list):
            return raw
        return []

    async def get_notifications(self) -> List[Dict[str, Any]]:
        """
        Fetch user notifications via GET /api/notifications.
        """
        raw = await self.get("/api/notifications")
        notifications = raw.get("notifications")
        if isinstance(notifications, list):
            return notifications
        if isinstance(raw, list):
            return raw
        return []

    async def mark_notification_read(self, notification_id: str) -> Dict[str, Any]:
        """
        Mark a notification as read via PUT /api/notifications/read.
        """
        return await self.put("/api/notifications/read", {"id": notification_id})

    async def mark_all_notifications_read(self) -> Dict[str, Any]:
        """
        Mark all notifications as read via PUT /api/notifications/read-all.
        """
        return await self.put("/api/notifications/read-all", {})

    async def list_api_keys(self) -> List[Dict[str, Any]]:
        """
        List developer API keys via GET /api/developer/keys.
        """
        raw = await self.get("/api/developer/keys")
        keys = raw.get("keys")
        if isinstance(keys, list):
            return keys
        if isinstance(raw, list):
            return raw
        return []

    async def get_mcp_activity(self) -> List[Dict[str, Any]]:
        """
        Fetch MCP activity logs via GET /api/developer/mcp-activity.
        """
        raw = await self.get("/api/developer/mcp-activity")
        activities = raw.get("activities")
        if isinstance(activities, list):
            return activities
        if isinstance(raw, list):
            return raw
        return []

    async def fork_campaign(
        self,
        campaign_id: str,
        new_name: Optional[str] = None,
        updated_brief: Optional[Dict[str, Any]] = None,
        start_stage: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Fork a campaign into a new version with a reset revision budget via POST /api/campaigns/:id/fork.
        """
        payload: Dict[str, Any] = {}
        if new_name:
            payload["newName"] = new_name
        if updated_brief:
            payload["updatedBrief"] = updated_brief
        if start_stage:
            payload["startStage"] = start_stage
        return await self.post("/api/campaigns/%s/fork" % campaign_id, payload)

    async def reset_campaign_revisions(self, campaign_id: str) -> Dict[str, Any]:
        """
        Reset revision counters back to 0 for a campaign via POST /api/campaigns/:id/reset-revisions.
        """
        return await self.post("/api/campaigns/%s/reset-revisions" % campaign_id, {})

    async def submit_human_approval(self, campaign_id: str, decision: str, feedback: Optional[str] = None) -> Dict[str, Any]:
        action = "approve" if str(decision).lower() in ("approved", "approve") else "reject"
        payload = {"action": action, "decision": decision}
        if feedback:
            payload["feedback"] = feedback
        return await self.post(f"/api/campaigns/{campaign_id}/approve", payload)

    async def request_targeted_revision(self, campaign_id: str, target_agent: str, feedback: str) -> Dict[str, Any]:
        payload = {"targetAgent": target_agent, "feedback": feedback}
        return await self.post(f"/api/campaigns/{campaign_id}/targeted-revision", payload)

    async def update_client_memory(self, project_id: str, brand_voice: Optional[str] = None, target_audience: Optional[str] = None, key_insights: Optional[str] = None) -> Dict[str, Any]:
        payload = {
            "projectId": project_id,
            "brandVoice": brand_voice,
            "targetAudience": target_audience,
            "keyInsights": key_insights,
        }
        return await self.post("/api/projects/memory/update", payload)

    async def clear_client_memory(self, project_id: str) -> Dict[str, Any]:
        return await self.post(f"/api/projects/{project_id}/memory/clear", {})

    async def export_campaign_pdf(self, campaign_id: str) -> Dict[str, Any]:
        return await self.get(f"/api/campaigns/{campaign_id}/export/pdf")

    async def export_campaign_json(self, campaign_id: str) -> Dict[str, Any]:
        return await self.get(f"/api/campaigns/{campaign_id}/export/json")

    async def get_publishing_schedule(self, campaign_id: str) -> Dict[str, Any]:
        return await self.get(f"/api/campaigns/{campaign_id}/publishing-schedule")

    async def verify_channel_credentials(self, campaign_id: str, channels: Optional[List[str]] = None) -> Dict[str, Any]:
        payload = {"channels": channels or []}
        return await self.post(f"/api/campaigns/{campaign_id}/verify-channels", payload)

    async def generate_image_asset(self, prompt: str, aspect_ratio: Optional[str] = "1:1") -> Dict[str, Any]:
        payload = {"prompt": prompt, "aspectRatio": aspect_ratio}
        return await self.post("/api/campaigns/generate-image", payload)

    async def get_campaign_analytics(self, campaign_id: str) -> Dict[str, Any]:
        return await self.get(f"/api/campaigns/{campaign_id}/analytics")

    async def synthesize_brand_memory(self, project_id: str) -> Dict[str, Any]:
        return await self.post(f"/api/projects/{project_id}/memory/synthesize", {})

    async def compare_campaigns(self, target_campaign_id: str, baseline_campaign_id: Optional[str] = None) -> Dict[str, Any]:
        payload = {"targetCampaignId": target_campaign_id, "baselineCampaignId": baseline_campaign_id}
        return await self.post("/api/campaigns/compare", payload)
