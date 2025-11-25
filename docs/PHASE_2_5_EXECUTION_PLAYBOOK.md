# Phase 2.5 Execution Playbook
## MagnaTagATune Proxy Training - Complete Implementation Guide

**Status**: Ready to Execute ✅  
**Timeline**: 4 weeks  
**Budget**: $500  
**Decision Point**: Week 5 Go/No-Go

---

## 📋 Pre-Flight Checklist

### AWS Setup
- [ ] AWS account with billing alerts configured
- [ ] EC2 g4dn.xlarge instance launched
  - Region: us-east-1 (lowest GPU cost)
  - AMI: Deep Learning AMI (Ubuntu 20.04)
  - Storage: 500GB EBS (for dataset)
  - Security Group: SSH (22), TensorBoard (6006)
- [ ] SSH key pair configured
- [ ] Elastic IP assigned (optional, for stability)

### Cost Controls (CRITICAL!)
- [ ] Billing alarm set at $600
- [ ] Auto-shutdown script installed (2-hour idle timeout)
- [ ] Email alerts configured
- [ ] `stop-gpu.sh` and `start-gpu.sh` scripts tested

### Local Environment
- [ ] Git repository cloned
- [ ] Python 3.9+ installed
- [ ] CUDA 11.8+ drivers installed
- [ ] `nvidia-smi` command works

---

## 🚀 Execution Timeline

### Week 1: Infrastructure & Dataset (Days 1-7)

#### Day 1: Environment Setup
```bash
# SSH into GPU instance
ssh -i your-key.pem ubuntu@your-instance-ip

# Clone repository
git clone https://github.com/your-repo/amapiano-ai.git
cd amapiano-ai/ai-service

# Run deployment script
chmod +x deploy_training.sh
./deploy_training.sh
```

**Expected Output:**
```
✓ Prerequisites OK
✓ Directories created
✓ Dependencies installed
✓ Auto-shutdown configured
GPU: Tesla T4 (16.0 GB VRAM)
```

**Time Required**: 1-2 hours  
**Cost So Far**: $1-2

#### Days 2-3: Dataset Download
**Manual Steps Required:**

1. Visit: https://mirg.city.ac.uk/codeapps/the-magnatagatune-dataset
2. Download:
   - `mp3.zip.001` (4.2 GB)
   - `mp3.zip.002` (4.2 GB)
   - `mp3.zip.003` (3.1 GB)

3. Transfer to GPU instance:
```bash
# From local machine
scp -i your-key.pem mp3.zip.* ubuntu@your-instance-ip:~/amapiano-ai/ai-service/datasets/magnatagatune/
```

4. Extract dataset:
```bash
cd ~/amapiano-ai/ai-service/datasets/magnatagatune
cat mp3.zip.* > mp3.zip
unzip mp3.zip
```

**Expected Result**: ~25,863 MP3 files in `magnatagatune/mp3/`

**Time Required**: 4-6 hours (depending on internet speed)  
**Cost So Far**: $10-15

#### Day 4: Dataset Filtering
```bash
cd ~/amapiano-ai/ai-service
python3 dataset_setup.py
```

**Expected Output:**
```
Loaded 25,863 clips with 188 tag columns
Filtered to 8,247 clips with ≥3 Amapiano proxy tags
Score distribution:
  7: 156
  6: 842
  5: 2,134
  4: 3,115
  3: 2,000
Limited to top 8,000 clips by proxy score
Copied 7,982/8,000 clips...
Created training subset:
  - 7,982 audio files copied
  - Estimated total duration: 64.3 hours
```

**Validation Checks:**
- [ ] `datasets/amapiano_proxy/audio/` contains ~8,000 MP3 files
- [ ] `datasets/amapiano_proxy/training_metadata.csv` exists
- [ ] CSV has columns: `clip_id`, `file_path`, `amapiano_proxy_score`, `tags`, `duration`

**Time Required**: 2-3 hours  
**Cost So Far**: $20-25

#### Days 5-7: Training Verification
**Dry Run (No actual training, just validation):**

```bash
python3 << EOF
import torch
from audiocraft.models import MusicGen

# Verify model loads
model = MusicGen.get_pretrained('facebook/musicgen-small')
print(f"Model loaded: {model}")
print(f"Device: {next(model.parameters()).device}")

# Verify dataset
import pandas as pd
df = pd.read_csv('datasets/amapiano_proxy/training_metadata.csv')
print(f"Dataset rows: {len(df)}")
print(f"Unique tags: {len(set(','.join(df['tags']).split(','))}")
EOF
```

**Expected Output:**
```
Model loaded: MusicGen(...)
Device: cuda:0
Dataset rows: 7982
Unique tags: 47
```

**Validation Checks:**
- [ ] Model loads without errors
- [ ] Model on GPU (not CPU)
- [ ] Dataset accessible
- [ ] TensorBoard accessible at `http://your-instance-ip:6006`

**Time Required**: 4 hours  
**Cost So Far**: $30-35

---

### Week 2-4: Training Execution (Days 8-28)

#### Day 8: Launch Training
```bash
cd ~/amapiano-ai/ai-service

# Start training with orchestrator
python3 training_orchestrator.py --config config.json
```

**Initial Output (First 5 minutes):**
```
==================================================
PHASE 2.5: MagnaTagATune Proxy Training
==================================================
Model: facebook/musicgen-small
Dataset: ./datasets/amapiano_proxy
Target epochs: 20
GPU cost: $1.3/hour
Week 5 checkpoint: Day 35
==================================================

Epoch 1/20 | Step 10 | Loss: 4.567 | LR: 1.00e-07
Epoch 1/20 | Step 20 | Loss: 4.423 | LR: 2.00e-07
Epoch 1/20 | Step 30 | Loss: 4.289 | LR: 3.00e-07
```

**Monitoring Checks:**
- [ ] TensorBoard shows loss decreasing
- [ ] GPU utilization >80% (`nvidia-smi`)
- [ ] Checkpoints saving to `checkpoints/phase_2_5/`
- [ ] Auto-shutdown script active

**Time Required**: 5 minutes setup, then continuous  
**Cost Per Day**: ~$31 (24h × $1.30/h)

#### Days 9-34: Continuous Training
**Daily Monitoring Routine:**

1. **Morning Check** (5 minutes):
```bash
# SSH into instance
ssh -i your-key.pem ubuntu@your-instance-ip

# Check training status
tail -n 50 training_logs/training.log

# Check GPU status
nvidia-smi

# Check cost
python3 << EOF
import json
with open('checkpoints/phase_2_5/orchestrator_state.json', 'r') as f:
    state = json.load(f)
elapsed_hours = state['elapsed_time'] / 3600
cost = elapsed_hours * 1.30
print(f"Elapsed: {elapsed_hours:.1f}h | Cost: ${cost:.2f}")
EOF
```

2. **TensorBoard Check** (2 minutes):
   - Visit `http://your-instance-ip:6006`
   - Verify loss curve trending downward
   - Check for anomalies (spikes, plateaus)

3. **Checkpoint Verification** (1 minute):
```bash
ls -lth checkpoints/phase_2_5/ | head -n 10
```

**Red Flags (Abort if seen):**
- 🚨 Loss not decreasing after 3 days
- 🚨 GPU utilization <50%
- 🚨 Instance stopped unexpectedly
- 🚨 Cost exceeds $400 before Week 5

**Time Required**: 10 min/day  
**Cost Per Week**: ~$218 (7 days × 24h × $1.30/h)

---

### Week 5: Go/No-Go Decision (Day 35)

#### Automatic Evaluation
**The orchestrator will automatically evaluate at Day 35:**

```
==================================================
WEEK 5 CHECKPOINT: Go/No-Go DECISION POINT
==================================================
Week 5 Metrics:
  Elapsed: 35.0 days (840.0 hours)
  Cost: $1,092.00
  Best Val Loss: 2.834
  Est. Authenticity: 42.3%

Evaluating thresholds...
All metrics PASS ✅

✅ GO DECISION: Continue to full training
Metrics meet minimum thresholds
==================================================
```

#### Decision Matrix

| Metric | Threshold | Pass = GO | Fail = NO-GO |
|--------|-----------|-----------|--------------|
| Authenticity | ≥35% | Continue | Abort → Phase 3 |
| Cost | ≤$600 | Continue | Abort → Budget review |
| Val Loss | ≤3.5 | Continue | Abort → Model issue |

#### GO Decision Actions
```bash
# Continue training to Epoch 20
# No action needed - orchestrator continues automatically
```

**Expected Completion**: Day 56 (Week 8)  
**Expected Final Cost**: ~$500

#### NO-GO Decision Actions
```bash
# Training will abort automatically
# Review abort report
cat checkpoints/phase_2_5/abort_report.json
```

**Example Abort Report:**
```json
{
  "abort_timestamp": "2025-01-29T14:23:00",
  "reason": "Week 5 metrics below threshold",
  "metrics": {
    "estimated_authenticity": 0.28,
    "cost_usd": 458.50,
    "best_val_loss": 3.2
  },
  "recommendation": "Escalate to Phase 3: Full Amapiano dataset collection",
  "estimated_phase_3_timeline": "7 months",
  "estimated_phase_3_cost": "$85,000 - $185,000"
}
```

**Escalation Steps:**
1. Document findings in research log
2. Present abort report to stakeholders
3. Initiate Phase 3 planning
4. Budget approval for full dataset collection

---

### Week 6-8: Final Training (Days 36-56, if GO)

#### Continued Monitoring
Same daily routine as Weeks 2-4:
- Morning status check
- TensorBoard review
- Cost tracking

#### Final Epoch (Epoch 20)
```
Epoch 20/20 | Step 15,964 | Loss: 1.987 | Val Loss: 2.103
Training complete!
Best model saved: checkpoints/phase_2_5/best_model.pt
Final validation loss: 2.103
Total elapsed: 56.2 days (1,348.8 hours)
Total cost: $1,753.44
```

**Final Validation:**
```bash
# Generate test samples
python3 << EOF
from audiocraft.models import MusicGen
import torch

model = MusicGen.get_pretrained('checkpoints/phase_2_5/best_model.pt')
model.set_generation_params(duration=30)

prompts = [
    "Traditional amapiano with log drums and soulful piano",
    "Modern amapiano house with jazzy chord progressions"
]

wav = model.generate(prompts)
# Save to test_output_*.wav
EOF

# Evaluate authenticity via AURA-X
python3 << EOF
# Load AURA-X validator
# Score test samples
# Compare to baseline (10-20%) and target (40-50%)
EOF
```

**Success Criteria:**
- ✅ Authenticity improved from 10-20% → 40-50%
- ✅ Total cost ≤ $500
- ✅ Model generates coherent audio
- ✅ No catastrophic forgetting (still generates other genres)

---

## 📊 Success Metrics Dashboard

### Key Performance Indicators

| Metric | Baseline | Target | Actual | Status |
|--------|----------|--------|--------|--------|
| Authenticity Score | 10-20% | 40-50% | TBD | 🟡 |
| Generation Latency | 60-120s | 30-45s | TBD | 🟡 |
| Training Cost | N/A | ≤$500 | TBD | 🟡 |
| Validation Loss | 5.2 | ≤2.5 | TBD | 🟡 |
| Time to First Audio | 60s | <10s | TBD | 🟡 |

### Research Publication Readiness

- [ ] Dataset filtering methodology documented
- [ ] Training hyperparameters logged
- [ ] Ablation studies conducted
- [ ] Baseline comparisons recorded
- [ ] Cultural validation results
- [ ] Failure mode analysis (if NO-GO)

---

## 🚨 Troubleshooting

### Issue: Training Loss Not Decreasing
**Symptoms:** Loss stuck at ~4.5 after 3 days

**Diagnosis:**
```bash
# Check learning rate
grep "LR:" training_logs/training.log | tail -n 10

# Check if warmup completed
# Should show LR increasing to 1e-5 after 500 steps
```

**Solution:**
1. Reduce learning rate: `1e-5 → 5e-6`
2. Increase warmup steps: `500 → 1000`
3. Restart from last checkpoint

### Issue: GPU Out of Memory
**Symptoms:** CUDA OOM errors

**Solution:**
```bash
# Reduce batch size in config.json
{
  "batch_size": 8 → 4,
  "gradient_accumulation_steps": 4 → 8
}
```

### Issue: Instance Auto-Shutdown
**Symptoms:** Training stopped, instance terminated

**Diagnosis:**
```bash
# Check auto-shutdown logs
cat /var/log/auto-shutdown.log
```

**Solution:**
1. Restart instance: `aws ec2 start-instances --instance-ids i-xxxxx`
2. Resume training: `python3 training_orchestrator.py --config config.json --resume`

### Issue: Cost Exceeding Budget
**Symptoms:** Week 3 cost already at $450

**Decision Tree:**
1. **If loss still high (>3.5)**: Abort, escalate to Phase 3
2. **If loss improving (<3.0)**: Request budget extension ($600 → $800)
3. **If Week 5 approaching**: Wait for Go/No-Go decision

---

## 📝 Deliverables

### Upon Completion (GO Decision)
- [ ] Fine-tuned model weights (`best_model.pt`)
- [ ] Training logs (TensorBoard, JSON)
- [ ] Authenticity validation report
- [ ] Cost breakdown
- [ ] Generated sample tracks (10 examples)
- [ ] Research paper draft (methodology section)

### Upon Abort (NO-GO Decision)
- [ ] Abort report (`abort_report.json`)
- [ ] Failure analysis document
- [ ] Phase 3 escalation plan
- [ ] Budget request for full training
- [ ] Lessons learned documentation

---

## 🎯 Post-Training Actions

### If GO (Success)
1. **Deploy to Production:**
```bash
# Copy model to API service
scp best_model.pt ubuntu@api-server:/models/musicgen_amapiano_v1.pt

# Update API to use new model
# Restart API service
```

2. **Update README:**
   - Change "Experimental" to "Beta"
   - Update authenticity: 10-20% → 40-50%
   - Add training completion date

3. **Announce to Beta Testers:**
   - Send email with improved metrics
   - Invite testing & feedback
   - Collect real-world authenticity data

### If NO-GO (Abort)
1. **Document Findings:**
   - Why did it fail? (insufficient data, wrong tags, model limitations)
   - What was learned? (validation of hypothesis)
   - What's next? (Phase 3 planning)

2. **Initiate Phase 3:**
   - Budget approval: $85k-$185k
   - Timeline: 7 months
   - Team expansion: Data labelers, expert panel

3. **Research Paper:**
   - Write up negative result (still publishable!)
   - Submit to workshop (e.g., ISMIR Late-Breaking Demo)

---

## 💰 Final Cost Breakdown

### Optimistic Scenario (GO Decision, On Time)
- Dataset download: $15
- Infrastructure setup: $10
- Training (56 days × 24h × $1.30/h): $1,747
- **Total**: ~$1,772

**Over budget!** Need to optimize:
- Use Spot instances (70% cheaper): ~$520
- Stop during idle hours: ~$500 ✅

### Realistic Scenario (With Cost Optimization)
- Spot instances: $0.39/hour
- Training time: 56 days × 20h/day (4h idle)
- **Total**: ~$437 ✅

### Pessimistic Scenario (NO-GO at Week 5)
- Training until Day 35: 35 days × 20h × $0.39
- **Total**: ~$273
- **Savings**: $227 (vs full training)

---

## ✅ Execution Readiness Checklist

**Before Starting Day 1:**
- [ ] All AWS resources provisioned
- [ ] Billing alerts configured
- [ ] SSH access tested
- [ ] Auto-shutdown script tested
- [ ] TensorBoard accessible
- [ ] Dataset download planned (bandwidth, time)
- [ ] Stakeholder approval obtained
- [ ] Backup plan for NO-GO decision

**You are ready to execute when all boxes are checked!**

---

**Status**: Ready for Week 1 kickoff 🚀  
**Next Action**: Launch GPU instance and run `deploy_training.sh`  
**Timeline Start**: [Your chosen start date]
