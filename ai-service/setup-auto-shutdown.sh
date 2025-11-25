#!/bin/bash

###############################################################################
# GPU Instance Auto-Shutdown Service
# Stops EC2 instance after 2 hours of API inactivity
###############################################################################

cat > /tmp/idle-shutdown.sh << 'EOF'
#!/bin/bash

LOG_FILE="/var/log/gpu-idle-shutdown.log"
IDLE_THRESHOLD=7200  # 2 hours in seconds
LAST_REQUEST_FILE="/var/run/last-api-request"

# Get timestamp of last API request from Nginx/FastAPI logs
LAST_REQUEST=$(journalctl -u docker -n 10000 | grep "POST /generate\|POST /separate" | tail -1 | awk '{print $1, $2, $3}')

if [ -z "$LAST_REQUEST" ]; then
    echo "$(date): No API requests found in logs. Skipping shutdown." >> $LOG_FILE
    exit 0
fi

# Convert to epoch timestamp
LAST_TIMESTAMP=$(date -d "$LAST_REQUEST" +%s 2>/dev/null || echo 0)
CURRENT_TIMESTAMP=$(date +%s)
IDLE_SECONDS=$((CURRENT_TIMESTAMP - LAST_TIMESTAMP))

echo "$(date): Last API request was $IDLE_SECONDS seconds ago" >> $LOG_FILE

if [ $IDLE_SECONDS -gt $IDLE_THRESHOLD ]; then
    echo "$(date): IDLE THRESHOLD EXCEEDED. Shutting down GPU instance to save costs." >> $LOG_FILE
    
    # Send CloudWatch metric (optional - requires AWS CLI configured)
    aws cloudwatch put-metric-data \
        --namespace "AmapianoAI/GPU" \
        --metric-name "IdleShutdown" \
        --value 1 \
        --region us-east-1 2>/dev/null || true
    
    # Shutdown instance
    sudo shutdown -h now
else
    echo "$(date): Instance active. $IDLE_SECONDS/$IDLE_THRESHOLD seconds idle." >> $LOG_FILE
fi
EOF

# Install script
sudo mv /tmp/idle-shutdown.sh /usr/local/bin/idle-shutdown.sh
sudo chmod +x /usr/local/bin/idle-shutdown.sh

# Create systemd timer
sudo tee /etc/systemd/system/idle-shutdown.timer > /dev/null << 'EOF'
[Unit]
Description=Check for GPU idle timeout every 15 minutes

[Timer]
OnBootSec=15min
OnUnitActiveSec=15min
Unit=idle-shutdown.service

[Install]
WantedBy=timers.target
EOF

# Create systemd service
sudo tee /etc/systemd/system/idle-shutdown.service > /dev/null << 'EOF'
[Unit]
Description=Shutdown GPU instance if idle too long

[Service]
Type=oneshot
ExecStart=/usr/local/bin/idle-shutdown.sh
EOF

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable idle-shutdown.timer
sudo systemctl start idle-shutdown.timer

echo "Auto-shutdown service installed:"
echo "  - Checks every 15 minutes"
echo "  - Shuts down after 2 hours of no API activity"
echo "  - Logs to: /var/log/gpu-idle-shutdown.log"
echo ""
echo "To disable: sudo systemctl stop idle-shutdown.timer"
echo "To check status: sudo systemctl status idle-shutdown.timer"
