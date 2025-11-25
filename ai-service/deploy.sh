#!/bin/bash

###############################################################################
# Amapiano AI - GPU Service Deployment Script
# Deploys MusicGen + Demucs service to AWS EC2 g4dn.xlarge
###############################################################################

set -e

echo "=================================================="
echo "Amapiano AI - GPU Service Deployment"
echo "=================================================="

# Configuration
INSTANCE_TYPE="g4dn.xlarge"
REGION="us-east-1"
AMI_ID="ami-0c55b159cbfafe1f0"  # Deep Learning AMI (Ubuntu 22.04)
KEY_NAME="amapiano-ai-gpu"
SECURITY_GROUP="amapiano-ai-sg"

echo ""
echo "Step 1: Launch EC2 Instance"
echo "----------------------------"
echo "Instance Type: $INSTANCE_TYPE (NVIDIA T4 GPU)"
echo "Region: $REGION"
echo ""

read -p "Launch new EC2 instance? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo "Creating security group..."
    aws ec2 create-security-group \
        --group-name $SECURITY_GROUP \
        --description "Amapiano AI GPU Service" \
        --region $REGION || echo "Security group already exists"
    
    echo "Adding inbound rules..."
    aws ec2 authorize-security-group-ingress \
        --group-name $SECURITY_GROUP \
        --protocol tcp \
        --port 22 \
        --cidr 0.0.0.0/0 \
        --region $REGION || echo "SSH rule already exists"
    
    aws ec2 authorize-security-group-ingress \
        --group-name $SECURITY_GROUP \
        --protocol tcp \
        --port 8000 \
        --cidr 0.0.0.0/0 \
        --region $REGION || echo "HTTP rule already exists"
    
    echo "Launching EC2 instance..."
    INSTANCE_ID=$(aws ec2 run-instances \
        --image-id $AMI_ID \
        --instance-type $INSTANCE_TYPE \
        --key-name $KEY_NAME \
        --security-groups $SECURITY_GROUP \
        --region $REGION \
        --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":100,"VolumeType":"gp3"}}]' \
        --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=Amapiano-AI-GPU}]' \
        --query 'Instances[0].InstanceId' \
        --output text)
    
    echo "Instance launched: $INSTANCE_ID"
    echo "Waiting for instance to start..."
    
    aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $REGION
    
    PUBLIC_IP=$(aws ec2 describe-instances \
        --instance-ids $INSTANCE_ID \
        --region $REGION \
        --query 'Reservations[0].Instances[0].PublicIpAddress' \
        --output text)
    
    echo "Instance running at: $PUBLIC_IP"
    echo "Waiting 30s for SSH to be ready..."
    sleep 30
else
    read -p "Enter existing instance IP: " PUBLIC_IP
fi

echo ""
echo "Step 2: Install Dependencies on EC2"
echo "------------------------------------"
echo "Connecting to: $PUBLIC_IP"
echo ""

SSH_CMD="ssh -o StrictHostKeyChecking=no -i ~/.ssh/${KEY_NAME}.pem ubuntu@${PUBLIC_IP}"

echo "Installing system dependencies..."
$SSH_CMD << 'EOF'
set -e

sudo apt-get update
sudo apt-get install -y \
    python3.10 \
    python3-pip \
    ffmpeg \
    libsndfile1 \
    docker.io \
    nvidia-docker2

sudo systemctl restart docker

echo "Testing GPU..."
nvidia-smi

echo "System dependencies installed!"
EOF

echo ""
echo "Step 3: Transfer AI Service Code"
echo "---------------------------------"

echo "Creating deployment archive..."
tar -czf /tmp/ai-service.tar.gz \
    main.py \
    requirements.txt \
    Dockerfile \
    dataset_setup.py \
    train_musicgen.py \
    optimize_model.py

echo "Uploading to EC2..."
scp -o StrictHostKeyChecking=no -i ~/.ssh/${KEY_NAME}.pem \
    /tmp/ai-service.tar.gz \
    ubuntu@${PUBLIC_IP}:~/

echo "Extracting on remote..."
$SSH_CMD "mkdir -p ~/ai-service && tar -xzf ~/ai-service.tar.gz -C ~/ai-service"

echo ""
echo "Step 4: Build Docker Image"
echo "---------------------------"

$SSH_CMD << 'EOF'
cd ~/ai-service

echo "Building Docker image with GPU support..."
sudo docker build -t amapiano-ai-service .

echo "Docker image built successfully!"
EOF

echo ""
echo "Step 5: Run Service Container"
echo "------------------------------"

$SSH_CMD << 'EOF'
cd ~/ai-service

echo "Stopping any existing container..."
sudo docker stop amapiano-ai || true
sudo docker rm amapiano-ai || true

echo "Starting AI service container..."
sudo docker run -d \
    --name amapiano-ai \
    --gpus all \
    -p 8000:8000 \
    --restart unless-stopped \
    amapiano-ai-service

echo "Waiting for service to start..."
sleep 10

echo "Checking service health..."
curl http://localhost:8000/health || echo "Service not yet ready"

echo ""
echo "Container started successfully!"
sudo docker logs amapiano-ai
EOF

echo ""
echo "=================================================="
echo "Deployment Complete!"
echo "=================================================="
echo ""
echo "AI Service URL: http://${PUBLIC_IP}:8000"
echo "Health Check: http://${PUBLIC_IP}:8000/health"
echo "API Docs: http://${PUBLIC_IP}:8000/docs"
echo ""
echo "Next Steps:"
echo "1. Test the service: curl http://${PUBLIC_IP}:8000/health"
echo "2. Set environment variable in backend:"
echo "   export AI_SERVICE_URL=http://${PUBLIC_IP}:8000"
echo "3. Test generation endpoint"
echo "4. Validate with AURA-X cultural scoring"
echo ""
echo "Cost: ~\$0.80/hour (g4dn.xlarge)"
echo "Monthly (24/7): ~\$580"
echo ""
echo "To stop instance when not in use:"
echo "  aws ec2 stop-instances --instance-ids $INSTANCE_ID --region $REGION"
echo ""
echo "To SSH into instance:"
echo "  ssh -i ~/.ssh/${KEY_NAME}.pem ubuntu@${PUBLIC_IP}"
echo ""
echo "=================================================="
