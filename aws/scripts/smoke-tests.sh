#!/bin/bash

set -e

ENVIRONMENT=${1:-dev}
REGION=${2:-us-east-1}

echo "================================================"
echo "Smoke Tests"
echo "================================================"
echo "Environment: $ENVIRONMENT"
echo "Region: $REGION"
echo "================================================"

get_alb_dns() {
  aws elbv2 describe-load-balancers \
    --region $REGION \
    --query "LoadBalancers[?contains(LoadBalancerName, 'amapiano-ai-alb-$ENVIRONMENT')].DNSName" \
    --output text
}

test_health_endpoint() {
  local URL=$1
  
  echo "Testing health endpoint..."
  echo "URL: $URL/health"
  
  RESPONSE=$(curl -s -w "\n%{http_code}" $URL/health)
  HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
  BODY=$(echo "$RESPONSE" | head -n -1)
  
  echo "HTTP Code: $HTTP_CODE"
  echo "Response: $BODY"
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ Health check passed"
    return 0
  else
    echo "✗ Health check failed"
    return 1
  fi
}

test_database_connectivity() {
  local DB_HOST=$1
  local DB_NAME=${2:-amapiano_ai}
  local DB_USER=${3:-amapiano_admin}
  
  echo "Testing database connectivity..."
  echo "Host: $DB_HOST"
  
  PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1;" >/dev/null 2>&1
  
  if [ $? -eq 0 ]; then
    echo "✓ Database connection successful"
    return 0
  else
    echo "✗ Database connection failed"
    return 1
  fi
}

test_s3_access() {
  local BUCKET=$1
  
  echo "Testing S3 access..."
  echo "Bucket: $BUCKET"
  
  aws s3 ls s3://$BUCKET/ --region $REGION >/dev/null 2>&1
  
  if [ $? -eq 0 ]; then
    echo "✓ S3 access successful"
    return 0
  else
    echo "✗ S3 access failed"
    return 1
  fi
}

test_ecs_service() {
  local CLUSTER=$1
  local SERVICE=$2
  
  echo "Testing ECS service..."
  echo "Cluster: $CLUSTER"
  echo "Service: $SERVICE"
  
  RUNNING_COUNT=$(aws ecs describe-services \
    --cluster $CLUSTER \
    --services $SERVICE \
    --region $REGION \
    --query "services[0].runningCount" \
    --output text)
  
  DESIRED_COUNT=$(aws ecs describe-services \
    --cluster $CLUSTER \
    --services $SERVICE \
    --region $REGION \
    --query "services[0].desiredCount" \
    --output text)
  
  echo "Running: $RUNNING_COUNT"
  echo "Desired: $DESIRED_COUNT"
  
  if [ "$RUNNING_COUNT" = "$DESIRED_COUNT" ] && [ "$RUNNING_COUNT" != "0" ]; then
    echo "✓ ECS service healthy"
    return 0
  else
    echo "✗ ECS service unhealthy"
    return 1
  fi
}

main() {
  PASSED=0
  FAILED=0
  
  ALB_DNS=$(get_alb_dns)
  
  if [ -z "$ALB_DNS" ]; then
    echo "⚠ Load balancer not found"
    exit 1
  fi
  
  echo ""
  if test_health_endpoint "http://$ALB_DNS"; then
    ((PASSED++))
  else
    ((FAILED++))
  fi
  
  echo ""
  DB_HOST=$(aws rds describe-db-instances \
    --region $REGION \
    --query "DBInstances[?DBInstanceIdentifier=='amapiano-ai-db-$ENVIRONMENT'].Endpoint.Address" \
    --output text)
  
  if [ ! -z "$DB_HOST" ] && [ ! -z "$DB_PASSWORD" ]; then
    if test_database_connectivity $DB_HOST; then
      ((PASSED++))
    else
      ((FAILED++))
    fi
  else
    echo "⚠ Skipping database test (credentials not provided)"
  fi
  
  echo ""
  S3_BUCKET=$(aws s3api list-buckets \
    --query "Buckets[?contains(Name, 'amapiano-ai-models-$ENVIRONMENT')].Name" \
    --output text)
  
  if [ ! -z "$S3_BUCKET" ]; then
    if test_s3_access $S3_BUCKET; then
      ((PASSED++))
    else
      ((FAILED++))
    fi
  else
    echo "⚠ Skipping S3 test (bucket not found)"
  fi
  
  echo ""
  CLUSTER="amapiano-ai-cluster-$ENVIRONMENT"
  SERVICE="amapiano-ai-ai-service-$ENVIRONMENT"
  
  if test_ecs_service $CLUSTER $SERVICE; then
    ((PASSED++))
  else
    ((FAILED++))
  fi
  
  echo ""
  echo "================================================"
  echo "Smoke Tests Complete"
  echo "================================================"
  echo "Passed: $PASSED"
  echo "Failed: $FAILED"
  echo "================================================"
  
  if [ $FAILED -eq 0 ]; then
    echo "✓ All tests passed"
    exit 0
  else
    echo "✗ Some tests failed"
    exit 1
  fi
}

main
