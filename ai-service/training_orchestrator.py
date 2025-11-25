"""
MusicGen Training Orchestrator with Go/No-Go Decision System
Manages the complete Phase 2.5 training lifecycle with milestone evaluations
"""

import torch
from torch.utils.tensorboard import SummaryWriter
import pandas as pd
from pathlib import Path
import logging
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
import subprocess
import sys

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class TrainingOrchestrator:
    """
    Orchestrates MagnaTagATune training with milestone-based evaluation
    
    Key Features:
    - Automatic checkpointing
    - TensorBoard metrics logging
    - Week 5 Go/No-Go decision point
    - Cost tracking
    - Performance monitoring
    """
    
    def __init__(self, config_path: Path = None):
        self.config = self.load_config(config_path)
        self.training_start_time = None
        self.total_cost_usd = 0.0
        self.checkpoint_dir = Path(self.config['checkpoint_dir'])
        self.checkpoint_dir.mkdir(parents=True, exist_ok=True)
        
        # TensorBoard writer
        self.writer = SummaryWriter(log_dir=self.config['tensorboard_dir'])
        
        # Training state
        self.current_epoch = 0
        self.global_step = 0
        self.best_val_loss = float('inf')
        self.week_5_metrics = None
        
    def load_config(self, config_path: Path = None) -> Dict:
        """Load training configuration"""
        default_config = {
            'model_name': 'facebook/musicgen-small',
            'dataset_dir': './datasets/amapiano_proxy',
            'checkpoint_dir': './checkpoints/phase_2_5',
            'tensorboard_dir': './runs/phase_2_5',
            'batch_size': 8,
            'learning_rate': 1e-5,
            'num_epochs': 20,
            'gradient_accumulation_steps': 4,
            'warmup_steps': 500,
            'save_every_n_steps': 1000,
            'eval_every_n_steps': 500,
            'gpu_cost_per_hour': 1.30,  # g4dn.xlarge on-demand
            'week_5_threshold_days': 35,
            'go_nogo_thresholds': {
                'min_authenticity_score': 0.35,  # 35% Amapiano authenticity minimum
                'max_cost_usd': 600,  # Abort if exceeding budget
                'max_val_loss': 3.5,  # Validation loss must be improving
            }
        }
        
        if config_path and config_path.exists():
            with open(config_path, 'r') as f:
                custom_config = json.load(f)
            default_config.update(custom_config)
        
        return default_config
    
    def start_training(self):
        """Initialize and start training process"""
        logger.info("="*80)
        logger.info("PHASE 2.5: MagnaTagATune Proxy Training")
        logger.info("="*80)
        logger.info(f"Model: {self.config['model_name']}")
        logger.info(f"Dataset: {self.config['dataset_dir']}")
        logger.info(f"Target epochs: {self.config['num_epochs']}")
        logger.info(f"GPU cost: ${self.config['gpu_cost_per_hour']}/hour")
        logger.info(f"Week 5 checkpoint: Day {self.config['week_5_threshold_days']}")
        logger.info("="*80)
        
        self.training_start_time = time.time()
        
        # Launch training subprocess
        self.run_training_loop()
        
    def run_training_loop(self):
        """Execute main training loop"""
        # This would normally call train_musicgen.py as a subprocess
        # For now, we'll create a monitoring loop
        
        logger.info("Starting training monitoring...")
        
        try:
            # Launch training script
            training_script = Path(__file__).parent / 'train_musicgen.py'
            
            if not training_script.exists():
                logger.error(f"Training script not found: {training_script}")
                return
            
            cmd = [
                sys.executable,
                str(training_script),
                '--config', json.dumps(self.config),
            ]
            
            logger.info(f"Launching: {' '.join(cmd)}")
            
            # Run with real-time output
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1
            )
            
            # Monitor training progress
            for line in process.stdout:
                print(line, end='')
                
                # Parse metrics from output
                self.parse_training_metrics(line)
                
                # Check for Week 5 checkpoint
                self.check_week_5_milestone()
            
            process.wait()
            
            if process.returncode != 0:
                logger.error(f"Training failed with code {process.returncode}")
            else:
                logger.info("Training completed successfully!")
                
        except KeyboardInterrupt:
            logger.warning("Training interrupted by user")
            self.save_checkpoint(interrupted=True)
        except Exception as e:
            logger.error(f"Training error: {e}", exc_info=True)
            self.save_checkpoint(interrupted=True)
    
    def parse_training_metrics(self, log_line: str):
        """Parse metrics from training log output"""
        # Example: "Epoch 5/20 | Step 1500 | Loss: 2.345 | Val Loss: 2.567"
        
        try:
            if 'Step' in log_line and 'Loss' in log_line:
                parts = log_line.split('|')
                
                for part in parts:
                    if 'Epoch' in part:
                        self.current_epoch = int(part.split()[1].split('/')[0])
                    elif 'Step' in part:
                        self.global_step = int(part.split()[1])
                    elif 'Val Loss' in part:
                        val_loss = float(part.split(':')[1].strip())
                        self.writer.add_scalar('Loss/validation', val_loss, self.global_step)
                        
                        if val_loss < self.best_val_loss:
                            self.best_val_loss = val_loss
                            logger.info(f"New best validation loss: {val_loss:.4f}")
        
        except Exception as e:
            pass  # Ignore parsing errors
    
    def check_week_5_milestone(self):
        """Evaluate Week 5 Go/No-Go decision point"""
        if self.week_5_metrics is not None:
            return  # Already evaluated
        
        elapsed_days = (time.time() - self.training_start_time) / 86400
        
        if elapsed_days >= self.config['week_5_threshold_days']:
            logger.info("="*80)
            logger.info("WEEK 5 CHECKPOINT: Go/No-Go DECISION POINT")
            logger.info("="*80)
            
            metrics = self.evaluate_week_5_performance()
            self.week_5_metrics = metrics
            
            decision = self.make_go_nogo_decision(metrics)
            
            if decision == 'GO':
                logger.info("✅ GO DECISION: Continue to full training")
                logger.info("Metrics meet minimum thresholds")
            elif decision == 'NO-GO':
                logger.warning("❌ NO-GO DECISION: Abort training")
                logger.warning("Metrics below threshold - escalate to Phase 3")
                self.abort_training(metrics)
            else:
                logger.warning("⚠️  CONDITIONAL GO: Continue with caution")
                logger.warning("Some metrics borderline - monitor closely")
    
    def evaluate_week_5_performance(self) -> Dict:
        """Run comprehensive Week 5 evaluation"""
        logger.info("Running Week 5 evaluation...")
        
        # Calculate cost
        elapsed_hours = (time.time() - self.training_start_time) / 3600
        cost_so_far = elapsed_hours * self.config['gpu_cost_per_hour']
        
        # Estimate authenticity score (would run actual generation + AURA-X validation)
        # For now, use validation loss as proxy
        estimated_authenticity = max(0.0, 1.0 - (self.best_val_loss / 10.0))
        
        metrics = {
            'elapsed_days': (time.time() - self.training_start_time) / 86400,
            'elapsed_hours': elapsed_hours,
            'cost_usd': cost_so_far,
            'current_epoch': self.current_epoch,
            'best_val_loss': self.best_val_loss,
            'estimated_authenticity': estimated_authenticity,
            'global_step': self.global_step,
        }
        
        logger.info(f"Week 5 Metrics:")
        logger.info(f"  Elapsed: {metrics['elapsed_days']:.1f} days ({metrics['elapsed_hours']:.1f} hours)")
        logger.info(f"  Cost: ${metrics['cost_usd']:.2f}")
        logger.info(f"  Best Val Loss: {metrics['best_val_loss']:.4f}")
        logger.info(f"  Est. Authenticity: {metrics['estimated_authenticity']*100:.1f}%")
        
        # Save metrics
        metrics_path = self.checkpoint_dir / 'week_5_metrics.json'
        with open(metrics_path, 'w') as f:
            json.dump(metrics, f, indent=2)
        
        return metrics
    
    def make_go_nogo_decision(self, metrics: Dict) -> str:
        """Make Go/No-Go decision based on Week 5 metrics"""
        thresholds = self.config['go_nogo_thresholds']
        
        failures = []
        warnings = []
        
        # Check authenticity
        if metrics['estimated_authenticity'] < thresholds['min_authenticity_score']:
            failures.append(
                f"Authenticity {metrics['estimated_authenticity']*100:.1f}% "
                f"< {thresholds['min_authenticity_score']*100:.1f}% threshold"
            )
        elif metrics['estimated_authenticity'] < thresholds['min_authenticity_score'] + 0.05:
            warnings.append("Authenticity borderline")
        
        # Check cost
        if metrics['cost_usd'] > thresholds['max_cost_usd']:
            failures.append(
                f"Cost ${metrics['cost_usd']:.2f} "
                f"> ${thresholds['max_cost_usd']:.2f} budget"
            )
        elif metrics['cost_usd'] > thresholds['max_cost_usd'] * 0.8:
            warnings.append("Cost approaching budget limit")
        
        # Check validation loss
        if metrics['best_val_loss'] > thresholds['max_val_loss']:
            failures.append(
                f"Val loss {metrics['best_val_loss']:.4f} "
                f"> {thresholds['max_val_loss']:.4f} threshold"
            )
        
        # Decision logic
        if failures:
            logger.error("FAILURES:")
            for failure in failures:
                logger.error(f"  - {failure}")
            return 'NO-GO'
        
        if warnings:
            logger.warning("WARNINGS:")
            for warning in warnings:
                logger.warning(f"  - {warning}")
            return 'CONDITIONAL-GO'
        
        logger.info("All metrics PASS ✅")
        return 'GO'
    
    def abort_training(self, metrics: Dict):
        """Abort training and escalate to Phase 3"""
        logger.warning("="*80)
        logger.warning("ABORTING PHASE 2.5 TRAINING")
        logger.warning("="*80)
        
        abort_report = {
            'abort_timestamp': datetime.now().isoformat(),
            'reason': 'Week 5 metrics below threshold',
            'metrics': metrics,
            'recommendation': 'Escalate to Phase 3: Full Amapiano dataset collection',
            'estimated_phase_3_timeline': '7 months',
            'estimated_phase_3_cost': '$85,000 - $185,000'
        }
        
        report_path = self.checkpoint_dir / 'abort_report.json'
        with open(report_path, 'w') as f:
            json.dump(abort_report, f, indent=2)
        
        logger.warning(f"Abort report saved: {report_path}")
        logger.warning("Next steps:")
        logger.warning("1. Review abort_report.json")
        logger.warning("2. Initiate Phase 3 dataset collection")
        logger.warning("3. Budget approval for full training")
        
        sys.exit(1)
    
    def save_checkpoint(self, interrupted: bool = False):
        """Save training checkpoint"""
        checkpoint = {
            'timestamp': datetime.now().isoformat(),
            'current_epoch': self.current_epoch,
            'global_step': self.global_step,
            'best_val_loss': self.best_val_loss,
            'elapsed_time': time.time() - self.training_start_time if self.training_start_time else 0,
            'interrupted': interrupted,
            'week_5_metrics': self.week_5_metrics,
        }
        
        checkpoint_path = self.checkpoint_dir / 'orchestrator_state.json'
        with open(checkpoint_path, 'w') as f:
            json.dump(checkpoint, f, indent=2)
        
        logger.info(f"Checkpoint saved: {checkpoint_path}")


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='MusicGen Training Orchestrator')
    parser.add_argument('--config', type=Path, help='Path to config JSON')
    parser.add_argument('--resume', action='store_true', help='Resume from checkpoint')
    args = parser.parse_args()
    
    orchestrator = TrainingOrchestrator(config_path=args.config)
    orchestrator.start_training()


if __name__ == '__main__':
    main()
