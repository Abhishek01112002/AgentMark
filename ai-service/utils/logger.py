import logging
import sys
import os

os.makedirs('logs', exist_ok=True)

# Determine the log level from the environment variable 'LOG_LEVEL'
# Default to INFO if not set or invalid
log_level_str = os.environ.get("LOG_LEVEL", "INFO").upper()
valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
if log_level_str not in valid_levels:
    log_level_str = "INFO"

log_level = getattr(logging, log_level_str)

# Configure a standard logger for the application
logging.basicConfig(
    level=log_level,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt='%H:%M:%S',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('logs/ai_service.log', encoding='utf-8')
    ]
)

# Function to get a logger for a specific module
def get_logger(name):
    logger = logging.getLogger(name)
    logger.setLevel(log_level)
    return logger

logger = get_logger("ai-service")
