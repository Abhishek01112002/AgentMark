import logging
import sys
import os

os.makedirs('logs', exist_ok=True)

# Configure a standard logger for the application
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt='%H:%M:%S',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('logs/ai_service.log', encoding='utf-8')
    ]
)

# Function to get a logger for a specific module
def get_logger(name):
    return logging.getLogger(name)

logger = get_logger("ai-service")
