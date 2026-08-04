#!/bin/bash
# Setup logrotate for AgentMark logs
# This ensures development logs don't fill up the disk.
# In production (LOG_LEVEL=ERROR), file logging is disabled entirely, 
# but this is a good safety net for staging/dev environments.

# Create the logrotate config file
cat << 'EOF' | sudo tee /etc/logrotate.d/agentmark
/path/to/AgentMark/ai-service/logs/*.log {
    daily
    missingok
    rotate 3
    compress
    delaycompress
    notifempty
    create 0640 $USER $USER
}
EOF

echo "Logrotate configuration installed at /etc/logrotate.d/agentmark"
echo "Logs will be kept for 3 days and then automatically deleted."
