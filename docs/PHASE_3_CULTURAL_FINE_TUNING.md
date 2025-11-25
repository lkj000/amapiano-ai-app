# Phase 3: Cultural Fine-Tuning & Amapiano Specialization

## Overview

Phase 3 transforms the generic AI models into **Amapiano specialists** through cultural fine-tuning, creating the world's first culturally-aware music AI that understands the nuances of South African amapiano music.

## Objectives

1. **Cultural Authenticity**: Train models that generate truly authentic amapiano, not generic house music
2. **Log Drum Mastery**: Specialized models that understand the signature amapiano log drum sound
3. **Genre Classification**: Accurate distinction between Classic and Private School Amapiano
4. **Cultural Preservation**: Encode South African musical heritage into AI models

## Data Collection Strategy

### Required Dataset Size
- **Minimum**: 500 hours of curated amapiano audio
- **Recommended**: 1,000+ hours for high-quality fine-tuning
- **Ideal**: 2,000+ hours with diverse sub-genre coverage

### Data Sources

#### 1. Licensed Music Platforms
- **Partner with SA Labels**: Ambitiouz Entertainment, Piano Hub, Open Mic Productions
- **Streaming Services**: License catalogs via deals with Apple Music, Spotify
- **YouTube**: Use Content ID system for legal audio extraction
- **Cost Estimate**: $50,000-$150,000 for licensing 1,000 hours

#### 2. Curated Collections
- **Artist Partnerships**:
  - Kabza De Small catalog (Classic Amapiano)
  - Kelvin Momo discography (Private School)
  - Babalwa M, Mas Musiq, Major League DJz
  
- **Genre Distribution**:
  - 60% Classic Amapiano
  - 30% Private School Amapiano
  - 10% Experimental/Fusion

#### 3. Quality Criteria
- **Audio Quality**: Minimum 320kbps MP3 or lossless (WAV/FLAC)
- **Cultural Validation**: Each track reviewed by SA music experts
- **Metadata Requirements**:
  - BPM (must be 100-130 range)
  - Key signature
  - Sub-genre (classic vs private school)
  - Primary instruments (log drum, piano, etc.)
  - Cultural elements (kwaito influence, jazz elements, etc.)

## Dataset Preparation

### Audio Processing Pipeline

```python
# 1. Normalization
- Resample all audio to 44.1kHz
- Normalize peak levels to -1dB
- Convert to mono for stem separation training

# 2. Segmentation
- Split tracks into 30-second segments
- Ensure segments contain musical content (no silence)
- Label segments with timestamps and musical events

# 3. Stem Separation for Training Data
- Use pre-existing Demucs to separate all tracks
- Label stems: drums, bass, piano, vocals, other
- Manual verification of log drum isolation quality

# 4. Cultural Annotation
- Tag with AURA-X cultural markers:
  - Log drum presence/quality
  - Gospel piano influence
  - Kwaito rhythmic patterns
  - Jazz harmonic complexity
  - Shaker/percussion authenticity
```

### AURA-X Cultural Validation Labels

```json
{
  "track_id": "kabza_001",
  "cultural_markers": {
    "log_drum_authenticity": 0.95,
    "gospel_influence": 0.8,
    "kwaito_rhythms": 0.7,
    "jazz_harmonies": 0.3,
    "traditional_percussion": 0.9
  },
  "sub_genre": "classic_amapiano",
  "reference_artists": ["Kabza De Small", "DJ Maphorisa"],
  "cultural_significance": "High - traditional township sound",
  "educational_value": "Demonstrates classic log drum programming"
}
```

## Fine-Tuning Methodology

### 1. MusicGen Amapiano Specialization

#### Training Setup
```python
# Base Model: facebook/musicgen-medium (1.5B parameters)
# Hardware: 4x NVIDIA A100 (40GB) GPUs
# Training Time: ~2 weeks for 1,000 hours of data
# Cost Estimate: ~$10,000 in GPU compute

from audiocraft.models import MusicGen
from audiocraft import train

# Load pre-trained model
model = MusicGen.get_pretrained('facebook/musicgen-medium')

# Amapiano-specific training config
config = {
    'dataset_path': './amapiano_dataset/',
    'batch_size': 4,  # Per GPU
    'learning_rate': 1e-5,
    'epochs': 50,
    'gradient_accumulation': 8,
    'mixed_precision': 'fp16',
    'cultural_loss_weight': 0.3,  # Custom loss for cultural features
}

# Custom cultural loss function
def cultural_loss(generated_audio, target_cultural_markers):
    """
    Additional loss term that penalizes deviations from
    cultural authenticity markers (log drum presence, etc.)
    """
    log_drum_loss = ...  # Extract and compare log drum features
    rhythm_loss = ...     # Kwaito rhythm similarity
    harmonic_loss = ...   # Gospel/jazz harmony preservation
    
    return log_drum_loss + rhythm_loss + harmonic_loss

# Fine-tune
train.train_musicgen(
    model=model,
    config=config,
    custom_loss=cultural_loss,
    validation_callback=aura_x_validation
)
```

#### Validation with AURA-X

```python
def aura_x_validation(generated_samples, epoch):
    """
    Validate using AURA-X cultural scoring
    """
    scores = []
    for sample in generated_samples:
        validation_result = aura_x_core.executeModuleOperation(
            'cultural_validator',
            'validate_authenticity',
            {'audioData': sample, 'genre': 'amapiano'}
        )
        scores.append(validation_result.authenticityScore)
    
    avg_score = sum(scores) / len(scores)
    
    # Require minimum 0.75 authenticity to continue training
    if avg_score < 0.75:
        logging.warning(f"Epoch {epoch}: Cultural drift detected (score: {avg_score})")
    
    return avg_score
```

### 2. Custom Log Drum Separation Model

The standard Demucs model doesn't have a "log drum" stem. We need to train a custom separator.

#### Dataset Creation
```python
# Create log drum training dataset
1. Take 500 hours of labeled amapiano
2. Use existing Demucs to extract "bass" stem
3. Manually verify and correct log drum isolation
4. Create binary mask: log_drum vs other
```

#### Training Custom Demucs Head

```python
from demucs import pretrained
from demucs.model import Demucs

# Load pre-trained Demucs
base_model = pretrained.get_model('htdemucs')

# Add new "log_drum" output head
# Keep existing heads: drums, bass, vocals, other
# Add 5th head: log_drum
extended_model = extend_demucs_with_log_drum(base_model)

# Fine-tune only the new head + shared encoder
# Freeze other stem heads
for param in extended_model.drums_head.parameters():
    param.requires_grad = False
# ... freeze other heads

# Train on amapiano-specific dataset
train_log_drum_separator(
    model=extended_model,
    dataset='./log_drum_dataset/',
    epochs=30
)
```

## Deployment Strategy

### Model Versioning

```
amapiano-musicgen-v1.0
├── Classic Amapiano specialist (60% of data)
├── Private School specialist (30% of data)
└── Fusion model (10% of data)

amapiano-demucs-v1.0
├── Standard 4-stem
└── Extended 5-stem (with log_drum)
```

### A/B Testing

1. **Control**: Generic MusicGen
2. **Treatment**: Fine-tuned Amapiano MusicGen
3. **Metrics**:
   - Cultural authenticity scores (AURA-X)
   - User preference (blind testing)
   - Expert validation (SA producers)

### Quality Gating

```typescript
// In ai-orchestrator.ts
const MIN_CULTURAL_SCORE = 0.80;  // Require 80%+ authenticity

if (culturalValidation.authenticityScore < MIN_CULTURAL_SCORE) {
  // Reject and re-generate with stronger cultural prompts
  log.warn("Generation below cultural threshold, retrying");
  return await retryWithEnhancedPrompt(originalPrompt);
}
```

## Cost Analysis

### One-Time Costs

| Item | Cost |
|------|------|
| Music Licensing (1,000 hours) | $50,000 - $150,000 |
| Data Annotation Labor | $20,000 |
| GPU Training (A100 cluster, 2 weeks) | $10,000 |
| Expert Validation (SA producers) | $5,000 |
| **Total** | **$85,000 - $185,000** |

### Ongoing Costs

| Item | Monthly Cost |
|------|--------------|
| Model Hosting (AWS EC2 g4dn.xlarge) | $388 |
| Continuous training updates | $1,000 |
| Cultural validation service | $500 |
| **Total** | **~$2,000/month** |

## Success Metrics

### Quantitative
- **Cultural Authenticity**: >85% average AURA-X score
- **Log Drum Detection**: >90% accuracy in identifying log drum presence
- **Genre Classification**: >95% accuracy in Classic vs Private School
- **User Satisfaction**: >4.5/5 rating from SA producers

### Qualitative
- Expert validation from Kabza De Small, Kelvin Momo, or peers
- Positive reception in SA amapiano community
- Recognition as culturally authentic tool

## Ethical Considerations

### Cultural Respect
- Partner with SA artists for training data licensing
- Revenue sharing with original creators
- Credit South African musical heritage in all materials
- Avoid cultural appropriation - build WITH the community, not FOR profit

### IP Protection
- Ensure all training data is legally licensed
- Implement watermarking for generated audio
- Respect artist rights and attribution

### Bias Mitigation
- Ensure dataset represents diverse SA regions
- Include township and private school styles equally
- Avoid over-representing commercial hits

## Timeline

### Months 1-2: Data Collection
- Negotiate licensing deals
- Build data pipeline
- Initial 500 hours curated

### Months 3-4: Annotation & Preparation
- Cultural labeling
- AURA-X validation markup
- Quality control

### Months 5-6: Training
- MusicGen fine-tuning (4 weeks)
- Demucs log drum model (2 weeks)
- Validation and iteration

### Month 7: Deployment
- A/B testing
- Expert validation
- Community feedback
- Production rollout

**Total Duration**: 7 months
**Budget**: $85,000 - $185,000

## Next Steps

1. **Immediate**: Establish partnerships with SA labels
2. **Week 1**: Begin data licensing negotiations
3. **Week 2**: Set up annotation infrastructure
4. **Month 1**: Start data collection and labeling
5. **Month 3**: Begin model training

---

**The result**: The world's first AI that truly understands amapiano, preserving South African musical heritage while democratizing authentic music creation.
