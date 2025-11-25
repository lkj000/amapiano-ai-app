#!/bin/bash
set -e

# MagnaTagATune Training Deployment Script
# Sets up complete Phase 2.5 training infrastructure on AWS g4dn.xlarge

echo "=============================================="
echo "Phase 2.5: MagnaTagATune Training Deployment"
echo "=============================================="

# Configuration
INSTANCE_TYPE="g4dn.xlarge"
GPU_COST_PER_HOUR=1.30
ESTIMATED_TRAINING_WEEKS=4
ESTIMATED_COST=500

echo ""
echo "Configuration:"
echo "  Instance Type: $INSTANCE_TYPE (NVIDIA T4 GPU, 16GB VRAM)"
echo "  Cost: \$$GPU_COST_PER_HOUR/hour"
echo "  Estimated Duration: $ESTIMATED_TRAINING_WEEKS weeks"
echo "  Estimated Total Cost: \$$ESTIMATED_COST"
echo ""

# Prerequisites check
echo "Checking prerequisites..."

if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 not found"
    exit 1
fi

if ! command -v nvidia-smi &> /dev/null; then
    echo "Warning: nvidia-smi not found. GPU may not be available."
fi

echo "✓ Prerequisites OK"
echo ""

# Create directories
echo "Creating directory structure..."
mkdir -p datasets/magnatagatune
mkdir -p datasets/amapiano_proxy
mkdir -p checkpoints/phase_2_5
mkdir -p training_logs
mkdir -p runs/phase_2_5
echo "✓ Directories created"
echo ""

# Install dependencies
echo "Installing Python dependencies..."
pip install -q --upgrade pip
pip install -q torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
pip install -q audiocraft
pip install -q pandas tqdm tensorboard
echo "✓ Dependencies installed"
echo ""

# Verify GPU
echo "Verifying GPU availability..."
python3 << EOF
import torch
print(f"PyTorch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"CUDA version: {torch.version.cuda}")
    print(f"GPU: {torch.cuda.get_device_name(0)}")
    print(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
else:
    print("WARNING: No GPU detected! Training will be extremely slow.")
EOF
echo ""

# Setup auto-shutdown
echo "Setting up auto-shutdown cost control..."
if [ -f "./setup-auto-shutdown.sh" ]; then
    chmod +x ./setup-auto-shutdown.sh
    ./setup-auto-shutdown.sh
    echo "✓ Auto-shutdown configured (2-hour idle timeout)"
else
    echo "Warning: setup-auto-shutdown.sh not found. Skipping auto-shutdown setup."
fi
echo ""

# Download dataset
echo "=============================================="
echo "Step 1: Dataset Download"
echo "=============================================="
echo ""
echo "IMPORTANT: MagnaTagATune requires manual download"
echo ""
echo "1. Visit: https://mirg.city.ac.uk/codeapps/the-magnatagatune-dataset"
echo "2. Download these files:"
echo "   - annotations_final.csv (automatic)"
echo "   - mp3.zip.001"
echo "   - mp3.zip.002"
echo "   - mp3.zip.003"
echo ""
echo "3. Extract audio files:"
echo "   cat mp3.zip.* > mp3.zip"
echo "   unzip mp3.zip -d datasets/magnatagatune/"
echo ""

read -p "Have you downloaded and extracted the audio files? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please download the dataset first, then run this script again."
    exit 1
fi

# Run dataset setup
echo "Running dataset filtering..."
python3 dataset_setup.py

if [ $? -ne 0 ]; then
    echo "Error: Dataset setup failed"
    exit 1
fi

echo "✓ Dataset ready"
echo ""

# Training configuration
echo "=============================================="
echo "Step 2: Training Configuration"
echo "=============================================="
echo ""

# Create config file
cat > config.json << EOF
{
  "model_name": "facebook/musicgen-small",
  "dataset_dir": "./datasets/amapiano_proxy",
  "checkpoint_dir": "./checkpoints/phase_2_5",
  "tensorboard_dir": "./runs/phase_2_5",
  "batch_size": 8,
  "learning_rate": 1e-5,
  "num_epochs": 20,
  "gradient_accumulation_steps": 4,
  "warmup_steps": 500,
  "save_every_n_steps": 1000,
  "eval_every_n_steps": 500,
  "gpu_cost_per_hour": $GPU_COST_PER_HOUR,
  "week_5_threshold_days": 35,
  "go_nogo_thresholds": {
    "min_authenticity_score": 0.35,
    "max_cost_usd": 600,
    "max_val_loss": 3.5
  }
}
EOF

echo "Training configuration saved to config.json"
echo ""

# Start TensorBoard
echo "=============================================="
echo "Step 3: Monitoring Setup"
echo "=============================================="
echo ""
echo "Starting TensorBoard..."
tensorboard --logdir=./runs/phase_2_5 --port=6006 --bind_all &
TENSORBOARD_PID=$!
echo "✓ TensorBoard running at http://localhost:6006"
echo "  PID: $TENSORBOARD_PID"
echo ""

# Display training command
echo "=============================================="
echo "Step 4: Launch Training"
echo "=============================================="
echo ""
echo "To start training, run:"
echo ""
echo "  python3 training_orchestrator.py --config config.json"
echo ""
echo "Or to resume from checkpoint:"
echo ""
echo "  python3 training_orchestrator.py --config config.json --resume"
echo ""

# Prompt to start
read -p "Start training now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "=============================================="
    echo "TRAINING STARTED"
    echo "=============================================="
    echo ""
    echo "Monitoring:"
    echo "  - TensorBoard: http://localhost:6006"
    echo "  - Logs: training_logs/"
    echo "  - Checkpoints: checkpoints/phase_2_5/"
    echo ""
    echo "Week 5 Go/No-Go Decision:"
    echo "  - Automatically evaluated at day 35"
    echo "  - Thresholds:"
    echo "    • Min authenticity: 35%"
    echo "    • Max cost: \$600"
    echo "    • Max val loss: 3.5"
    echo ""
    echo "Cost Control:"
    echo "  - Auto-shutdown after 2h idle"
    echo "  - Cost tracking enabled"
    echo "  - Current rate: \$$GPU_COST_PER_HOUR/hour"
    echo ""
    echo "Press Ctrl+C to stop training (checkpoint will be saved)"
    echo "=============================================="
    echo ""
    
    python3 training_orchestrator.py --config config.json
else
    echo ""
    echo "Training not started. Run the command above when ready."
fi

# Cleanup TensorBoard on exit
trap "kill $TENSORBOARD_PID 2>/dev/null" EXIT

echo ""
echo "Deployment complete!"
