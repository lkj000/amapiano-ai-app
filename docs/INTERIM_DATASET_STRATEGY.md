# Interim Dataset Strategy: MagnaTagATune Integration

## Overview

While awaiting the full Amapiano cultural dataset (Phase 3), we'll use the **MagnaTagATune dataset** as an interim training corpus to establish baseline AI capabilities.

## MagnaTagATune Dataset

### Specifications
- **Source**: https://mirg.city.ac.uk/codeapps/the-magnatagatune-dataset
- **Size**: 25,863 audio clips (29-second segments)
- **Total Duration**: ~200 hours
- **Format**: MP3, 16kHz, mono
- **Labels**: 188 semantic tags (genre, mood, instrumentation)
- **License**: Creative Commons

### Relevant Tags for Amapiano Proxy Training

While MagnaTagATune doesn't contain Amapiano specifically, we can filter for related characteristics:

```python
# Tags relevant to Amapiano elements
AMAPIANO_PROXY_TAGS = {
    # Rhythmic elements
    'drums', 'percussion', 'beats', 'techno', 'electronic',
    'dance', 'groovy', 'syncopated',
    
    # Harmonic elements  
    'piano', 'keyboard', 'jazzy', 'chords',
    'bass', 'deep', 'low',
    
    # Mood/style
    'chill', 'mellow', 'soulful', 'dark',
    'ambient', 'soft', 'slow',
    
    # Production style
    'quiet', 'medium', 'repetitive',
}

# Filter dataset
subset = magnatagatune.filter_by_tags(AMAPIANO_PROXY_TAGS)
# Expected: ~5,000-8,000 clips (~15-25 hours)
```

## Integration Strategy

### Phase 2.5: Interim Fine-Tuning (2-4 weeks)

#### 1. Dataset Preparation

```python
# download_magnatagatune.py
import urllib.request
import tarfile
from pathlib import Path

DATASET_URL = "https://mirg.city.ac.uk/datasets/magnatagatune/mp3.zip"
OUTPUT_DIR = Path("./datasets/magnatagatune/")

def download_and_extract():
    """Download MagnaTagATune dataset"""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    print("Downloading MagnaTagATune (5GB)...")
    urllib.request.urlretrieve(DATASET_URL, OUTPUT_DIR / "magnatagatune.zip")
    
    print("Extracting...")
    # Extract and organize
    
    print(f"Dataset ready: {OUTPUT_DIR}")

def create_amapiano_proxy_subset():
    """Create filtered subset for interim training"""
    import pandas as pd
    
    # Load annotations
    annotations = pd.read_csv(OUTPUT_DIR / "annotations_final.csv")
    
    # Filter for relevant tags
    filtered = annotations[
        annotations['tags'].apply(
            lambda tags: any(tag in AMAPIANO_PROXY_TAGS for tag in tags.split('\t'))
        )
    ]
    
    # Augment with cultural markers (simulated)
    filtered['pseudo_log_drum_score'] = filtered['tags'].apply(
        lambda tags: 0.7 if 'drums' in tags and 'bass' in tags else 0.3
    )
    
    filtered['pseudo_piano_score'] = filtered['tags'].apply(
        lambda tags: 0.8 if 'piano' in tags or 'keyboard' in tags else 0.2
    )
    
    filtered.to_csv(OUTPUT_DIR / "amapiano_proxy_subset.csv", index=False)
    
    print(f"Created proxy subset: {len(filtered)} clips")
    return filtered

if __name__ == "__main__":
    download_and_extract()
    create_amapiano_proxy_subset()
```

#### 2. Interim MusicGen Fine-Tuning

```python
# train_interim_model.py
from audiocraft.models import MusicGen
from audiocraft.data.audio_dataset import AudioDataset
import torch

# Configuration
CONFIG = {
    'base_model': 'facebook/musicgen-small',  # Use small for faster iteration
    'dataset': './datasets/magnatagatune/amapiano_proxy_subset.csv',
    'batch_size': 8,
    'learning_rate': 5e-5,
    'epochs': 20,
    'gpu': 'cuda:0',
    'output_dir': './models/interim/',
}

def create_prompt_augmentation(tags):
    """
    Convert MagnaTagATune tags into Amapiano-style prompts
    """
    prompt_templates = [
        "Amapiano track with {instruments} at 115 BPM",
        "South African house music featuring {instruments}",
        "{mood} amapiano with log drums and {instruments}",
    ]
    
    # Extract instruments and mood from tags
    instruments = [tag for tag in tags if tag in ['piano', 'drums', 'bass', 'percussion']]
    mood = next((tag for tag in tags if tag in ['chill', 'mellow', 'groovy', 'dark']), 'soulful')
    
    import random
    template = random.choice(prompt_templates)
    return template.format(
        instruments=', '.join(instruments) if instruments else 'piano and drums',
        mood=mood
    )

def train_interim_model():
    """
    Fine-tune MusicGen on MagnaTagATune proxy dataset
    """
    print("Loading base model...")
    model = MusicGen.get_pretrained(CONFIG['base_model'])
    model = model.to(CONFIG['gpu'])
    
    print("Preparing dataset...")
    dataset = AudioDataset(CONFIG['dataset'])
    
    # Augment with Amapiano-style prompts
    dataset.prompts = [
        create_prompt_augmentation(sample['tags']) 
        for sample in dataset
    ]
    
    print(f"Training on {len(dataset)} samples...")
    
    # Training loop (simplified)
    optimizer = torch.optim.AdamW(model.parameters(), lr=CONFIG['learning_rate'])
    
    for epoch in range(CONFIG['epochs']):
        for batch in dataset.batches(CONFIG['batch_size']):
            # Forward pass
            loss = model.compute_loss(batch)
            
            # Backward pass
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            
            print(f"Epoch {epoch}, Loss: {loss.item():.4f}")
        
        # Save checkpoint
        model.save_pretrained(f"{CONFIG['output_dir']}/epoch_{epoch}")
    
    print("Interim training complete!")
    return model

if __name__ == "__main__":
    model = train_interim_model()
```

#### 3. Deployment Configuration

Update the GPU service to use the interim model:

```python
# ai-service/main.py - Update model loading

class AIModels:
    async def initialize(self):
        if not MODELS_AVAILABLE:
            return
        
        try:
            # Check for interim fine-tuned model
            interim_model_path = Path("./models/interim/epoch_19")
            
            if interim_model_path.exists():
                logger.info("Loading interim fine-tuned MusicGen model...")
                self.musicgen = MusicGen.get_pretrained(str(interim_model_path), device=DEVICE)
            else:
                logger.info("Loading base MusicGen model...")
                self.musicgen = MusicGen.get_pretrained('facebook/musicgen-medium', device=DEVICE)
            
            self.musicgen.set_generation_params(duration=30, temperature=0.8, top_k=250)
            
            # ... rest of initialization
```

## Benefits of Interim Approach

### Immediate Gains
1. **Functional AI Generation**: Real text-to-audio without waiting for Amapiano dataset
2. **Testing Infrastructure**: Validate training pipeline before expensive cultural fine-tuning
3. **User Feedback**: Gather usage patterns to inform Phase 3 dataset curation
4. **Cost Efficiency**: Train on free dataset first (~$500 compute vs $10k for Phase 3)

### Limitations
- **Not Culturally Authentic**: Will generate generic electronic music, not true Amapiano
- **Missing Log Drums**: No training data for the signature Amapiano sound
- **Generic House**: Output will sound more like generic house/techno
- **Interim Solution Only**: Must be replaced with Phase 3 cultural model

## Migration Path to Cultural Model

```python
# model_migration.py

def migrate_to_cultural_model():
    """
    Seamless transition from interim to cultural model
    """
    # 1. Deploy cultural model to new endpoint
    # 2. Run A/B test: 10% traffic to cultural model
    # 3. Measure AURA-X authenticity scores
    # 4. Gradually increase traffic if scores > 0.85
    # 5. Deprecate interim model
    
    cultural_scores = []
    interim_scores = []
    
    for i in range(100):
        # Generate with both models
        cultural_output = cultural_model.generate(prompt)
        interim_output = interim_model.generate(prompt)
        
        # Validate with AURA-X
        cultural_score = aura_x_validate(cultural_output)
        interim_score = aura_x_validate(interim_output)
        
        cultural_scores.append(cultural_score)
        interim_scores.append(interim_score)
    
    print(f"Cultural Model Avg: {sum(cultural_scores)/len(cultural_scores)}")
    print(f"Interim Model Avg: {sum(interim_scores)/len(interim_scores)}")
    
    # Should see 2-3x improvement in cultural scores
```

## Timeline Update

### Revised Implementation Phases

| Phase | Duration | Status | Output |
|-------|----------|--------|--------|
| **1: Web Audio Engine** | ✅ Complete | Deployed | Real MIDI playback, Tone.js |
| **2: GPU Backend** | ✅ Complete | Ready | MusicGen/Demucs integration |
| **2.5: Interim Training** | **2-4 weeks** | **NEW** | Generic AI generation (MagnaTagATune) |
| **3: Cultural Dataset** | 2-3 months | Pending | 1,000h Amapiano corpus |
| **3.5: Cultural Training** | 4-6 weeks | Pending | True Amapiano specialist |

**Total to Cultural Model**: 4-5 months (vs 7 months without interim phase)

## Cost Analysis

### Interim Training (Phase 2.5)
- **Dataset**: Free (Creative Commons)
- **GPU Training**: 
  - Instance: AWS g4dn.xlarge (NVIDIA T4)
  - Duration: 3-5 days
  - Cost: ~$500
- **Storage**: 10GB (~$1/month)
- **Total**: **~$500 one-time**

### Cultural Training (Phase 3.5)
- As previously documented: $85k-$185k

## Implementation Steps (Next 2 Weeks)

### Week 1: Dataset Setup
```bash
# Day 1-2: Download and prepare
python download_magnatagatune.py
python create_amapiano_proxy_subset.py

# Day 3-4: Verify data quality
python validate_dataset.py

# Day 5-7: Set up training infrastructure
# Launch AWS EC2 g4dn.xlarge
# Install dependencies
# Test training pipeline with small subset
```

### Week 2: Training and Deployment
```bash
# Day 8-11: Fine-tune MusicGen
python train_interim_model.py

# Day 12-13: Validate outputs
python validate_generated_audio.py

# Day 14: Deploy to production
docker build -t amapiano-ai-interim .
docker run --gpus all amapiano-ai-interim
```

## Monitoring Interim Model Quality

```python
# quality_monitoring.py

def monitor_interim_quality():
    """
    Track quality metrics for interim model vs future cultural model
    """
    metrics = {
        'generation_success_rate': 0.0,
        'audio_quality_score': 0.0,
        'user_satisfaction': 0.0,
        'cultural_authenticity': 0.0,  # Expected to be low
    }
    
    # Log to monitoring dashboard
    # Alert if quality drops below thresholds
    # Prepare for cultural model migration
```

## Documentation Updates

Add to `DEPLOYMENT_COMPLETE_GUIDE.md`:

```markdown
## Interim Model (Phase 2.5)

The platform currently uses an interim model fine-tuned on MagnaTagATune:

**Capabilities:**
- Text-to-audio generation (30s clips)
- Electronic/house music styles
- Basic rhythmic and harmonic control

**Limitations:**
- ❌ Not culturally authentic Amapiano
- ❌ No log drum specialization  
- ❌ Generic house/techno output

**Migration:** This interim model will be replaced by the cultural Amapiano specialist (Phase 3.5) once the authentic dataset is available. The migration will be transparent to end users.
```

---

## Summary

**Interim Strategy Benefits:**
1. ✅ Functional AI generation **NOW** (2-4 weeks)
2. ✅ Validate entire pipeline before expensive cultural training
3. ✅ Gather user feedback to inform Phase 3 dataset curation
4. ✅ Cost-effective testing ($500 vs $10k)

**Trade-off:**
- Won't be culturally authentic Amapiano yet
- Must clearly communicate "interim model" to users
- Requires migration effort when cultural model ready

**Recommendation**: 
Proceed with MagnaTagATune interim training immediately. This allows the platform to launch with **real AI capabilities** while building the authentic Amapiano dataset in parallel. When cultural data is ready, seamlessly migrate using A/B testing.
