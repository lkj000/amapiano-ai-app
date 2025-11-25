"""
Amapiano AI - GPU-Accelerated Audio Processing Service
FastAPI backend for MusicGen generation and Demucs stem separation

Deployment: AWS EC2 g4dn.xlarge (NVIDIA T4 GPU) or similar
Requirements: CUDA 11.8+, Python 3.10+, 16GB+ GPU RAM
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
import torch
import torchaudio
from pathlib import Path
import uuid
import logging
from datetime import datetime
import asyncio
from enum import Enum

# AI Model Imports
try:
    from audiocraft.models import MusicGen
    from demucs import pretrained
    from demucs.apply import apply_model
    MODELS_AVAILABLE = True
except ImportError:
    MODELS_AVAILABLE = False
    logging.warning("AI models not available - running in demo mode")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Amapiano AI Audio Service",
    description="GPU-accelerated audio generation and stem separation",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://amapiano-ai-app-d2k8stk82vjjq7b5tr00.lp.dev",
        "http://localhost:5173",
        "http://localhost:4000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# GPU Configuration
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
logger.info(f"Using device: {DEVICE}")

# Storage paths
UPLOAD_DIR = Path("./uploads")
OUTPUT_DIR = Path("./outputs")
STEMS_DIR = Path("./stems")

for directory in [UPLOAD_DIR, OUTPUT_DIR, STEMS_DIR]:
    directory.mkdir(exist_ok=True)

# Job queue and status tracking
class JobStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class Job(BaseModel):
    job_id: str
    status: JobStatus
    progress: float = 0.0
    result_url: Optional[str] = None
    error: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

jobs: dict[str, Job] = {}

# ===== AI MODEL INITIALIZATION =====

class AIModels:
    def __init__(self):
        self.musicgen = None
        self.demucs = None
        self.initialized = False
    
    async def initialize(self):
        """Initialize AI models on startup"""
        if not MODELS_AVAILABLE:
            logger.warning("Models not available - using mock mode")
            return
        
        try:
            logger.info("Loading MusicGen model...")
            self.musicgen = MusicGen.get_pretrained('facebook/musicgen-medium', device=DEVICE)
            self.musicgen.set_generation_params(duration=30, temperature=0.8, top_k=250)
            
            logger.info("Loading Demucs model...")
            self.demucs = pretrained.get_model('htdemucs').to(DEVICE)
            
            self.initialized = True
            logger.info("AI models initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize models: {e}")
            raise

ai_models = AIModels()

# ===== REQUEST/RESPONSE MODELS =====

class MusicGenRequest(BaseModel):
    prompt: str = Field(..., description="Text description of the music to generate")
    genre: Literal["amapiano", "private_school_amapiano"] = "amapiano"
    duration: int = Field(default=30, ge=5, le=120, description="Duration in seconds")
    cultural_authenticity: Literal["traditional", "modern", "fusion"] = "traditional"
    quality_tier: Literal["standard", "professional", "studio"] = "professional"
    temperature: float = Field(default=0.8, ge=0.1, le=1.5)
    top_k: int = Field(default=250, ge=50, le=500)

class MusicGenResponse(BaseModel):
    job_id: str
    status: JobStatus
    estimated_time: int
    message: str

class StemSeparationRequest(BaseModel):
    audio_url: str
    enhanced_processing: bool = False

class StemSeparationResponse(BaseModel):
    job_id: str
    status: JobStatus
    estimated_time: int

class JobStatusResponse(BaseModel):
    job_id: str
    status: JobStatus
    progress: float
    result_url: Optional[str] = None
    stems: Optional[dict[str, str]] = None
    error: Optional[str] = None
    estimated_remaining: Optional[int] = None

# ===== CULTURAL ENHANCEMENT =====

def enhance_prompt_with_culture(prompt: str, genre: str, authenticity: str) -> str:
    """Enhance prompt with Amapiano cultural context"""
    
    cultural_elements = {
        "amapiano": {
            "traditional": [
                "deep log drum basslines",
                "soulful South African piano melodies",
                "Kwaito-influenced percussion",
                "gospel-rooted harmonies",
                "authentic township groove"
            ],
            "modern": [
                "contemporary amapiano production",
                "electronic log drum synthesis",
                "modern South African house feel",
                "urban amapiano style"
            ],
            "fusion": [
                "amapiano with international influences",
                "cross-cultural rhythmic fusion",
                "blended traditional and modern elements"
            ]
        },
        "private_school_amapiano": {
            "traditional": [
                "jazz-influenced chord progressions",
                "sophisticated harmonic structure",
                "live instrument feel",
                "refined South African musicianship",
                "subtle percussive textures"
            ],
            "modern": [
                "contemporary private school production",
                "polished jazz-amapiano fusion",
                "sophisticated urban sound"
            ],
            "fusion": [
                "private school with global jazz elements",
                "refined cross-cultural sophistication"
            ]
        }
    }
    
    elements = cultural_elements.get(genre, {}).get(authenticity, [])
    enhancement = ", ".join(elements[:3])
    
    enhanced = f"{prompt}. Style: {genre} with {enhancement}. Authentic South African amapiano production at 115 BPM with characteristic log drum and piano elements."
    
    return enhanced

# ===== AUDIO GENERATION ENDPOINT =====

@app.post("/generate", response_model=MusicGenResponse)
async def generate_music(request: MusicGenRequest, background_tasks: BackgroundTasks):
    """
    Generate amapiano music from text prompt using MusicGen
    """
    job_id = str(uuid.uuid4())
    
    # Create job
    job = Job(
        job_id=job_id,
        status=JobStatus.QUEUED,
        created_at=datetime.now()
    )
    jobs[job_id] = job
    
    # Estimate processing time
    estimated_time = int(request.duration * 2)  # Rough estimate: 2x duration
    
    # Schedule background task
    background_tasks.add_task(
        process_music_generation,
        job_id=job_id,
        request=request
    )
    
    return MusicGenResponse(
        job_id=job_id,
        status=JobStatus.QUEUED,
        estimated_time=estimated_time,
        message=f"Music generation queued. Generating {request.duration}s of {request.genre}"
    )

async def process_music_generation(job_id: str, request: MusicGenRequest):
    """Background task for music generation"""
    job = jobs[job_id]
    job.status = JobStatus.PROCESSING
    
    try:
        logger.info(f"[{job_id}] Starting music generation")
        
        # Enhance prompt with cultural context
        enhanced_prompt = enhance_prompt_with_culture(
            request.prompt,
            request.genre,
            request.cultural_authenticity
        )
        
        logger.info(f"[{job_id}] Enhanced prompt: {enhanced_prompt}")
        
        if MODELS_AVAILABLE and ai_models.initialized:
            # Real AI generation
            ai_models.musicgen.set_generation_params(
                duration=request.duration,
                temperature=request.temperature,
                top_k=request.top_k
            )
            
            job.progress = 0.3
            
            # Generate audio
            with torch.no_grad():
                wav = ai_models.musicgen.generate([enhanced_prompt])
            
            job.progress = 0.8
            
            # Save audio
            output_path = OUTPUT_DIR / f"{job_id}.wav"
            torchaudio.save(
                str(output_path),
                wav[0].cpu(),
                sample_rate=ai_models.musicgen.sample_rate
            )
            
        else:
            # Mock generation for demo
            await asyncio.sleep(3)
            output_path = OUTPUT_DIR / f"{job_id}.wav"
            # Create empty WAV file
            output_path.touch()
        
        job.progress = 1.0
        job.status = JobStatus.COMPLETED
        job.result_url = f"/download/{job_id}.wav"
        job.completed_at = datetime.now()
        
        logger.info(f"[{job_id}] Generation completed")
        
    except Exception as e:
        logger.error(f"[{job_id}] Generation failed: {e}")
        job.status = JobStatus.FAILED
        job.error = str(e)

# ===== STEM SEPARATION ENDPOINT =====

@app.post("/separate-stems", response_model=StemSeparationResponse)
async def separate_stems(file: UploadFile = File(...), enhanced_processing: bool = False, background_tasks: BackgroundTasks = None):
    """
    Separate audio into stems using Demucs
    """
    job_id = str(uuid.uuid4())
    
    # Save uploaded file
    upload_path = UPLOAD_DIR / f"{job_id}_{file.filename}"
    with open(upload_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # Create job
    job = Job(
        job_id=job_id,
        status=JobStatus.QUEUED,
        created_at=datetime.now()
    )
    jobs[job_id] = job
    
    # Schedule background task
    if background_tasks:
        background_tasks.add_task(
            process_stem_separation,
            job_id=job_id,
            audio_path=upload_path,
            enhanced=enhanced_processing
        )
    
    return StemSeparationResponse(
        job_id=job_id,
        status=JobStatus.QUEUED,
        estimated_time=60  # ~60 seconds for stem separation
    )

async def process_stem_separation(job_id: str, audio_path: Path, enhanced: bool):
    """Background task for stem separation"""
    job = jobs[job_id]
    job.status = JobStatus.PROCESSING
    
    try:
        logger.info(f"[{job_id}] Starting stem separation")
        
        if MODELS_AVAILABLE and ai_models.initialized:
            # Load audio
            wav, sr = torchaudio.load(str(audio_path))
            
            # Resample if necessary
            if sr != ai_models.demucs.samplerate:
                resampler = torchaudio.transforms.Resample(sr, ai_models.demucs.samplerate)
                wav = resampler(wav)
            
            job.progress = 0.3
            
            # Separate stems
            with torch.no_grad():
                sources = apply_model(ai_models.demucs, wav[None].to(DEVICE))[0]
            
            job.progress = 0.7
            
            # Save stems
            stem_names = ["drums", "bass", "other", "vocals"]
            stem_paths = {}
            
            for i, name in enumerate(stem_names):
                stem_path = STEMS_DIR / f"{job_id}_{name}.wav"
                torchaudio.save(
                    str(stem_path),
                    sources[i].cpu(),
                    sample_rate=ai_models.demucs.samplerate
                )
                stem_paths[name] = f"/download/stems/{job_id}_{name}.wav"
            
        else:
            # Mock separation
            await asyncio.sleep(5)
            stem_paths = {
                "drums": f"/download/stems/{job_id}_drums.wav",
                "bass": f"/download/stems/{job_id}_bass.wav",
                "vocals": f"/download/stems/{job_id}_vocals.wav",
                "other": f"/download/stems/{job_id}_other.wav",
            }
        
        job.progress = 1.0
        job.status = JobStatus.COMPLETED
        job.result_url = stem_paths
        job.completed_at = datetime.now()
        
        logger.info(f"[{job_id}] Stem separation completed")
        
    except Exception as e:
        logger.error(f"[{job_id}] Stem separation failed: {e}")
        job.status = JobStatus.FAILED
        job.error = str(e)

# ===== STATUS AND DOWNLOAD ENDPOINTS =====

@app.get("/status/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    """Get status of a processing job"""
    job = jobs.get(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    estimated_remaining = None
    if job.status == JobStatus.PROCESSING and job.progress > 0:
        # Rough estimate based on progress
        estimated_remaining = int((1 - job.progress) * 60)
    
    return JobStatusResponse(
        job_id=job.job_id,
        status=job.status,
        progress=job.progress,
        result_url=job.result_url if isinstance(job.result_url, str) else None,
        stems=job.result_url if isinstance(job.result_url, dict) else None,
        error=job.error,
        estimated_remaining=estimated_remaining
    )

@app.get("/download/{filename}")
async def download_file(filename: str):
    """Download generated audio file"""
    file_path = OUTPUT_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=file_path,
        media_type="audio/wav",
        filename=filename
    )

@app.get("/download/stems/{filename}")
async def download_stem(filename: str):
    """Download separated stem file"""
    file_path = STEMS_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Stem file not found")
    
    return FileResponse(
        path=file_path,
        media_type="audio/wav",
        filename=filename
    )

# ===== HEALTH AND INFO ENDPOINTS =====

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "device": DEVICE,
        "models_available": MODELS_AVAILABLE,
        "models_initialized": ai_models.initialized,
        "active_jobs": len([j for j in jobs.values() if j.status == JobStatus.PROCESSING])
    }

@app.get("/")
async def root():
    """API information"""
    return {
        "service": "Amapiano AI Audio Processing",
        "version": "1.0.0",
        "endpoints": {
            "generate": "/generate",
            "separate_stems": "/separate-stems",
            "status": "/status/{job_id}",
            "health": "/health"
        },
        "gpu_available": torch.cuda.is_available(),
        "device": DEVICE
    }

# ===== STARTUP/SHUTDOWN EVENTS =====

@app.on_event("startup")
async def startup_event():
    """Initialize models on startup"""
    logger.info("Starting Amapiano AI Audio Service")
    try:
        await ai_models.initialize()
    except Exception as e:
        logger.error(f"Failed to initialize: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down Amapiano AI Audio Service")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
