#!/bin/bash

set -e

ENVIRONMENT=${1:-dev}
REGION=${2:-us-east-1}
ROLLBACK_VERSION=${3}

echo "================================================"
echo "ROLLBACK SCRIPT - USE WITH CAUTION"
echo "================================================"
echo "Environment: $ENVIRONMENT"
echo "Region: $REGION"
echo "Version: ${ROLLBACK_VERSION:-latest-1}"
echo "================================================"

confirm_rollback() {
  echo ""
  echo "⚠️  WARNING: This will rollback the deployment"
  echo ""
  read -p "Type 'ROLLBACK' to confirm: " CONFIRM
  
  if [ "$CONFIRM" != "ROLLBACK" ]; then
    echo "Rollback cancelled"
    exit 0
  fi
}

get_previous_task_definition() {
  local FAMILY="amapiano-ai-ai-service-$ENVIRONMENT"
  
  echo "Fetching previous task definition..."
  
  if [ -z "$ROLLBACK_VERSION" ]; then
    TASK_DEF_ARN=$(aws ecs list-task-definitions \
      --family-prefix $FAMILY \
      --region $REGION \
      --sort DESC \
      --query "taskDefinitionArns[1]" \
      --output text)
  else
    TASK_DEF_ARN=$(aws ecs list-task-definitions \
      --family-prefix $FAMILY \
      --region $REGION \
      --query "taskDefinitionArns[?contains(@, ':$ROLLBACK_VERSION')]" \
      --output text)
  fi
  
  echo "Previous task definition: $TASK_DEF_ARN"
  echo $TASK_DEF_ARN
}

rollback_ecs_service() {
  local TASK_DEF_ARN=$1
  
  echo "Rolling back ECS service..."
  
  CLUSTER="amapiano-ai-cluster-$ENVIRONMENT"
  SERVICE="amapiano-ai-ai-service-$ENVIRONMENT"
  
  aws ecs update-service \
    --cluster $CLUSTER \
    --service $SERVICE \
    --task-definition $TASK_DEF_ARN \
    --force-new-deployment \
    --region $REGION
  
  echo "Waiting for service to stabilize..."
  aws ecs wait services-stable \
    --cluster $CLUSTER \
    --services $SERVICE \
    --region $REGION
  
  echo "✓ Rollback complete"
}

notify_team() {
  echo ""
  echo "================================================"
  echo "ROLLBACK NOTIFICATION"
  echo "================================================"
  echo "Environment: $ENVIRONMENT was rolled back"
  echo "Time: $(date)"
  echo "User: $(whoami)"
  echo ""
  echo "⚠️  IMPORTANT: Investigate root cause immediately"
  echo "================================================"
}

main() {
  if [ -z "$ENVIRONMENT" ]; then
    echo "Usage: $0 <environment> [region] [version]"
    echo ""
    echo "Example:"
    echo "  $0 prod us-east-1"
    echo "  $0 prod us-east-1 42"
    exit 1
  fi
  
  confirm_rollback
  
  TASK_DEF_ARN=$(get_previous_task_definition)
  
  if [ -z "$TASK_DEF_ARN" ]; then
    echo "✗ No previous task definition found"
    exit 1
  fi
  
  rollback_ecs_service $TASK_DEF_ARN
  
  notify_team
}

main
