# Amapiano AI - GPU Audio Processing Service

FastAPI backend service for GPU-accelerated music generation and stem separation.

## Features

- **MusicGen Integration**: Text-to-audio generation using Meta's MusicGen
- **Demucs Stem Separation**: Professional-grade audio source separation
- **Cultural Enhancement**: Amapiano-specific prompt engineering
- **Async Job Queue**: Background processing with progress tracking
- **GPU Acceleration**: CUDA-optimized for NVIDIA GPUs

## Requirements

### Hardware
- **GPU**: NVIDIA GPU with 16GB+ VRAM (recommended: T4, A10, or better)
- **CPU**: 4+ cores
- **RAM**: 16GB+ system memory
- **Storage**: 50GB+ for models and cache

### Software
- **CUDA**: 11.8 or higher
- **cuDNN**: 8.x
- **Python**: 3.10+
- **Docker** (optional but recommended)

## Quick Start

### Option 1: Docker (Recommended)

```bash
# Build the image
docker build -t amapiano-ai-service .

# Run with GPU support
docker run --gpus all -p 8000:8000 \
  -v $(pwd)/uploads:/app/uploads \
  -v $(pwd)/outputs:/app/outputs \
  -v $(pwd)/stems:/app/stems \
  amapiano-ai-service
```

### Option 2: Direct Installation

```bash
# Create virtual environment
python3.10 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the service
uvicorn main:app --host 0.0.0.0 --port 8000
```

## AWS Deployment

### EC2 Instance Setup

1. **Launch EC2 Instance**
   ```bash
   # Recommended: g4dn.xlarge (NVIDIA T4, 4 vCPU, 16 GB RAM)
   # AMI: Deep Learning AMI (Ubuntu 22.04)
   # Storage: 100GB EBS GP3
   ```

2. **Install NVIDIA Drivers**
   ```bash
   # Drivers should be pre-installed on Deep Learning AMI
   nvidia-smi  # Verify GPU is detected
   ```

3. **Install Docker with NVIDIA Runtime**
   ```bash
   # Install Docker
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

4. **Deploy Service**
   ```bash
   # Clone repository
   git clone <repository-url>
   cd ai-service

   # Build and run
   docker build -t amapiano-ai-service .
   docker run -d --gpus all --restart unless-stopped \
     -p 8000:8000 \
     --name amapiano-ai \
     amapiano-ai-service
   ```

5. **Configure Security Group**
   - Allow inbound TCP 8000 from your backend server IP
   - Restrict access to trusted sources only

## API Endpoints

### Generate Music

```bash
POST /generate
Content-Type: application/json

{
  "prompt": "Deep amapiano with log drums and soulful piano",
  "genre": "amapiano",
  "duration": 30,
  "cultural_authenticity": "traditional",
  "quality_tier": "professional"
}
```

### Separate Stems

```bash
POST /separate-stems
Content-Type: multipart/form-data

file: <audio-file>
enhanced_processing: true
```

### Check Job Status

```bash
GET /status/{job_id}
```

### Health Check

```bash
GET /health
```

## Integration with Encore.ts Backend

Update `backend/music/ai-service.ts`:

```typescript
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

async function generateAudioWithGPU(request: MusicGenerationRequest) {
  // Call GPU service
  const response = await fetch(`${AI_SERVICE_URL}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: request.prompt,
      genre: request.genre,
      duration: request.duration,
    }),
  });
  
  const { job_id } = await response.json();
  
  // Poll for completion
  return await pollJobStatus(job_id);
}
```

## Cost Estimation

### AWS Pricing (us-east-1)

- **g4dn.xlarge**: ~$0.526/hour
- **100GB EBS GP3**: ~$8/month
- **Data Transfer**: ~$0.09/GB

**Monthly Cost (24/7 operation)**: ~$388/month

**Optimization**:
- Use spot instances: ~60% savings
- Auto-scaling: Only run when needed
- Reserved instances: ~40% savings for committed usage

## Performance Benchmarks

| Operation | GPU (T4) | CPU-only | Speedup |
|-----------|----------|----------|---------|
| MusicGen (30s) | 8-12s | 180-300s | 20x |
| Demucs Separation | 15-20s | 120-180s | 8x |

## Monitoring

Access logs:
```bash
docker logs -f amapiano-ai
```

GPU utilization:
```bash
nvidia-smi -l 1
```

## Troubleshooting

### CUDA Out of Memory
- Reduce batch size in generation
- Lower quality tier setting
- Add memory limits in Docker

### Model Download Issues
- Models auto-download on first use (~5GB)
- Check internet connectivity
- Verify disk space

### Slow Generation
- Check GPU utilization (`nvidia-smi`)
- Verify CUDA is being used (check logs)
- Consider upgrading to more powerful GPU

## License

MIT License - See LICENSE file
