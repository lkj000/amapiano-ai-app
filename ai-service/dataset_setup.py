"""
MagnaTagATune Dataset Setup and Filtering for Amapiano Proxy Training
Downloads and filters the MagnaTagATune dataset to create an Amapiano-relevant subset
"""

import pandas as pd
import urllib.request
import zipfile
from pathlib import Path
import logging
from typing import Set, List, Dict
import shutil
import json
import hashlib
from tqdm import tqdm
import time
import subprocess
import os

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

MAGNATAGATUNE_ZIP_URL = "https://huggingface.co/datasets/confit/magnatagatune/resolve/main/mp3.zip"
ANNOTATIONS_URL = "https://mirg.city.ac.uk/datasets/magnatagatune/annotations_final.csv"
DATASET_DIR = Path("./datasets/magnatagatune")
OUTPUT_DIR = Path("./datasets/amapiano_proxy")
CHECKPOINT_FILE = DATASET_DIR / "download_checkpoint.json"

AMAPIANO_PROXY_TAGS = {
    'drums', 'percussion', 'beats', 'techno', 'electronic',
    'piano', 'keyboard', 'jazzy', 'chords', 'jazz',
    'bass', 'bassline', 'deep',
    'house', 'dance', 'groove',
    'chill', 'mellow', 'soulful', 'soft',
    'instrumental', 'ambient'
}

MIN_TAGS_MATCH = 3
TARGET_CLIPS = 8000


def download_with_progress(url: str, dest_path: Path, desc: str):
    """Download file with progress bar"""
    response = urllib.request.urlopen(url)
    total_size = int(response.headers.get('content-length', 0))
    
    block_size = 8192
    progress_bar = tqdm(total=total_size, unit='B', unit_scale=True, desc=desc)
    
    with open(dest_path, 'wb') as f:
        while True:
            buffer = response.read(block_size)
            if not buffer:
                break
            f.write(buffer)
            progress_bar.update(len(buffer))
    
    progress_bar.close()
    logger.info(f"Downloaded: {dest_path}")


def verify_file_checksum(file_path: Path, expected_md5: str = None) -> bool:
    """Verify file integrity via MD5 checksum"""
    if not expected_md5:
        return True
    
    md5_hash = hashlib.md5()
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b""):
            md5_hash.update(chunk)
    
    actual_md5 = md5_hash.hexdigest()
    return actual_md5 == expected_md5


def save_checkpoint(stage: str, data: Dict):
    """Save checkpoint for resume capability"""
    checkpoint = {
        'stage': stage,
        'timestamp': time.time(),
        'data': data
    }
    with open(CHECKPOINT_FILE, 'w') as f:
        json.dump(checkpoint, f, indent=2)
    logger.info(f"Checkpoint saved: {stage}")


def load_checkpoint() -> Dict:
    """Load checkpoint if exists"""
    if CHECKPOINT_FILE.exists():
        with open(CHECKPOINT_FILE, 'r') as f:
            checkpoint = json.load(f)
        logger.info(f"Loaded checkpoint: {checkpoint['stage']}")
        return checkpoint
    return None


def download_dataset():
    """Download MagnaTagATune dataset with checkpointing"""
    DATASET_DIR.mkdir(parents=True, exist_ok=True)
    
    checkpoint = load_checkpoint()
    
    # Download annotations
    logger.info("Downloading MagnaTagATune annotations...")
    annotations_path = DATASET_DIR / "annotations_final.csv"
    
    if not annotations_path.exists():
        download_with_progress(
            ANNOTATIONS_URL, 
            annotations_path,
            "Annotations CSV"
        )
        save_checkpoint('annotations_downloaded', {'path': str(annotations_path)})
    else:
        logger.info("Annotations already downloaded")
    
    # Download and extract MP3 files from HuggingFace
    mp3_dir = DATASET_DIR / "mp3"
    zip_path = DATASET_DIR / "mp3.zip"
    
    if not mp3_dir.exists() or not any(mp3_dir.glob("*.mp3")):
        logger.info("Downloading MagnaTagATune MP3 files from HuggingFace...")
        logger.info("This is a ~2.9GB download, please be patient...")
        
        if not zip_path.exists():
            try:
                # Use wget for better progress display
                subprocess.run([
                    "wget",
                    MAGNATAGATUNE_ZIP_URL,
                    "-O", str(zip_path)
                ], check=True)
                logger.info(f"Download complete: {zip_path}")
            except subprocess.CalledProcessError:
                logger.warning("wget failed, trying urllib...")
                download_with_progress(
                    MAGNATAGATUNE_ZIP_URL,
                    zip_path,
                    "MP3 Archive"
                )
        
        # Extract
        logger.info("Extracting MP3 files...")
        mp3_dir.mkdir(parents=True, exist_ok=True)
        
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(mp3_dir)
        
        # Verify extraction
        mp3_files = list(mp3_dir.rglob("*.mp3"))
        logger.info(f"✓ Extracted {len(mp3_files)} MP3 files")
        
        if len(mp3_files) < 20000:
            logger.warning(f"Expected ~25,863 files, found {len(mp3_files)}")
        
        # Cleanup zip file
        logger.info("Cleaning up ZIP file...")
        zip_path.unlink()
        
        save_checkpoint('audio_downloaded', {
            'mp3_count': len(mp3_files),
            'mp3_dir': str(mp3_dir)
        })
    else:
        mp3_count = len(list(mp3_dir.rglob("*.mp3")))
        logger.info(f"MP3 files already downloaded ({mp3_count} files)")
    
    return annotations_path


def load_annotations(annotations_path: Path) -> pd.DataFrame:
    """Load and parse MagnaTagATune annotations"""
    logger.info(f"Loading annotations from {annotations_path}")
    
    df = pd.read_csv(annotations_path, sep='\t')
    
    logger.info(f"Loaded {len(df)} clips with {len(df.columns)} tag columns")
    
    return df


def filter_amapiano_proxy_clips(df: pd.DataFrame) -> pd.DataFrame:
    """Filter clips that match Amapiano proxy characteristics"""
    
    tag_columns = [col for col in df.columns if col not in ['clip_id', 'mp3_path']]
    
    def count_matching_tags(row):
        matching = 0
        for tag in tag_columns:
            if tag.lower() in AMAPIANO_PROXY_TAGS and row[tag] == 1:
                matching += 1
        return matching
    
    df['amapiano_proxy_score'] = df.apply(count_matching_tags, axis=1)
    
    filtered = df[df['amapiano_proxy_score'] >= MIN_TAGS_MATCH].copy()
    
    filtered = filtered.sort_values('amapiano_proxy_score', ascending=False)
    
    logger.info(f"Filtered to {len(filtered)} clips with ≥{MIN_TAGS_MATCH} Amapiano proxy tags")
    logger.info(f"Score distribution:\n{filtered['amapiano_proxy_score'].value_counts().sort_index(ascending=False)}")
    
    if len(filtered) > TARGET_CLIPS:
        filtered = filtered.head(TARGET_CLIPS)
        logger.info(f"Limited to top {TARGET_CLIPS} clips by proxy score")
    
    return filtered


def create_training_subset(filtered_df: pd.DataFrame, audio_source_dir: Path):
    """Create training subset by copying filtered audio files with progress tracking"""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    audio_dir = OUTPUT_DIR / "audio"
    audio_dir.mkdir(exist_ok=True)
    
    # Build file lookup map for faster searching
    all_mp3s = {f.name: f for f in audio_source_dir.rglob("*.mp3")}
    logger.info(f"Built lookup map for {len(all_mp3s)} MP3 files")
    
    metadata_rows = []
    copied_count = 0
    skipped_count = 0
    
    logger.info(f"Copying {len(filtered_df)} audio files...")
    
    for idx, row in tqdm(filtered_df.iterrows(), total=len(filtered_df), desc="Copying audio"):
        clip_id = row.get('clip_id', idx)
        
        mp3_path = row.get('mp3_path', f"{clip_id}.mp3")
        mp3_filename = Path(mp3_path).name
        
        # Try direct path first, then lookup map
        source_file = audio_source_dir / mp3_path
        if not source_file.exists() and mp3_filename in all_mp3s:
            source_file = all_mp3s[mp3_filename]
        
        if source_file.exists():
            dest_file = audio_dir / f"{clip_id}.mp3"
            shutil.copy2(source_file, dest_file)
            
            tag_list = [col for col in filtered_df.columns 
                       if col not in ['clip_id', 'mp3_path', 'amapiano_proxy_score'] 
                       and row[col] == 1]
            
            metadata_rows.append({
                'clip_id': clip_id,
                'file_path': str(dest_file.relative_to(OUTPUT_DIR)),
                'amapiano_proxy_score': row['amapiano_proxy_score'],
                'tags': ','.join(tag_list),
                'duration': 29.0
            })
            
            copied_count += 1
        else:
            skipped_count += 1
            if skipped_count <= 10:  # Only log first 10 missing files
                logger.warning(f"Source file not found: {source_file}")
    
    metadata_df = pd.DataFrame(metadata_rows)
    metadata_path = OUTPUT_DIR / "training_metadata.csv"
    metadata_df.to_csv(metadata_path, index=False)
    
    logger.info(f"\nCreated training subset:")
    logger.info(f"  - {copied_count} audio files copied")
    logger.info(f"  - {skipped_count} files skipped (not found)")
    logger.info(f"  - Metadata saved to {metadata_path}")
    logger.info(f"  - Estimated total duration: {copied_count * 29 / 3600:.1f} hours")
    logger.info(f"  - Average file size: ~1.2 MB (MP3 @ 128kbps)")
    logger.info(f"  - Total dataset size: ~{copied_count * 1.2 / 1024:.1f} GB")
    
    save_checkpoint('subset_created', {
        'clips_copied': copied_count,
        'clips_skipped': skipped_count,
        'metadata_path': str(metadata_path)
    })
    
    return metadata_path


def generate_training_stats(metadata_path: Path):
    """Generate statistics about the training dataset"""
    df = pd.read_csv(metadata_path)
    
    logger.info("\n" + "="*60)
    logger.info("AMAPIANO PROXY TRAINING DATASET STATISTICS")
    logger.info("="*60)
    logger.info(f"Total clips: {len(df)}")
    logger.info(f"Estimated duration: {len(df) * 29 / 3600:.1f} hours")
    logger.info(f"\nProxy score distribution:")
    logger.info(df['amapiano_proxy_score'].value_counts().sort_index(ascending=False))
    
    all_tags = []
    for tags_str in df['tags']:
        all_tags.extend(tags_str.split(','))
    
    from collections import Counter
    tag_counts = Counter(all_tags)
    
    logger.info(f"\nTop 20 most common tags:")
    for tag, count in tag_counts.most_common(20):
        logger.info(f"  {tag}: {count} ({count/len(df)*100:.1f}%)")
    
    logger.info("="*60 + "\n")


def main():
    """Main execution flow"""
    logger.info("MagnaTagATune Dataset Setup for Amapiano Proxy Training")
    logger.info("="*60)
    
    annotations_path = download_dataset()
    
    df = load_annotations(annotations_path)
    
    filtered_df = filter_amapiano_proxy_clips(df)
    
    audio_source_dir = DATASET_DIR / "mp3"
    if not audio_source_dir.exists():
        logger.error(f"Audio source directory not found: {audio_source_dir}")
        logger.error("Run download_dataset() first to fetch the dataset")
        return
    
    mp3_count = len(list(audio_source_dir.rglob("*.mp3")))
    if mp3_count == 0:
        logger.error("No MP3 files found in audio source directory!")
        logger.error("The download may have failed. Try deleting the mp3/ folder and re-running.")
        return
    
    logger.info(f"Found {mp3_count} MP3 files for processing")
    
    # Flatten directory structure if needed (HuggingFace zip may have subdirs)
    mp3_files = list(audio_source_dir.rglob("*.mp3"))
    if mp3_files:
        logger.info(f"Found {len(mp3_files)} MP3 files in {audio_source_dir}")
    
    metadata_path = create_training_subset(filtered_df, audio_source_dir)
    
    generate_training_stats(metadata_path)
    
    logger.info("\nDataset setup complete!")
    logger.info(f"Training metadata: {metadata_path}")
    logger.info(f"Next step: Run train_musicgen.py to fine-tune MusicGen")


if __name__ == "__main__":
    main()
