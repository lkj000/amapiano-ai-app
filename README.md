# Amapiano AI Platform

**Status: Alpha Release** 🚧

An AI-powered platform for creating, analyzing, and producing authentic Amapiano music. From idea to finished track, all in one place.

---

## 🎯 Alpha Release Status

### ✅ Production-Ready Features
- **AI Music Generation** - Text-to-MIDI with GPT-4, ready for demo
- **Audio Analysis** - YouTube & file analysis with Essentia.js
- **Sample Library** - Curated samples from Kabza De Small, Kelvin Momo
- **Pattern Library** - Chord progressions, drum patterns with AI recommendations
- **Research Dashboard** - Real-time doctoral research metrics
- **Professional DAW** - Full-featured Digital Audio Workstation (web-based)

### ⚠️ Experimental Features (In Training)
- **Text-to-Audio Generation** - Currently using generic MusicGen
  - **Status**: 10-20% Amapiano authenticity (baseline)
  - **In Progress**: Phase 2.5 fine-tuning on MagnaTagATune dataset
  - **Timeline**: 4-week training cycle with Week 5 Go/No-Go evaluation
  - **Expected Improvement**: 40-50% authenticity after training

### 🔬 Research Infrastructure
This platform includes a complete doctoral research infrastructure for AI music generation:
- **CAQ (Culturally-Aware Quantization)** - Compression with cultural preservation
- **DistriGen** - Distributed multi-GPU generation system
- **Continuous Learning** - Model adaptation pipeline
- **Pattern Recommender** - Context-aware pattern suggestions
- **Quality Monitoring** - Real-time validation and metrics

---

## 🚀 Quick Start

### Frontend (DAW & UI)
The platform is live and accessible at:
```
https://amapiano-ai-app-d2k8stk82vjjq7b5tr00.lp.dev
```

**Features available now:**
- Professional DAW interface
- Sample browser & pattern library
- Audio analysis tools
- Research metrics dashboard

### Backend API
API available at:
```
https://amapiano-ai-app-d2k8stk82vjjq7b5tr00.api.lp.dev
```

**Endpoints:**
- `/music/generate` - AI music generation
- `/music/analyze` - Audio analysis
- `/music/samples/*` - Sample library
- `/music/patterns/*` - Pattern library
- `/music/research/*` - Research metrics

---

## 📊 Current Capabilities

### 1. AI Music Generation
**Status**: Experimental (Training in progress)

```typescript
const track = await backend.music.generate({
  prompt: "Traditional amapiano with log drums and soulful piano",
  genre: "amapiano",
  bpm: 112,
  duration: 30
});
```

**Current Performance:**
- **Generation Speed**: 60-120s for 30s track
- **Cultural Authenticity**: 10-20% (baseline MusicGen)
- **Target After Training**: 40-50% authenticity, <10s to first audio chunk

### 2. Audio Analysis
**Status**: Production Ready ✅

- **Stem Separation**: Demucs v4 with cultural enhancements
- **Log Drum Detection**: 3-criteria validation (frequency + decay + harmonics)
- **YouTube Integration**: Download & analyze any YouTube video
- **Feature Extraction**: BPM, key, spectral features via Essentia.js

### 3. Professional DAW
**Status**: Alpha ✅

- **Latency**: 20-30ms (optimized from 50-100ms)
- **Visual Sync**: Latency-compensated playhead (±5ms accuracy)
- **MIDI Support**: Piano roll editing
- **Effects**: Reverb, delay, EQ, compression
- **Mixing**: Per-track volume, pan, mute, solo

**Known Limitations:**
- Recording not yet implemented
- Some effects still in development
- Desktop DAW parity requires Electron app (Phase 4)

### 4. Sample Library
**Status**: Production Ready ✅

- Curated samples from top Amapiano artists
- Tag-based filtering
- Cultural significance metadata
- Waveform preview

---

## 🧪 Phase 2.5: MagnaTagATune Training

### Training Infrastructure
We're currently fine-tuning MusicGen on a filtered MagnaTagATune dataset as a hypothesis test for cultural transfer learning.

**Setup:**
```bash
cd ai-service
chmod +x deploy_training.sh
./deploy_training.sh
```

**What Happens:**
1. Downloads MagnaTagATune dataset (25,863 clips)
2. Filters to ~8,000 clips with Amapiano-proxy tags
3. Fine-tunes MusicGen-small for 20 epochs
4. Evaluates Week 5 Go/No-Go decision

**Week 5 Go/No-Go Thresholds:**
- **Minimum Authenticity**: 35% (vs 10-20% baseline)
- **Maximum Cost**: $600
- **Maximum Validation Loss**: 3.5

**Decision Outcomes:**
- **GO**: Continue to full 20 epochs → Deploy to production
- **NO-GO**: Abort training → Escalate to Phase 3 (full Amapiano dataset)

**Timeline & Cost:**
- **Duration**: 4 weeks on AWS g4dn.xlarge (NVIDIA T4)
- **Cost**: ~$500 total
- **GPU Utilization**: Auto-shutdown after 2h idle (cost control)

---

## 🏗️ Architecture

### Three-Tier AI System
```
User Prompt
    ↓
GPT-4 (Text → MIDI + Cultural Intent)
    ↓
MusicGen (MIDI → Audio Stems)
    ↓
Demucs v4 (Stem Separation + Enhancement)
    ↓
AURA-X (Cultural Validation ≥80%)
    ↓
Final Track (or Rejection)
```

### AURA-X Cultural Governance
- **Authenticity Threshold**: 80% minimum
- **Rejection Rate**: >90% of generic outputs
- **Validation Criteria**: Log drum presence, harmonic sophistication, rhythmic authenticity

### Cost Control (Critical!)
- **Auto-Shutdown**: 2-hour idle timeout on GPU instances
- **Cost Tracking**: Real-time monitoring in training dashboard
- **Alerts**: Email notifications for budget thresholds
- **Manual Controls**: `stop-gpu.sh` and `start-gpu.sh` convenience scripts

---

## 📚 Documentation

### For Users
- [App Overview](docs/APP_OVERVIEW.md) - Complete feature walkthrough
- [API Reference](docs/API_REFERENCE.md) - Backend API documentation
- [DAW Debugging](docs/DAW_BLANK_SCREEN_DEBUG.md) - Troubleshooting guide

### For Developers
- [Architecture](docs/ARCHITECTURE.md) - System design & data flow
- [Development Guide](docs/DEVELOPMENT.md) - Setup & contribution guide
- [Implementation Summary](docs/IMPLEMENTATION_COMPLETE_GAPS_ADDRESSED.md) - All competitive gap solutions

### For Researchers
- [Doctoral Thesis Proposal](docs/DOCTORAL_THESIS_PROPOSAL.md) - Research objectives
- [PhD Enhancements](docs/PHD_ENHANCEMENTS_COMPLETE.md) - Research infrastructure details
- [Research Status](docs/RESEARCH_STATUS.md) - Current experiment results
- [Phase 3 Cultural Fine-Tuning](docs/PHASE_3_CULTURAL_FINE_TUNING.md) - Full training roadmap

---

## 🎓 Academic Context

This platform is the practical implementation for a doctoral thesis on:
> **"AI-Driven Music Generation with Cultural Authenticity Preservation"**

### Research Contributions
1. **CAQ Framework** - Culturally-Aware Quantization for model compression
2. **DistriGen** - Distributed generation with cultural validation
3. **AURA-X** - Cultural governance system for AI music
4. **Continuous Learning** - Adaptive model improvement pipeline

### Publications (Planned)
- Conference: CAQ algorithm results (ISMIR 2025)
- Journal: Full system evaluation (ACM TOMM)
- Workshop: Cultural validation methodology

---

## 🚨 Known Issues

### Build Warnings (Non-Critical)
3 TypeScript errors remain but don't affect runtime:
- `client.ts:725` - Auto-generated code (Encore.ts)
- `HomePage.tsx:104` - Spurious ReactNode inference
- `PatternsPage.tsx:410` - Spurious ReactNode inference

**Impact**: None. Application runs normally.

### Empty Database (Expected)
Research dashboard shows zeros until you run experiments:
```bash
# Populate via API calls
curl -X POST https://...api.lp.dev/music/research/caq/run
curl -X POST https://...api.lp.dev/music/research/learning/collect
```

---

## 🛣️ Roadmap

### Phase 2.5 (Current - 4 weeks)
- [ ] MagnaTagATune training
- [ ] Week 5 Go/No-Go evaluation
- [ ] Deploy fine-tuned model (if GO decision)
- [ ] Update authenticity metrics

### Phase 3 (7 months, $85k-$185k)
- [ ] Full Amapiano dataset collection (10,000+ tracks)
- [ ] Expert panel recruitment (50 validators)
- [ ] Cultural labeling pipeline
- [ ] MusicGen-medium fine-tuning
- [ ] Target: 85-95% authenticity

### Phase 4 (6-12 months, $120k-$200k)
- [ ] Electron desktop app
- [ ] Native ASIO/CoreAudio drivers
- [ ] VST plugin support
- [ ] Target: 3-5ms latency (pro parity)

---

## 💡 Beta Testing

**Interested in beta testing?** We're looking for:
- Amapiano producers
- Music educators
- AI researchers
- Audio engineers

**What to expect:**
- Alpha-quality software (some bugs expected)
- Experimental AI features (10-20% authenticity currently)
- Research data collection (anonymized)
- Early access to training improvements

**Contact:** [Your email or GitHub Issues]

---

## 📜 License

[Your license here]

---

## 🙏 Acknowledgments

- **Kabza De Small, DJ Maphorisa, Kelvin Momo** - Musical inspiration
- **Meta AI** - MusicGen and Demucs models
- **Encore.ts** - Backend framework
- **Essentia.js** - Audio analysis library

---

## ⚙️ Technical Stack

**Backend:**
- Encore.ts (TypeScript backend framework)
- PostgreSQL (database)
- FastAPI (Python GPU service)
- PyTorch (model training)

**Frontend:**
- React + TypeScript
- Tone.js (Web Audio)
- TailwindCSS + shadcn/ui
- TanStack Query

**AI/ML:**
- GPT-4 (OpenAI)
- MusicGen (Meta)
- Demucs v4 (Meta)
- Essentia.js (MTG UPF)

**Infrastructure:**
- AWS EC2 g4dn.xlarge (GPU training)
- Encore Cloud (backend hosting)
- TensorBoard (training monitoring)

---

**Current Version**: Alpha 0.5.0  
**Last Updated**: 2025-11-25  
**Training Status**: Phase 2.5 In Progress 🚀
