"""
ai-service/utils/logger.py — Zero-Cost Startup Logging

Strategy:
  - LOG_LEVEL env var controls verbosity (default: INFO)
  - PRODUCTION: Set LOG_LEVEL=ERROR in .env → Python's logging module
    silently drops all INFO/DEBUG calls at zero CPU/disk cost
  - stdout stream only — Docker logs / PM2 / journald capture it for free
  - File handler: ONLY active in development (NODE_ENV != production / ENV != production)
    → No disk usage in prod. logrotate handles the dev file if needed.
  - Sentry: activated only when SENTRY_DSN is set. Captures only ERROR+ events.
    Free tier: 5,000 errors/month. No routine logs sent.
"""

import logging
import sys
import os

# ── Log level from env ─────────────────────────────────────────────────────────
_raw_level = os.environ.get("LOG_LEVEL", "INFO").upper()
_VALID = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
log_level_str = _raw_level if _raw_level in _VALID else "INFO"
log_level = getattr(logging, log_level_str)

# ── Determine environment ──────────────────────────────────────────────────────
_env = os.environ.get("ENV", os.environ.get("NODE_ENV", "development")).lower()
_is_production = _env == "production"

# ── Handlers ───────────────────────────────────────────────────────────────────
_handlers: list[logging.Handler] = [
    logging.StreamHandler(sys.stdout),   # Always: free via Docker/PM2
]

# File handler: dev only (avoids disk usage in production)
if not _is_production:
    os.makedirs("logs", exist_ok=True)
    _file_handler = logging.FileHandler("logs/ai_service.log", encoding="utf-8")
    _file_handler.setLevel(log_level)
    _handlers.append(_file_handler)

# ── Configure root logger ──────────────────────────────────────────────────────
logging.basicConfig(
    level=log_level,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
    handlers=_handlers,
    force=True,  # Override any previously configured root logger
)

# ── Sentry: free crash tracking, only when DSN is set ─────────────────────────
_sentry_dsn = os.environ.get("SENTRY_DSN", "").strip()
if _sentry_dsn:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.asyncio import AsyncioIntegration

        sentry_sdk.init(
            dsn=_sentry_dsn,
            environment=_env,
            # Capture 100% of errors — no performance tracing (saves quota)
            traces_sample_rate=0.0,
            integrations=[
                FastApiIntegration(transaction_style="endpoint"),
                AsyncioIntegration(),
            ],
            before_send=lambda event, hint: event,  # No filtering — send all errors
        )
        logging.getLogger("agentmark.sentry").info(
            "✅ Sentry initialised (env=%s, crash-tracking only)", _env
        )
    except ImportError:
        logging.getLogger("agentmark.sentry").warning(
            "⚠️  SENTRY_DSN is set but sentry-sdk is not installed. "
            "Run: pip install sentry-sdk[fastapi]"
        )


def get_logger(name: str) -> logging.Logger:
    """Get a named logger respecting the global LOG_LEVEL."""
    lg = logging.getLogger(name)
    lg.setLevel(log_level)
    return lg


# Convenience root logger for quick use
logger = get_logger("ai-service")
