#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

ENVIRONMENT=${1:-dev}
REGION=${2:-us-east-1}

echo "================================================"
echo "Amapiano AI - AWS Deployment Script"
echo "================================================"
echo "Environment: $ENVIRONMENT"
echo "Region: $REGION"
echo "================================================"

check_prerequisites() {
  echo "Checking prerequisites..."
  
  command -v aws >/dev/null 2>&1 || { echo "AWS CLI not found. Install: https://aws.amazon.com/cli/"; exit 1; }
  command -v docker >/dev/null 2>&1 || { echo "Docker not found. Install: https://www.docker.com/"; exit 1; }
  command -v terraform >/dev/null 2>&1 || { echo "Terraform not found. Install: https://www.terraform.io/"; exit 1; }
  
  aws sts get-caller-identity >/dev/null 2>&1 || { echo "AWS credentials not configured. Run: aws configure"; exit 1; }
  
  echo "✓ All prerequisites met"
}

get_account_id() {
  aws sts get-caller-identity --query Account --output text
}

build_and_push_image() {
  echo "Building and pushing Docker image..."
  
  ACCOUNT_ID=$(get_account_id)
  ECR_REPO="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/amapiano-ai/ai-service"
  
  echo "ECR Repository: $ECR_REPO"
  
  aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_REPO
  
  cd "$PROJECT_ROOT/ai-service"
  
  docker build -t amapiano-ai/ai-service:latest .
  docker tag amapiano-ai/ai-service:latest $ECR_REPO:latest
  docker tag amapiano-ai/ai-service:latest $ECR_REPO:$(date +%Y%m%d-%H%M%S)
  
  docker push $ECR_REPO:latest
  docker push $ECR_REPO:$(date +%Y%m%d-%H%M%S)
  
  echo "✓ Image pushed successfully"
}

deploy_infrastructure() {
  echo "Deploying infrastructure with Terraform..."
  
  cd "$PROJECT_ROOT/aws/terraform"
  
  terraform init
  
  terraform workspace select $ENVIRONMENT 2>/dev/null || terraform workspace new $ENVIRONMENT
  
  terraform plan \
    -var="environment=$ENVIRONMENT" \
    -var="aws_region=$REGION" \
    -out=tfplan
  
  read -p "Apply this plan? (yes/no): " CONFIRM
  if [ "$CONFIRM" = "yes" ]; then
    terraform apply tfplan
    echo "✓ Infrastructure deployed successfully"
  else
    echo "Deployment cancelled"
    exit 0
  fi
}

update_ecs_service() {
  echo "Updating ECS service..."
  
  CLUSTER_NAME="amapiano-ai-cluster-$ENVIRONMENT"
  SERVICE_NAME="amapiano-ai-ai-service-$ENVIRONMENT"
  
  aws ecs update-service \
    --cluster $CLUSTER_NAME \
    --service $SERVICE_NAME \
    --force-new-deployment \
    --region $REGION
  
  echo "Waiting for service to stabilize..."
  aws ecs wait services-stable \
    --cluster $CLUSTER_NAME \
    --services $SERVICE_NAME \
    --region $REGION
  
  echo "✓ ECS service updated successfully"
}

run_smoke_tests() {
  echo "Running smoke tests..."
  
  ALB_DNS=$(aws elbv2 describe-load-balancers \
    --region $REGION \
    --query "LoadBalancers[?contains(LoadBalancerName, 'amapiano-ai-alb-$ENVIRONMENT')].DNSName" \
    --output text)
  
  if [ -z "$ALB_DNS" ]; then
    echo "⚠ Load balancer not found, skipping smoke tests"
    return
  fi
  
  echo "Testing endpoint: http://$ALB_DNS/health"
  
  for i in {1..10}; do
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://$ALB_DNS/health || echo "000")
    if [ "$RESPONSE" = "200" ]; then
      echo "✓ Health check passed"
      return
    fi
    echo "Attempt $i/10: HTTP $RESPONSE, retrying in 10s..."
    sleep 10
  done
  
  echo "⚠ Smoke tests failed, but deployment completed. Check logs manually."
}

show_outputs() {
  echo ""
  echo "================================================"
  echo "Deployment Complete!"
  echo "================================================"
  
  cd "$PROJECT_ROOT/aws/terraform"
  terraform output
  
  echo ""
  echo "Next steps:"
  echo "1. Update Encore backend environment variables"
  echo "2. Run full integration tests"
  echo "3. Monitor CloudWatch dashboards"
  echo "4. Check application logs"
}

main() {
  check_prerequisites
  
  echo ""
  read -p "Build and push Docker image? (yes/no): " BUILD_IMAGE
  if [ "$BUILD_IMAGE" = "yes" ]; then
    build_and_push_image
  fi
  
  echo ""
  deploy_infrastructure
  
  echo ""
  read -p "Update ECS service? (yes/no): " UPDATE_SERVICE
  if [ "$UPDATE_SERVICE" = "yes" ]; then
    update_ecs_service
    run_smoke_tests
  fi
  
  show_outputs
}

main
