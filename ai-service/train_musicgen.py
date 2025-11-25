"""
MusicGen Fine-Tuning Script for Amapiano Proxy Dataset
Trains MusicGen on filtered MagnaTagATune clips to improve Amapiano-style generation
"""

import torch
import torchaudio
from audiocraft.models import MusicGen
from audiocraft.modules.conditioners import ConditioningAttributes
from torch.utils.data import Dataset, DataLoader
import pandas as pd
from pathlib import Path
import logging
from typing import List, Tuple
import json
from datetime import datetime
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
DATASET_DIR = Path("./datasets/amapiano_proxy")
CHECKPOINT_DIR = Path("./checkpoints")
LOGS_DIR = Path("./training_logs")

CHECKPOINT_DIR.mkdir(exist_ok=True)
LOGS_DIR.mkdir(exist_ok=True)

BATCH_SIZE = 8
LEARNING_RATE = 1e-5
NUM_EPOCHS = 20
GRADIENT_ACCUMULATION_STEPS = 4
WARMUP_STEPS = 500
SAVE_EVERY_N_EPOCHS = 2

AMAPIANO_STYLE_PROMPTS = [
    "South African amapiano with deep log drums and soulful piano",
    "Traditional amapiano groove with authentic percussion",
    "Modern amapiano house with jazzy chord progressions",
    "Amapiano beat with characteristic bassline and rhythmic elements",
    "Pretoria-style amapiano with sophisticated harmonies",
    "Deep house amapiano fusion with African rhythms",
]


class AmapianoProxyDataset(Dataset):
    """Dataset for MusicGen fine-tuning on Amapiano proxy clips"""
    
    def __init__(self, metadata_path: Path, audio_dir: Path, sample_rate: int = 32000):
        self.metadata = pd.read_csv(metadata_path)
        self.audio_dir = audio_dir
        self.sample_rate = sample_rate
        
        self.metadata = self.metadata[
            self.metadata['file_path'].apply(
                lambda x: (audio_dir / x).exists()
            )
        ]
        
        logger.info(f"Loaded dataset with {len(self.metadata)} valid clips")
    
    def __len__(self):
        return len(self.metadata)
    
    def __getitem__(self, idx) -> Tuple[torch.Tensor, str]:
        row = self.metadata.iloc[idx]
        
        audio_path = self.audio_dir.parent / row['file_path']
        wav, sr = torchaudio.load(str(audio_path))
        
        if sr != self.sample_rate:
            resampler = torchaudio.transforms.Resample(sr, self.sample_rate)
            wav = resampler(wav)
        
        if wav.shape[0] > 1:
            wav = wav.mean(dim=0, keepdim=True)
        
        tags = row['tags'].split(',')
        amapiano_tags = [tag for tag in tags if tag in {
            'drums', 'piano', 'bass', 'house', 'electronic', 'jazzy', 'deep'
        }]
        
        import random
        base_prompt = random.choice(AMAPIANO_STYLE_PROMPTS)
        if amapiano_tags:
            tag_desc = ', '.join(amapiano_tags[:3])
            prompt = f"{base_prompt}. Elements: {tag_desc}"
        else:
            prompt = base_prompt
        
        return wav, prompt
    
    def collate_fn(self, batch: List[Tuple[torch.Tensor, str]]):
        """Collate function to pad audio tensors to same length"""
        wavs, prompts = zip(*batch)
        
        max_length = max(wav.shape[-1] for wav in wavs)
        
        padded_wavs = []
        for wav in wavs:
            if wav.shape[-1] < max_length:
                padding = max_length - wav.shape[-1]
                wav = torch.nn.functional.pad(wav, (0, padding))
            padded_wavs.append(wav)
        
        wavs_tensor = torch.stack(padded_wavs)
        
        return wavs_tensor, list(prompts)


class TrainingMetrics:
    """Track and log training metrics"""
    
    def __init__(self, log_dir: Path):
        self.log_dir = log_dir
        self.metrics = {
            'epoch': [],
            'batch': [],
            'loss': [],
            'learning_rate': [],
            'timestamp': []
        }
    
    def log(self, epoch: int, batch: int, loss: float, lr: float):
        self.metrics['epoch'].append(epoch)
        self.metrics['batch'].append(batch)
        self.metrics['loss'].append(loss)
        self.metrics['learning_rate'].append(lr)
        self.metrics['timestamp'].append(datetime.now().isoformat())
    
    def save(self):
        metrics_path = self.log_dir / "training_metrics.json"
        with open(metrics_path, 'w') as f:
            json.dump(self.metrics, f, indent=2)
        
        df = pd.DataFrame(self.metrics)
        csv_path = self.log_dir / "training_metrics.csv"
        df.to_csv(csv_path, index=False)
        
        logger.info(f"Saved metrics to {metrics_path}")


def train_musicgen():
    """Main training loop for MusicGen fine-tuning"""
    
    logger.info("="*60)
    logger.info("MusicGen Amapiano Proxy Fine-Tuning")
    logger.info("="*60)
    logger.info(f"Device: {DEVICE}")
    logger.info(f"Batch size: {BATCH_SIZE}")
    logger.info(f"Learning rate: {LEARNING_RATE}")
    logger.info(f"Epochs: {NUM_EPOCHS}")
    logger.info("="*60)
    
    logger.info("\nLoading MusicGen model...")
    model = MusicGen.get_pretrained('facebook/musicgen-small', device=DEVICE)
    sample_rate = model.sample_rate
    
    logger.info("\nLoading dataset...")
    metadata_path = DATASET_DIR / "training_metadata.csv"
    dataset = AmapianoProxyDataset(
        metadata_path=metadata_path,
        audio_dir=DATASET_DIR,
        sample_rate=sample_rate
    )
    
    dataloader = DataLoader(
        dataset,
        batch_size=BATCH_SIZE,
        shuffle=True,
        num_workers=4,
        collate_fn=dataset.collate_fn,
        pin_memory=True
    )
    
    logger.info("\nSetting up optimizer...")
    optimizer = torch.optim.AdamW(
        model.lm.parameters(),
        lr=LEARNING_RATE,
        betas=(0.9, 0.999),
        weight_decay=0.01
    )
    
    scheduler = torch.optim.lr_scheduler.CosineAnnealingWarmRestarts(
        optimizer,
        T_0=len(dataloader) * 2,
        T_mult=2,
        eta_min=1e-7
    )
    
    metrics = TrainingMetrics(LOGS_DIR)
    
    logger.info("\nStarting training...")
    logger.info("="*60)
    
    global_step = 0
    
    for epoch in range(NUM_EPOCHS):
        model.lm.train()
        epoch_loss = 0.0
        
        for batch_idx, (wavs, prompts) in enumerate(dataloader):
            wavs = wavs.to(DEVICE)
            
            try:
                with torch.cuda.amp.autocast():
                    attributes = [
                        ConditioningAttributes(text={'description': prompt})
                        for prompt in prompts
                    ]
                    
                    conditions = model.lm.condition_provider(attributes)
                    
                    codes = model.compression_model.encode(wavs)
                    
                    logits = model.lm.compute_predictions(codes[0], conditions)
                    
                    loss = torch.nn.functional.cross_entropy(
                        logits.reshape(-1, logits.size(-1)),
                        codes[0].reshape(-1)
                    )
                    
                    loss = loss / GRADIENT_ACCUMULATION_STEPS
                
                loss.backward()
                
                if (batch_idx + 1) % GRADIENT_ACCUMULATION_STEPS == 0:
                    torch.nn.utils.clip_grad_norm_(model.lm.parameters(), max_norm=1.0)
                    
                    optimizer.step()
                    scheduler.step()
                    optimizer.zero_grad()
                    
                    global_step += 1
                
                epoch_loss += loss.item() * GRADIENT_ACCUMULATION_STEPS
                
                current_lr = optimizer.param_groups[0]['lr']
                metrics.log(epoch, batch_idx, loss.item(), current_lr)
                
                if batch_idx % 10 == 0:
                    logger.info(
                        f"Epoch {epoch+1}/{NUM_EPOCHS} | "
                        f"Batch {batch_idx}/{len(dataloader)} | "
                        f"Loss: {loss.item():.4f} | "
                        f"LR: {current_lr:.2e}"
                    )
                
            except Exception as e:
                logger.error(f"Error in batch {batch_idx}: {e}")
                continue
        
        avg_epoch_loss = epoch_loss / len(dataloader)
        logger.info(f"\nEpoch {epoch+1} completed - Avg Loss: {avg_epoch_loss:.4f}")
        
        if (epoch + 1) % SAVE_EVERY_N_EPOCHS == 0:
            checkpoint_path = CHECKPOINT_DIR / f"musicgen_amapiano_epoch_{epoch+1}.pt"
            
            torch.save({
                'epoch': epoch + 1,
                'model_state_dict': model.lm.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'scheduler_state_dict': scheduler.state_dict(),
                'loss': avg_epoch_loss,
            }, checkpoint_path)
            
            logger.info(f"Saved checkpoint: {checkpoint_path}")
        
        metrics.save()
    
    logger.info("\n" + "="*60)
    logger.info("Training completed!")
    logger.info("="*60)
    
    final_model_path = CHECKPOINT_DIR / "musicgen_amapiano_final.pt"
    torch.save({
        'model_state_dict': model.lm.state_dict(),
        'training_config': {
            'epochs': NUM_EPOCHS,
            'batch_size': BATCH_SIZE,
            'learning_rate': LEARNING_RATE,
            'dataset_clips': len(dataset),
        }
    }, final_model_path)
    
    logger.info(f"\nFinal model saved to: {final_model_path}")
    logger.info(f"Training logs: {LOGS_DIR}")
    logger.info(f"Checkpoints: {CHECKPOINT_DIR}")
    
    logger.info("\nNext steps:")
    logger.info("1. Test the fine-tuned model with amapiano prompts")
    logger.info("2. Deploy to GPU service and update AI_SERVICE_URL")
    logger.info("3. Validate with AURA-X cultural scoring")


if __name__ == "__main__":
    if not DEVICE == "cuda":
        logger.warning("CUDA not available - training will be very slow on CPU!")
        logger.warning("Recommended: Train on GPU instance (AWS g4dn.xlarge or better)")
    
    train_musicgen()
