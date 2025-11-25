"""
MagnaTagATune Dataset Setup and Filtering for Amapiano Proxy Training
Downloads and filters the MagnaTagATune dataset to create an Amapiano-relevant subset
"""

import pandas as pd
import urllib.request
import zipfile
from pathlib import Path
import logging
from typing import Set, List
import shutil

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MAGNATAGATUNE_URL = "https://mirg.city.ac.uk/datasets/magnatagatune/mp3.zip.001"
ANNOTATIONS_URL = "https://mirg.city.ac.uk/datasets/magnatagatune/annotations_final.csv"
DATASET_DIR = Path("./datasets/magnatagatune")
OUTPUT_DIR = Path("./datasets/amapiano_proxy")

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


def download_dataset():
    """Download MagnaTagATune dataset"""
    DATASET_DIR.mkdir(parents=True, exist_ok=True)
    
    logger.info("Downloading MagnaTagATune annotations...")
    annotations_path = DATASET_DIR / "annotations_final.csv"
    
    if not annotations_path.exists():
        urllib.request.urlretrieve(ANNOTATIONS_URL, str(annotations_path))
        logger.info(f"Downloaded annotations to {annotations_path}")
    else:
        logger.info("Annotations already downloaded")
    
    logger.info("""
    Note: MagnaTagATune audio files are distributed as multi-part ZIP archives.
    Please manually download all parts from:
    https://mirg.city.ac.uk/codeapps/the-magnatagatune-dataset
    
    Files needed:
    - mp3.zip.001 through mp3.zip.003
    - Then extract them to {DATASET_DIR}/mp3/
    """)
    
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
    """Create training subset by copying filtered audio files"""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    audio_dir = OUTPUT_DIR / "audio"
    audio_dir.mkdir(exist_ok=True)
    
    metadata_rows = []
    copied_count = 0
    
    for idx, row in filtered_df.iterrows():
        clip_id = row.get('clip_id', idx)
        
        mp3_path = row.get('mp3_path', f"{clip_id}.mp3")
        source_file = audio_source_dir / mp3_path
        
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
            
            if copied_count % 500 == 0:
                logger.info(f"Copied {copied_count}/{len(filtered_df)} clips...")
        else:
            logger.warning(f"Source file not found: {source_file}")
    
    metadata_df = pd.DataFrame(metadata_rows)
    metadata_path = OUTPUT_DIR / "training_metadata.csv"
    metadata_df.to_csv(metadata_path, index=False)
    
    logger.info(f"Created training subset:")
    logger.info(f"  - {copied_count} audio files in {audio_dir}")
    logger.info(f"  - Metadata saved to {metadata_path}")
    logger.info(f"  - Estimated total duration: {copied_count * 29 / 3600:.1f} hours")
    
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
        logger.error(f"""
        Audio source directory not found: {audio_source_dir}
        
        Please download and extract MagnaTagATune audio files:
        1. Download mp3.zip.001, mp3.zip.002, mp3.zip.003 from:
           https://mirg.city.ac.uk/codeapps/the-magnatagatune-dataset
        2. Combine and extract: cat mp3.zip.* > mp3.zip && unzip mp3.zip
        3. Move extracted files to: {audio_source_dir}
        """)
        return
    
    metadata_path = create_training_subset(filtered_df, audio_source_dir)
    
    generate_training_stats(metadata_path)
    
    logger.info("\nDataset setup complete!")
    logger.info(f"Training metadata: {metadata_path}")
    logger.info(f"Next step: Run train_musicgen.py to fine-tune MusicGen")


if __name__ == "__main__":
    main()
