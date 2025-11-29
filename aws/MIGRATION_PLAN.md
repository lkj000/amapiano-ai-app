# AWS Migration Plan - Amapiano AI Platform

## Executive Summary

This document outlines the comprehensive migration strategy for deploying the Amapiano AI platform to AWS infrastructure. The migration focuses on leveraging AWS-managed services for scalability, reliability, and cost optimization while maintaining the application's cultural integrity and performance requirements.

## Current Architecture

### Encore Cloud Deployment
- **Frontend**: React + Vite (auto-deployed via Encore Cloud)
- **Backend**: Encore.ts services (auto-deployed to AWS infrastructure)
- **AI Service**: Python-based containerized service (needs dedicated deployment)
- **Database**: PostgreSQL (managed by Encore)
- **Storage**: Object storage for audio files

### Key Components
- MusicGen model (10GB VRAM requirement)
- Essentia.js audio analysis
- Real-time collaboration features
- Cultural validation systems
- Educational framework

## Target AWS Architecture

### Infrastructure Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CloudFront CDN                            │
│                    (Audio/Asset Delivery)                        │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────────┐
│                                                                  │
▼                                                                  ▼
┌─────────────────────────┐                    ┌──────────────────────────┐
│  Application Load       │                    │   S3 Bucket              │
│  Balancer (ALB)         │                    │   - ML Models            │
│  - SSL/TLS              │                    │   - Audio Files          │
│  - Health Checks        │                    │   - Training Data        │
└──────────┬──────────────┘                    │   - User Uploads         │
           │                                    └──────────────────────────┘
           │                                              ▲
           ▼                                              │
┌─────────────────────────┐                              │
│  ECS Fargate Cluster    │                              │
│  ┌───────────────────┐  │                              │
│  │ AI Service        │──┼──────────────────────────────┘
│  │ - FastAPI         │  │
│  │ - MusicGen        │  │
│  │ - Audio Processing│  │
│  └───────────────────┘  │
│  Auto-scaling: 1-10     │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐       ┌──────────────────────────┐
│  RDS PostgreSQL         │       │  Secrets Manager         │
│  - Multi-AZ (prod)      │       │  - DB Credentials        │
│  - Automated Backups    │       │  - API Keys              │
│  - Read Replicas        │       │  - Model Tokens          │
└─────────────────────────┘       └──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CloudWatch                                    │
│  - Logs      - Metrics      - Alarms      - Dashboards          │
└─────────────────────────────────────────────────────────────────┘
```

### Component Mapping

| Current | AWS Service | Justification |
|---------|-------------|---------------|
| AI Service Container | ECS Fargate + GPU | Managed container orchestration, GPU support |
| PostgreSQL | RDS PostgreSQL | Managed database, automated backups, Multi-AZ |
| Object Storage | S3 + CloudFront | Scalable storage, global CDN delivery |
| Encore Backend | Encore Cloud → AWS | Continue using Encore's AWS deployment |
| Frontend | Encore Cloud | Continue using Encore's hosting |
| Model Training | SageMaker (optional) | GPU instances for batch training |
| Secrets | Secrets Manager | Secure credential management |
| Monitoring | CloudWatch | Centralized logging and metrics |

## Migration Phases

### Phase 1: Pre-Migration (Week 1-2)

#### 1.1 Infrastructure Preparation
- [ ] Create AWS account and set up billing alerts
- [ ] Configure AWS CLI and credentials
- [ ] Set up IAM roles and policies
- [ ] Request service quota increases for:
  - ECS tasks with GPU
  - Elastic IPs
  - VPC limits

#### 1.2 Code Preparation
- [ ] Audit AI service dependencies
- [ ] Create Docker image optimization:
  ```dockerfile
  # Multi-stage build for smaller image
  FROM nvidia/cuda:12.1.0-base-ubuntu22.04 as base
  # ... optimized build steps
  ```
- [ ] Add health check endpoints
- [ ] Implement graceful shutdown
- [ ] Add structured logging (CloudWatch compatible)

#### 1.3 Testing Environment Setup
- [ ] Deploy dev environment using Terraform/CloudFormation
- [ ] Test database connectivity
- [ ] Test S3 file operations
- [ ] Validate GPU availability

#### 1.4 Data Assessment
- [ ] Inventory current database size
- [ ] Audit stored audio files
- [ ] Identify models to migrate
- [ ] Calculate storage requirements

**Deliverables:**
- AWS account configured
- Dev environment deployed
- Migration checklist completed

### Phase 2: Database Migration (Week 3)

#### 2.1 Database Setup
```bash
# Create RDS instance
terraform apply -target=aws_db_instance.postgres

# Verify connectivity
psql -h <rds-endpoint> -U amapiano_admin -d amapiano_ai
```

#### 2.2 Schema Migration
```bash
# Export schema from Encore
pg_dump -h <current-host> -U <user> -d amapiano_ai --schema-only > schema.sql

# Import to RDS
psql -h <rds-endpoint> -U amapiano_admin -d amapiano_ai < schema.sql
```

#### 2.3 Data Migration Strategy

**Option A: Dump and Restore (Downtime Required)**
```bash
# Full backup
pg_dump -h <current-host> -U <user> -d amapiano_ai -Fc > backup.dump

# Restore to RDS
pg_restore -h <rds-endpoint> -U amapiano_admin -d amapiano_ai backup.dump
```

**Option B: Continuous Replication (Minimal Downtime)**
```bash
# Set up logical replication
# On source database
CREATE PUBLICATION amapiano_pub FOR ALL TABLES;

# On RDS
CREATE SUBSCRIPTION amapiano_sub 
CONNECTION 'host=<source> dbname=amapiano_ai user=replicator' 
PUBLICATION amapiano_pub;
```

#### 2.4 Verification
- [ ] Row count validation
- [ ] Data integrity checks
- [ ] Performance benchmarking
- [ ] Backup testing

**Estimated Downtime:** 
- Option A: 2-6 hours (depends on data size)
- Option B: 15-30 minutes (cutover window)

### Phase 3: Storage Migration (Week 3-4)

#### 3.1 S3 Bucket Setup
```bash
# Create buckets
terraform apply -target=aws_s3_bucket.models

# Configure lifecycle policies
aws s3api put-bucket-lifecycle-configuration \
  --bucket amapiano-ai-models-prod \
  --lifecycle-configuration file://lifecycle.json
```

#### 3.2 File Migration

**Parallel Upload Script:**
```python
# scripts/migrate_to_s3.py
import boto3
from concurrent.futures import ThreadPoolExecutor

s3 = boto3.client('s3')
bucket = 'amapiano-ai-models-prod'

def upload_file(file_path, s3_key):
    s3.upload_file(file_path, bucket, s3_key)
    print(f"Uploaded: {s3_key}")

# Use ThreadPoolExecutor for parallel uploads
with ThreadPoolExecutor(max_workers=10) as executor:
    executor.map(upload_file, local_files, s3_keys)
```

#### 3.3 CloudFront Distribution
```bash
# Deploy CDN
terraform apply -target=aws_cloudfront_distribution.models

# Update DNS (if custom domain)
aws route53 change-resource-record-sets \
  --hosted-zone-id <zone-id> \
  --change-batch file://dns-update.json
```

#### 3.4 Migration Checklist
- [ ] Upload ML models (MusicGen, Essentia weights)
- [ ] Upload training datasets
- [ ] Migrate user-generated audio files
- [ ] Update application S3 URLs
- [ ] Test CDN delivery
- [ ] Configure CORS policies

**Estimated Time:** 4-8 hours (depends on data volume)

### Phase 4: AI Service Deployment (Week 4-5)

#### 4.1 Container Build and Push
```bash
# Build optimized Docker image
cd ai-service
docker build -t amapiano-ai/ai-service:v1.0 .

# Tag and push to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com

docker tag amapiano-ai/ai-service:v1.0 <ecr-repo-url>:v1.0
docker push <ecr-repo-url>:v1.0
```

#### 4.2 ECS Task Definition
```bash
# Deploy ECS infrastructure
terraform apply -target=aws_ecs_cluster.main
terraform apply -target=aws_ecs_task_definition.ai_service
terraform apply -target=aws_ecs_service.ai_service
```

#### 4.3 Environment Configuration
Update task definition environment variables:
```json
{
  "environment": [
    {"name": "S3_BUCKET", "value": "amapiano-ai-models-prod"},
    {"name": "DB_HOST", "value": "<rds-endpoint>"},
    {"name": "AWS_REGION", "value": "us-east-1"},
    {"name": "CLOUDFRONT_URL", "value": "https://<distribution>.cloudfront.net"}
  ],
  "secrets": [
    {"name": "DB_PASSWORD", "valueFrom": "arn:aws:secretsmanager:..."}
  ]
}
```

#### 4.4 Load Balancer Configuration
```bash
# Test ALB health checks
curl http://<alb-dns>/health

# Expected response
{
  "status": "healthy",
  "model_loaded": true,
  "gpu_available": true
}
```

#### 4.5 Auto-Scaling Setup
```hcl
# Auto-scaling based on CPU and memory
resource "aws_appautoscaling_target" "ai_service" {
  max_capacity       = 10
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.ai_service.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "cpu" {
  name               = "cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ai_service.resource_id
  scalable_dimension = aws_appautoscaling_target.ai_service.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ai_service.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value       = 70.0
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
  }
}
```

### Phase 5: Integration & Testing (Week 5-6)

#### 5.1 Backend Integration
Update Encore backend to use new AI service endpoint:

```typescript
// backend/music/ai-service.ts
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://<alb-dns>';

export const generateMusic = api(
  { method: "POST", path: "/music/generate" },
  async (req: GenerateRequest): Promise<GenerateResponse> => {
    const response = await fetch(`${AI_SERVICE_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });
    return response.json();
  }
);
```

#### 5.2 Testing Checklist

**Functional Tests:**
- [ ] Music generation with all parameters
- [ ] Audio analysis pipeline
- [ ] Cultural validation workflow
- [ ] Real-time collaboration features
- [ ] File upload/download from S3
- [ ] Database CRUD operations
- [ ] Authentication flows

**Performance Tests:**
```bash
# Load test with Apache Bench
ab -n 100 -c 10 -p request.json -T application/json \
  http://<alb-dns>/generate

# Expected: <5s p95 latency for generation requests
```

**Integration Tests:**
- [ ] Frontend → Backend → AI Service flow
- [ ] Database connection pooling
- [ ] S3 presigned URL generation
- [ ] CloudFront asset delivery
- [ ] Error handling and retries

**Security Tests:**
- [ ] IAM role permissions (principle of least privilege)
- [ ] Security group ingress/egress rules
- [ ] Secrets rotation
- [ ] SQL injection prevention
- [ ] XSS protection

#### 5.3 Monitoring Setup
```bash
# Create CloudWatch dashboard
aws cloudwatch put-dashboard \
  --dashboard-name amapiano-ai-prod \
  --dashboard-body file://dashboard.json

# Configure alarms
terraform apply -target=aws_cloudwatch_metric_alarm.ecs_cpu_high
terraform apply -target=aws_cloudwatch_metric_alarm.alb_5xx_errors
```

### Phase 6: Production Cutover (Week 6-7)

#### 6.1 Pre-Cutover Checklist
- [ ] All tests passing
- [ ] Performance benchmarks met
- [ ] Monitoring dashboards operational
- [ ] Backup procedures verified
- [ ] Rollback plan documented
- [ ] Team trained on new infrastructure
- [ ] Incident response plan updated

#### 6.2 Cutover Procedure

**T-24 hours:**
- [ ] Final database sync
- [ ] Freeze production changes
- [ ] Notify users of maintenance window

**T-2 hours:**
- [ ] Enable database replication lag monitoring
- [ ] Prepare rollback scripts
- [ ] Team on standby

**T-0 (Cutover Start):**
```bash
# 1. Stop writes to old database (5 min)
# Set application to read-only mode

# 2. Final database sync (10-15 min)
# Wait for replication lag = 0

# 3. Update DNS/environment variables (5 min)
export AI_SERVICE_URL="http://<new-alb-dns>"
export DATABASE_URL="postgresql://<rds-endpoint>/amapiano_ai"
export S3_BUCKET="amapiano-ai-models-prod"

# 4. Deploy new configuration (10 min)
# Encore backend updates automatically

# 5. Smoke tests (10 min)
./scripts/smoke_tests.sh

# 6. Enable write mode (2 min)
# Remove read-only flag

# 7. Monitor for 2 hours
# Watch metrics, logs, error rates
```

**Total Downtime:** 30-45 minutes

#### 6.3 Post-Cutover Validation
- [ ] All services healthy
- [ ] No 5xx errors
- [ ] Database replication stopped
- [ ] S3 uploads working
- [ ] CDN serving content
- [ ] User login/signup functional
- [ ] Music generation working
- [ ] Real-time features operational

#### 6.4 Rollback Procedure (If Needed)
```bash
# Emergency rollback (execute within 1 hour)
# 1. Revert environment variables
export AI_SERVICE_URL="<old-endpoint>"
export DATABASE_URL="<old-db-url>"

# 2. Re-enable old infrastructure
# 3. Notify users
# 4. Root cause analysis
```

### Phase 7: Post-Migration (Week 7-8)

#### 7.1 Optimization
- [ ] Review CloudWatch metrics
- [ ] Optimize ECS task sizing (CPU/memory)
- [ ] Tune RDS instance class
- [ ] Adjust auto-scaling thresholds
- [ ] Optimize S3 lifecycle policies
- [ ] Review and reduce costs

#### 7.2 Documentation Updates
- [ ] Update architecture diagrams
- [ ] Document runbooks
- [ ] Create incident response guides
- [ ] Update team Wiki
- [ ] Record lessons learned

#### 7.3 Decommissioning Old Infrastructure
- [ ] Archive old database backups
- [ ] Export old logs
- [ ] Terminate old resources
- [ ] Cancel old subscriptions
- [ ] Update billing

## Cost Analysis

### Monthly Cost Estimate (Production)

| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| ECS Fargate (AI Service) | 4 vCPU, 16GB RAM, 2 instances | ~$240 |
| RDS PostgreSQL | db.t3.medium, Multi-AZ | ~$180 |
| S3 Storage | 500GB + requests | ~$25 |
| CloudFront | 1TB data transfer | ~$85 |
| NAT Gateway | 2 AZs | ~$90 |
| Application Load Balancer | - | ~$25 |
| CloudWatch Logs | 50GB/month | ~$30 |
| Data Transfer | Inter-AZ + outbound | ~$50 |
| **Total (without GPU)** | | **~$725/month** |

**GPU Option (g4dn.xlarge EC2):**
- On-Demand: ~$0.526/hour = ~$380/month (24/7)
- Spot Instances: ~$0.158/hour = ~$114/month (70% savings)
- **Recommended:** Use Spot for training, Fargate for inference

**Cost Optimization Strategies:**
1. **Reserved Instances:** 30-60% savings on RDS/EC2 (commit 1-3 years)
2. **S3 Intelligent-Tiering:** Automatic cost optimization
3. **Fargate Spot:** Up to 70% savings for interruptible workloads
4. **CloudFront:** Optimize caching to reduce origin requests
5. **Auto-Scaling:** Scale down during off-peak hours

### Dev/Staging Environment

| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| ECS Fargate | 2 vCPU, 8GB RAM, 1 instance | ~$60 |
| RDS PostgreSQL | db.t3.micro, Single-AZ | ~$25 |
| Other Services | Reduced capacity | ~$50 |
| **Total** | | **~$135/month** |

## Risk Assessment & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Database migration data loss | High | Low | Multiple backups, validation scripts, dry runs |
| Extended downtime during cutover | High | Medium | Rehearse migration, automate steps, have rollback ready |
| GPU availability issues | High | Low | Request quota increase early, test in dev |
| Cost overruns | Medium | Medium | Set billing alarms, use cost explorer, optimize continuously |
| Performance degradation | High | Low | Load testing, gradual traffic shift, monitoring |
| S3 file migration incomplete | Medium | Low | Checksums, verification scripts, parallel uploads |
| Team knowledge gaps | Medium | Medium | Training sessions, documentation, runbooks |
| Vendor lock-in | Low | High | Use Terraform (multi-cloud), document exit strategy |

## Success Criteria

### Technical Metrics
- [ ] 99.9% uptime SLA
- [ ] <3s p95 latency for music generation
- [ ] <500ms p95 latency for API calls
- [ ] Zero data loss during migration
- [ ] <1 hour total downtime
- [ ] Auto-scaling functioning correctly
- [ ] All monitoring alerts operational

### Business Metrics
- [ ] No user complaints about performance
- [ ] Successful generation of 1000+ tracks post-migration
- [ ] Cost within budget (±10%)
- [ ] Team trained and confident
- [ ] Documentation complete

## Timeline Summary

| Week | Phase | Key Activities |
|------|-------|----------------|
| 1-2 | Pre-Migration | Setup, planning, dev environment |
| 3 | Database Migration | Schema + data migration |
| 3-4 | Storage Migration | S3 + CloudFront setup |
| 4-5 | AI Service Deployment | ECS, Docker, auto-scaling |
| 5-6 | Integration & Testing | End-to-end tests, performance tuning |
| 6-7 | Production Cutover | Live migration, validation |
| 7-8 | Post-Migration | Optimization, documentation |

**Total Duration:** 7-8 weeks

## Emergency Contacts

- **AWS Support:** Enterprise plan recommended
- **DBA On-Call:** [Contact]
- **DevOps Lead:** [Contact]
- **Product Owner:** [Contact]

## Appendix

### A. Required IAM Permissions
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecs:*",
        "ec2:*",
        "rds:*",
        "s3:*",
        "cloudformation:*",
        "iam:PassRole"
      ],
      "Resource": "*"
    }
  ]
}
```

### B. Useful Commands
```bash
# Check ECS task status
aws ecs describe-tasks --cluster <cluster> --tasks <task-id>

# View CloudWatch logs
aws logs tail /ecs/amapiano-ai/ai-service --follow

# Database connection test
psql -h <rds-endpoint> -U amapiano_admin -d amapiano_ai -c "SELECT version();"

# S3 sync
aws s3 sync ./local-models/ s3://amapiano-ai-models-prod/models/
```

### C. Rollback Checklist
- [ ] Revert DNS changes
- [ ] Restore old environment variables
- [ ] Re-enable old database (if applicable)
- [ ] Communicate to users
- [ ] Document root cause
- [ ] Schedule post-mortem

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-29  
**Owner:** DevOps Team  
**Review Cycle:** Quarterly
