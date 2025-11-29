#!/bin/bash

set -e

SOURCE_DIR=${1}
S3_BUCKET=${2}
REGION=${3:-us-east-1}

echo "================================================"
echo "S3 Migration Script"
echo "================================================"
echo "Source Directory: $SOURCE_DIR"
echo "S3 Bucket: $S3_BUCKET"
echo "Region: $REGION"
echo "================================================"

check_prerequisites() {
  echo "Checking prerequisites..."
  
  command -v aws >/dev/null 2>&1 || { echo "AWS CLI not found."; exit 1; }
  
  if [ ! -d "$SOURCE_DIR" ]; then
    echo "Source directory does not exist: $SOURCE_DIR"
    exit 1
  fi
  
  aws s3 ls s3://$S3_BUCKET >/dev/null 2>&1 || { echo "S3 bucket not accessible: $S3_BUCKET"; exit 1; }
  
  echo "✓ All prerequisites met"
}

calculate_size() {
  echo "Calculating source directory size..."
  
  SIZE=$(du -sh $SOURCE_DIR | cut -f1)
  FILE_COUNT=$(find $SOURCE_DIR -type f | wc -l)
  
  echo "  Total size: $SIZE"
  echo "  File count: $FILE_COUNT"
}

sync_to_s3() {
  echo "Syncing files to S3..."
  
  aws s3 sync \
    $SOURCE_DIR \
    s3://$S3_BUCKET/ \
    --region $REGION \
    --storage-class INTELLIGENT_TIERING \
    --metadata-directive COPY \
    --no-progress
  
  if [ $? -eq 0 ]; then
    echo "✓ Sync completed successfully"
  else
    echo "✗ Sync failed"
    exit 1
  fi
}

verify_sync() {
  echo "Verifying sync..."
  
  LOCAL_COUNT=$(find $SOURCE_DIR -type f | wc -l)
  S3_COUNT=$(aws s3 ls s3://$S3_BUCKET/ --recursive --region $REGION | wc -l)
  
  echo "  Local files: $LOCAL_COUNT"
  echo "  S3 objects: $S3_COUNT"
  
  if [ $LOCAL_COUNT -eq $S3_COUNT ]; then
    echo "✓ File counts match"
  else
    echo "⚠ File counts differ - manual verification recommended"
  fi
}

main() {
  if [ -z "$SOURCE_DIR" ] || [ -z "$S3_BUCKET" ]; then
    echo "Usage: $0 <source-directory> <s3-bucket> [region]"
    echo ""
    echo "Example:"
    echo "  $0 /path/to/models amapiano-ai-models-prod us-east-1"
    exit 1
  fi
  
  check_prerequisites
  
  echo ""
  calculate_size
  
  echo ""
  read -p "Proceed with sync? (yes/no): " CONFIRM
  if [ "$CONFIRM" != "yes" ]; then
    echo "Sync cancelled"
    exit 0
  fi
  
  echo ""
  sync_to_s3
  
  echo ""
  verify_sync
  
  echo ""
  echo "================================================"
  echo "S3 Migration Complete!"
  echo "================================================"
}

main
