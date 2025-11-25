# Complete Deployment Guide - Amapiano AI Platform

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        PRODUCTION STACK                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐     ┌──────────────┐    ┌──────────────┐ │
│  │   Frontend   │────▶│ Encore.ts    │───▶│  PostgreSQL  │ │
│  │   (React)    │     │   Backend    │    │   Database   │ │
│  │  Vite + TS   │     │   (Node.js)  │    │              │ │
│  └─────────────┘     └──────────────┘    └──────────────┘ │
│         │                    │                              │
│         │                    │                              │
│         │                    ▼                              │
│         │           ┌──────────────┐                        │
│         │           │   GPU AI     │                        │
│         └──────────▶│   Service    │                        │
│                     │   (FastAPI)  │                        │
│                     │   Python     │                        │
│                     └──────────────┘                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Phase 1: Frontend & Basic Backend (Current State)

### Prerequisites
- Node.js 18+
- Encore CLI
- PostgreSQL 14+

### Deployment

```bash
# 1. Install Encore CLI
curl -L https://encore.dev/install.sh | bash

# 2. Clone and setup
git clone <repository-url>
cd amapiano-ai

# 3. Install frontend dependencies
# Note: Add "tone": "^15.1.4" to frontend/package.json manually
npm install

# 4. Set up secrets
encore secret set OpenAIKey --type dev  # Your OpenAI API key
encore secret set HuggingFaceKey --type dev  # Optional

# 5. Run development
encore run

# 6. Access the app
# Frontend: http://localhost:4000
# Backend API: http://localhost:4000/api
```

### Production Deployment via Encore Cloud

```bash
# 1. Link to Encore Cloud
encore app create amapiano-ai

# 2. Set production secrets
encore secret set OpenAIKey --type prod
encore secret set HuggingFaceKey --type prod

# 3. Deploy
git push encore main

# Access at: https://your-app.encr.app
```

### Current Capabilities (Phase 1 Complete)

✅ **Working Now:**
- Text-to-MIDI generation (GPT-4)
- Browser-based MIDI playback (Tone.js)
- Real audio synthesis of AI-generated patterns
- Waveform visualization
- Microphone recording
- Full DAW UI with routing
- Cultural AI orchestration logic

🔄 **Mock/Demo Mode:**
- Text-to-audio generation (uses metadata only)
- Stem separation (returns mock buffers)
- Audio file downloads (metadata JSON)

## Phase 2: GPU Service Deployment

### Hardware Requirements

**Recommended AWS Setup:**
- **Instance Type**: g4dn.xlarge (NVIDIA T4 GPU)
- **OS**: Ubuntu 22.04 LTS (Deep Learning AMI)
- **Storage**: 100GB EBS GP3
- **Region**: us-east-1 (lowest latency)

**Cost**: ~$0.526/hour (~$388/month 24/7)

### Step-by-Step GPU Service Setup

#### 1. Launch EC2 Instance

```bash
# Using AWS CLI
aws ec2 run-instances \
    --image-id ami-0c55b159cbfafe1f0 \  # Deep Learning AMI
    --instance-type g4dn.xlarge \
    --key-name your-key-pair \
    --security-group-ids sg-xxxxx \
    --subnet-id subnet-xxxxx \
    --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":100,"VolumeType":"gp3"}}]' \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=amapiano-ai-gpu}]'
```

#### 2. Connect and Setup

```bash
# SSH into instance
ssh -i your-key.pem ubuntu@<instance-ip>

# Verify GPU
nvidia-smi

# Install Docker with NVIDIA runtime
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install NVIDIA Container Toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | \
  sudo tee /etc/apt/sources.list.d/nvidia-docker.list

sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker
```

#### 3. Deploy AI Service

```bash
# Clone repository
git clone <repository-url>
cd amapiano-ai/ai-service

# Build Docker image
docker build -t amapiano-ai-service .

# Run with GPU support
docker run -d \
  --gpus all \
  --restart unless-stopped \
  -p 8000:8000 \
  -v /data/uploads:/app/uploads \
  -v /data/outputs:/app/outputs \
  -v /data/stems:/app/stems \
  --name amapiano-ai \
  amapiano-ai-service

# Check logs
docker logs -f amapiano-ai

# Test GPU service
curl http://localhost:8000/health
```

#### 4. Configure Backend Integration

```bash
# On Encore backend, set environment variable
encore secret set AI_SERVICE_URL --type prod,dev
# Value: http://<gpu-instance-ip>:8000

# Or use environment variable
export AI_SERVICE_URL=http://<gpu-instance-ip>:8000
```

#### 5. Security Configuration

```bash
# AWS Security Group rules:
# Inbound:
#   - Port 8000 from Encore backend IP only
#   - Port 22 (SSH) from your IP only
# Outbound:
#   - All traffic (for model downloads)

# Install SSL/TLS (production)
sudo apt-get install -y nginx certbot python3-certbot-nginx

# Configure nginx reverse proxy
sudo nano /etc/nginx/sites-available/ai-service

# Content:
server {
    listen 80;
    server_name ai.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 500M;  # For large audio uploads
    }
}

# Enable and get SSL
sudo ln -s /etc/nginx/sites-available/ai-service /etc/nginx/sites-enabled/
sudo certbot --nginx -d ai.yourdomain.com
sudo systemctl restart nginx
```

### Testing GPU Integration

```bash
# Test music generation
curl -X POST http://<gpu-ip>:8000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Deep amapiano with log drums and soulful piano",
    "genre": "amapiano",
    "duration": 30
  }'

# Response: {"job_id": "...", "status": "queued", "estimated_time": 60}

# Check status
curl http://<gpu-ip>:8000/status/<job_id>

# Download result when completed
curl -O http://<gpu-ip>:8000/download/<job_id>.wav
```

## Phase 3: Cultural Fine-Tuning Deployment

See: [PHASE_3_CULTURAL_FINE_TUNING.md](./PHASE_3_CULTURAL_FINE_TUNING.md)

**Summary:**
- Requires 1,000+ hours curated amapiano audio
- Fine-tune MusicGen on AWS using 4x A100 GPUs
- Train custom log drum separator
- Budget: $85k-$185k + $10k compute
- Timeline: 7 months

## Monitoring & Maintenance

### Application Monitoring

```bash
# Frontend performance
# Add to frontend/App.tsx
import { initSentry } from '@sentry/react';

initSentry({
  dsn: 'your-sentry-dsn',
  tracesSampleRate: 0.1,
});

# Backend monitoring (Encore built-in)
# Access at: https://app.encore.dev/<your-app>/metrics

# GPU service logs
docker logs -f amapiano-ai

# GPU utilization
watch -n 1 nvidia-smi
```

### Cost Optimization

**Spot Instances**: Save 60%
```bash
# Use spot instances for GPU service
aws ec2 request-spot-instances \
    --instance-count 1 \
    --type "persistent" \
    --launch-specification file://spot-config.json
```

**Auto-scaling**: Only run GPU when needed
```python
# Add to main.py
@app.on_event("startup")
async def warmup():
    # Delay model loading until first request
    pass

@app.middleware("http")
async def auto_shutdown(request, call_next):
    # Shutdown after 30 min idle
    pass
```

## Production Checklist

### Pre-Launch

- [ ] Set all production secrets in Encore
- [ ] Configure AI_SERVICE_URL environment variable
- [ ] GPU service deployed and health check passing
- [ ] SSL/TLS certificates configured
- [ ] Database backups enabled
- [ ] Error tracking (Sentry) configured
- [ ] Rate limiting on AI endpoints
- [ ] Cost alerts configured

### Launch Day

- [ ] Monitor Encore dashboard for errors
- [ ] Check GPU service logs
- [ ] Test all critical flows:
  - [ ] AI generation
  - [ ] Stem separation
  - [ ] DAW playback
  - [ ] File uploads
- [ ] Monitor GPU utilization
- [ ] Check database performance

### Post-Launch

- [ ] Collect user feedback
- [ ] A/B test with/without GPU service
- [ ] Monitor cultural authenticity scores
- [ ] Plan Phase 3 fine-tuning based on usage

## Troubleshooting

### "AI Service Unavailable"

```bash
# Check GPU service status
curl http://<gpu-ip>:8000/health

# Restart if needed
docker restart amapiano-ai

# Check model initialization
docker logs amapiano-ai | grep "initialized"
```

### "CUDA Out of Memory"

```bash
# Reduce batch size in main.py
# Or upgrade to larger GPU instance (g4dn.2xlarge, etc.)
```

### "Slow Generation"

```bash
# Verify GPU is being used
nvidia-smi

# Check that CUDA is detected
docker exec amapiano-ai python -c "import torch; print(torch.cuda.is_available())"
```

### "Tone.js Not Playing Audio"

```typescript
// In browser console
await Tone.start();  // Must be called on user interaction

// Check audio context state
console.log(Tone.context.state);  // Should be "running"
```

## Support & Documentation

- **Encore Docs**: https://encore.dev/docs
- **Tone.js Docs**: https://tonejs.github.io/
- **MusicGen**: https://github.com/facebookresearch/audiocraft
- **Demucs**: https://github.com/facebookresearch/demucs
- **AURA-X Architecture**: See [AURA-X_COMPLETE_DOCUMENTATION.md](./AURA-X_COMPLETE_DOCUMENTATION.md)

---

**Deployment Status Summary:**

| Component | Status | Ready for Production |
|-----------|--------|---------------------|
| Frontend (React + Tone.js) | ✅ Implemented | Yes |
| Encore.ts Backend | ✅ Implemented | Yes |
| Web Audio Engine | ✅ Implemented | Yes |
| AI MIDI Generation | ✅ Implemented | Yes (GPT-4) |
| GPU Service (FastAPI) | ✅ Implemented | Yes (requires deployment) |
| MusicGen Integration | ✅ Implemented | Yes (requires GPU) |
| Demucs Integration | ✅ Implemented | Yes (requires GPU) |
| Cultural Fine-Tuning | 📋 Documented | No (7-month project) |

**Next Immediate Action**: Deploy GPU service to AWS EC2 g4dn.xlarge
