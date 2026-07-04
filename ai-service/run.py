"""
Startup script for AgentMark AI Service.
Clears __pycache__ before launching to prevent stale compiled modules,
then starts Uvicorn with auto-reload enabled for smooth development.
"""

import utils.logger  # noqa: F401
import logging
logger = logging.getLogger(__name__)

import os
import sys
import subprocess


def clear_pycache(root_dir: str):
    """Recursively remove all __pycache__ directories under root_dir."""
    removed = 0
    for dirpath, dirnames, _ in os.walk(root_dir):
        for dirname in list(dirnames):
            if dirname == '__pycache__':
                full_path = os.path.join(dirpath, dirname)
                try:
                    import shutil
                    shutil.rmtree(full_path)
                    removed += 1
                except Exception as e:
                    logger.info(f"Warning: Could not remove {full_path}: {e}")
    return removed


if __name__ == '__main__':
    # Get the directory where this script is located (ai-service root)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    # Clear stale __pycache__
    logger.info("🧹 Cleaning stale __pycache__ directories...")
    count = clear_pycache(script_dir)
    logger.info(f"   Removed {count} __pycache__ dir(s)")

    # Start Uvicorn without auto-reload to avoid watchfiles noise from log writes.
    logger.info("🚀 Starting AI Service...")
    logger.info("   URL: http://127.0.0.1:5002")
    logger.info("   Press Ctrl+C to stop\n")

    port = int(os.getenv("SERVICE_PORT", 5002))
    host = os.getenv("SERVICE_HOST", "127.0.0.1")

    subprocess.run([
        sys.executable, "-m", "uvicorn",
        "main:app",
        "--host", host,
        "--port", str(port),
        "--log-level", "info",
    ])
