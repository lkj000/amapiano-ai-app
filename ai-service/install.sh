#!/bin/bash
# Amapiano AI - Safe installation script
# Resolves all dependency conflicts

set -e

echo "🔧 Amapiano AI - Dependency Installation"
echo "========================================"

# Check Python version
python_version=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
echo "Python version: $python_version"

if [[ "$python_version" < "3.10" ]]; then
    echo "❌ Python 3.10+ required (found $python_version)"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip setuptools wheel

# Install in specific order to avoid conflicts
echo ""
echo "📥 Installing dependencies (this may take 10-15 minutes)..."
echo ""

# Step 1: Core numerical libraries
echo "1/6 Installing numpy and numba..."
pip install numpy==1.24.3 numba==0.58.1

# Step 2: PyTorch with CUDA
echo "2/6 Installing PyTorch with CUDA 11.8..."
pip install torch==2.1.2 torchvision==0.16.2 torchaudio==2.1.2 --extra-index-url https://download.pytorch.org/whl/cu118

# Step 3: Transformers ecosystem
echo "3/6 Installing transformers..."
pip install transformers==4.36.2 accelerate==0.25.0 sentencepiece==0.1.99 protobuf==3.20.3

# Step 4: Audio processing
echo "4/6 Installing audio libraries..."
pip install librosa==0.10.1 soundfile==0.12.1 scipy==1.11.4 audioread==3.0.1 resampy==0.4.2

# Step 5: AI models (audiocraft from git for stability)
echo "5/6 Installing audiocraft and demucs..."
pip install einops==0.7.0 xformers==0.0.23.post1
pip install git+https://github.com/facebookresearch/audiocraft.git@stable
pip install demucs==4.0.1

# Step 6: Web server and utilities
echo "6/6 Installing FastAPI and utilities..."
pip install fastapi==0.109.0 uvicorn[standard]==0.27.0 python-multipart==0.0.9
pip install pydantic==2.5.3 python-dotenv==1.0.1 aiofiles==23.2.1 tqdm==4.66.1
pip install datasets==2.16.1 requests==2.31.0
pip install prometheus-fastapi-instrumentator==6.1.0
pip install pandas==2.1.4 matplotlib==3.8.2

echo ""
echo "✅ Installation complete!"
echo ""
echo "Verify installation:"
python3 -c "import torch; print(f'PyTorch: {torch.__version__}'); print(f'CUDA: {torch.cuda.is_available()}')"
python3 -c "import transformers; print(f'Transformers: {transformers.__version__}')"
python3 -c "import audiocraft; print(f'Audiocraft: {audiocraft.__version__}')"
echo ""
echo "To activate environment: source venv/bin/activate"
