# Phase 2.5 Operational Safety Checklist
## Pre-Execution Validation - GREEN LIGHT REQUIREMENTS

**Status**: All critical safety systems implemented ✅  
**Last Updated**: 2025-11-25 (Post Green Light)

---

## 🔒 Critical Safety Systems

### 1. Spot Instance Resilience ✅ IMPLEMENTED

**Problem Identified**: 4-week training run WILL experience Spot interruptions

**Solution Implemented**:
```python
# File: train_musicgen.py:195-213
if LAST_CHECKPOINT.exists():
    checkpoint = torch.load(LAST_CHECKPOINT)
    model.lm.load_state_dict(checkpoint['model_state_dict'])
    optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
    scheduler.load_state_dict(checkpoint['scheduler_state_dict'])
    start_epoch = checkpoint['epoch'] + 1
    global_step = checkpoint['global_step']
    logger.info(f"✅ Resumed from Epoch {start_epoch}")
```

**Checkpoint Strategy**:
- `last.ckpt` saved EVERY epoch (max 1 epoch loss on interruption)
- `best_model.pt` saved when validation loss improves
- Periodic checkpoints every 2 epochs for rollback
- Automatic resume on restart (no manual intervention)

**Validation Test**:
```bash
# Before Day 1, simulate interruption
python3 train_musicgen.py  # Start training
# After 10 minutes, kill process (Ctrl+C)
python3 train_musicgen.py  # Restart
# Should see: "🔄 RESUMING from checkpoint: last.ckpt"
```

**Expected Behavior**:
- Training resumes from last completed epoch
- No data loss
- Total interruption cost: <1 hour ($1.30)

---

### 2. Early Divergence Alerting ✅ IMPLEMENTED

**Problem**: Waiting until Week 5 wastes $350+ if training diverges early

**Solution Implemented**:
```python
# File: train_musicgen.py:268-279
if global_step < 1000:  # First 48 hours
    if torch.isnan(loss) or torch.isinf(loss):
        logger.error("🚨 ALERT: Loss is NaN or Inf!")
        raise RuntimeError("Training diverged")
    
    if loss.item() > 10.0 and global_step > 100:
        logger.warning("⚠️  WARNING: Loss unusually high")
```

**Alert Conditions** (First 48 hours):
| Condition | Severity | Action |
|-----------|----------|--------|
| Loss = NaN/Inf | CRITICAL | Abort immediately |
| Loss > 10.0 | WARNING | Monitor, may need LR reduction |
| Loss increasing | WARNING | Check logs, verify data |

**Manual Check** (Day 2):
```bash
# View loss trend
tail -n 100 training_logs/training.log | grep "Loss:"

# Should see loss DECREASING:
# Epoch 1 | Batch 10  | Loss: 4.567
# Epoch 1 | Batch 20  | Loss: 4.423  ← Decreasing ✓
# Epoch 1 | Batch 30  | Loss: 4.289  ← Good trend ✓
```

**Red Flags** (Abort if seen):
- ❌ Loss stuck at 4.5+ for 500 steps
- ❌ Loss spiking (4.2 → 6.8 → 5.3)
- ❌ NaN/Inf at any point

---

### 3. Log Drum Detector Validation ✅ IMPLEMENTED

**Problem**: Detector could hallucinate log drums in noise (false positives)

**Solution Implemented**:
```python
# File: test_log_drum_detector.py
def test_silence():
    silence = torch.zeros(1, 44100 * 2)
    result = detect_amapiano_log_drums(silence, 44100)
    assert result is None  # Should reject silence

def test_white_noise():
    white_noise = torch.randn(1, 44100 * 2) * 0.1
    result = detect_amapiano_log_drums(white_noise, 44100)
    assert result is None  # Should reject noise

def test_kick_drum():
    # Kick: 60Hz fundamental, 50ms decay (tight)
    # Should be REJECTED (log drum = 300-600ms decay)
    result = detect_amapiano_log_drums(kick_drum, 44100)
    assert result is None  # Should distinguish from log drum
```

**Validation Tests**:
1. ✅ Silence Test - Rejects pure silence
2. ✅ White Noise Test - Rejects random noise
3. ✅ Wrong Frequency Test - Rejects 200Hz (outside 50-150Hz)
4. ✅ Correct Frequency Test - Accepts 100Hz with percussive envelope
5. ✅ Kick Drum Test - Distinguishes tight decay (50ms) from woody decay (300-600ms)

**Pre-Deployment Test** (Required):
```bash
cd ai-service
python3 test_log_drum_detector.py

# Expected output:
# Test 1: Pure Silence
# ✅ PASS: Correctly rejected silence
# 
# Test 2: White Noise
# ✅ PASS: Correctly rejected white noise
# 
# Total: 5/5 tests passed
# 🎉 All tests passed! Detector is robust.
```

**Failure Action**:
- If any test fails → DO NOT PROCEED
- Fix detector thresholds in `main.py:350-420`
- Re-run tests until all pass

---

## 📋 Pre-Flight Checklist

### Day 0: AWS Infrastructure
- [ ] g4dn.xlarge Spot instance requested (us-east-1 region)
- [ ] Spot request max price set to $0.50/hour (vs $1.30 on-demand)
- [ ] Persistent EBS volume attached (500GB, persists across Spot interruptions)
- [ ] Security group: SSH (22), TensorBoard (6006)
- [ ] Billing alarm configured: $600 threshold
- [ ] Email alerts: ALARM_EMAIL set in deploy script

### Day 0: Safety Systems Verification
```bash
# 1. Test GPU availability
nvidia-smi
# Should show: Tesla T4, 16GB VRAM

# 2. Test checkpoint resume
cd ai-service
python3 -c "
import torch
from pathlib import Path
CHECKPOINT_DIR = Path('./checkpoints/phase_2_5')
CHECKPOINT_DIR.mkdir(parents=True, exist_ok=True)
print('✓ Checkpoint directory ready')
"

# 3. Test log drum detector
python3 test_log_drum_detector.py
# Should show: 🎉 All tests passed!

# 4. Test auto-shutdown
sudo systemctl status auto-shutdown
# Should show: active (running)
```

### Day 0: Dataset Validation
```bash
# Verify filtered dataset exists
ls -lh datasets/amapiano_proxy/audio/ | wc -l
# Should show: ~8000 files

# Verify metadata
head datasets/amapiano_proxy/training_metadata.csv
# Should show: clip_id, file_path, amapiano_proxy_score, tags, duration

# Check for broken files
python3 << EOF
import pandas as pd
from pathlib import Path
df = pd.read_csv('datasets/amapiano_proxy/training_metadata.csv')
broken = 0
for idx, row in df.iterrows():
    if not Path('datasets/amapiano_proxy', row['file_path']).exists():
        broken += 1
print(f"Broken files: {broken} / {len(df)}")
# Should show: Broken files: 0 / 7982
EOF
```

### Day 1: Launch Validation
```bash
# Start training
python3 training_orchestrator.py --config config.json

# Expected first 5 minutes output:
# ==================================================
# PHASE 2.5: MagnaTagATune Proxy Training
# ==================================================
# Model: facebook/musicgen-small
# ✅ Resumed from Epoch 0 (if checkpoint exists)
# 🆕 Starting fresh training (if no checkpoint)
# 
# Epoch 1/20 | Batch 10 | Loss: 4.567 | LR: 1.00e-07
# 💾 Saved last.ckpt (Spot resume enabled)
```

**Abort Conditions** (First hour):
- ❌ GPU utilization <50% → Configuration error
- ❌ Loss = NaN/Inf → Divergence
- ❌ OOM errors → Reduce batch size (8 → 4)
- ❌ Checkpoint save fails → Disk full or permissions

---

## 🚨 Operational Alerts

### Alert Level 1: INFORMATIONAL (Green)
**Auto-logged, no action required**
- Loss decreasing normally
- Checkpoints saving successfully
- GPU utilization 80-95%

### Alert Level 2: WARNING (Yellow)
**Monitor closely, prepare to intervene**
- Loss high but decreasing (>5.0 at step 500)
- GPU utilization 50-80%
- Cost approaching $400 before Week 5

**Action**: Daily manual review

### Alert Level 3: CRITICAL (Red)
**Immediate intervention required**
- Loss = NaN/Inf
- Loss not decreasing after 1000 steps
- Cost exceeds $600
- Spot interruptions >3 per day

**Action**: Abort training, review logs, escalate

---

## 💰 Cost Tracking Dashboard

### Real-Time Monitoring
```bash
# Check current cost
python3 << EOF
import json
from pathlib import Path
with open('checkpoints/phase_2_5/orchestrator_state.json', 'r') as f:
    state = json.load(f)
elapsed_hours = state['elapsed_time'] / 3600
cost_per_hour = 0.39  # Spot instance
cost = elapsed_hours * cost_per_hour
print(f"Elapsed: {elapsed_hours:.1f}h")
print(f"Cost: ${cost:.2f}")
print(f"Budget remaining: ${600 - cost:.2f}")
EOF
```

### Cost Projections

| Milestone | Hours | Cost (Spot @ $0.39/h) | Budget % |
|-----------|-------|----------------------|----------|
| Week 1 (Day 7) | 168h | $65.52 | 11% |
| Week 2 (Day 14) | 336h | $131.04 | 22% |
| Week 3 (Day 21) | 504h | $196.56 | 33% |
| Week 4 (Day 28) | 672h | $262.08 | 44% |
| **Week 5 (Day 35)** | **840h** | **$327.60** | **55%** |
| Week 6 (Day 42) | 1008h | $393.12 | 66% |
| Week 7 (Day 49) | 1176h | $458.64 | 76% |
| **Week 8 (Day 56)** | **1344h** | **$524.16** | **87%** |

**Buffer**: $75.84 (13%) for Spot interruptions & overruns

---

## ✅ Final Pre-Execution Sign-Off

**Operator**: _______________________  
**Date**: _______________________

**Checklist**:
- [ ] All safety systems tested and operational
- [ ] Log drum detector validated (5/5 tests passed)
- [ ] Spot instance checkpoint resume tested
- [ ] Early divergence alerting enabled
- [ ] Cost tracking dashboard operational
- [ ] Auto-shutdown configured (2-hour idle)
- [ ] Billing alarms set ($600 threshold)
- [ ] Dataset validated (8000 clips, 0 broken files)
- [ ] GPU verified (Tesla T4, 16GB VRAM)
- [ ] TensorBoard accessible

**Risk Acceptance**:
- [ ] I understand training may fail (NO-GO decision)
- [ ] I understand Spot interruptions will occur
- [ ] I understand cost may reach $600 (budgeted)
- [ ] I have read PHASE_2_5_EXECUTION_PLAYBOOK.md

**Authorization to Execute**:
- [ ] GREEN LIGHT confirmed by technical reviewer
- [ ] Budget approved ($600 maximum)
- [ ] Timeline approved (8 weeks maximum)

**Signature**: _______________________ **Date**: _______________________

---

## 🎯 Success Criteria

**PASS (GO Decision at Week 5)**:
- Authenticity ≥35% (vs 10-20% baseline)
- Cost ≤$600
- Validation loss ≤3.5
- Training stable (no divergence)

**Action**: Continue to Epoch 20, deploy to production

**FAIL (NO-GO Decision at Week 5)**:
- Authenticity <35%
- Cost >$600
- Validation loss >3.5
- Training unstable

**Action**: Abort, generate report, escalate to Phase 3

---

**This document serves as the final operational checklist before executing `./deploy_training.sh`**

**Status**: CLEARED FOR EXECUTION ✅
