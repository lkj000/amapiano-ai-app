# AWS Deployment Guide - Amapiano AI

This directory contains Infrastructure as Code (IaC) configurations and deployment scripts for deploying the Amapiano AI platform to AWS.

## Directory Structure

```
aws/
├── terraform/              # Terraform configuration files
│   ├── main.tf
│   ├── variables.tf
│   ├── vpc.tf
│   ├── rds.tf
│   ├── s3.tf
│   ├── ecs.tf
│   ├── sagemaker.tf
│   ├── monitoring.tf
│   ├── secrets.tf
│   └── outputs.tf
├── cloudformation/         # CloudFormation templates
│   └── infrastructure.yaml
├── scripts/               # Deployment and migration scripts
│   ├── deploy.sh
│   ├── migrate-database.sh
│   ├── migrate-s3.sh
│   ├── smoke-tests.sh
│   └── rollback.sh
├── MIGRATION_PLAN.md     # Detailed migration strategy
└── README.md             # This file
```

## Quick Start

### Prerequisites

1. **AWS CLI**
   ```bash
   # Install AWS CLI v2
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install
   
   # Configure credentials
   aws configure
   ```

2. **Terraform** (Option 1)
   ```bash
   # Install Terraform
   wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
   unzip terraform_1.6.0_linux_amd64.zip
   sudo mv terraform /usr/local/bin/
   ```

3. **Docker**
   ```bash
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   ```

4. **PostgreSQL Client Tools**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install postgresql-client
   
   # macOS
   brew install postgresql
   ```

### Option 1: Deploy with Terraform (Recommended)

1. **Initialize Configuration**
   ```bash
   cd terraform/
   cp terraform.tfvars.example terraform.tfvars
   
   # Edit terraform.tfvars with your values
   vim terraform.tfvars
   ```

2. **Initialize Terraform**
   ```bash
   terraform init
   ```

3. **Plan Deployment**
   ```bash
   terraform plan -var-file=terraform.tfvars
   ```

4. **Apply Configuration**
   ```bash
   terraform apply -var-file=terraform.tfvars
   ```

5. **Get Outputs**
   ```bash
   terraform output
   ```

### Option 2: Deploy with CloudFormation

1. **Prepare Parameters**
   ```bash
   cd cloudformation/
   cp parameters.json.example parameters.json
   
   # Edit parameters.json
   vim parameters.json
   ```

2. **Deploy Stack**
   ```bash
   aws cloudformation create-stack \
     --stack-name amapiano-ai-dev \
     --template-body file://infrastructure.yaml \
     --parameters file://parameters.json \
     --capabilities CAPABILITY_IAM
   ```

3. **Monitor Deployment**
   ```bash
   aws cloudformation describe-stacks \
     --stack-name amapiano-ai-dev \
     --query 'Stacks[0].StackStatus'
   ```

4. **Get Outputs**
   ```bash
   aws cloudformation describe-stacks \
     --stack-name amapiano-ai-dev \
     --query 'Stacks[0].Outputs'
   ```

### Option 3: Automated Deployment Script

```bash
# Set environment variables
cp .env.example .env
source .env

# Run deployment script
chmod +x scripts/deploy.sh
./scripts/deploy.sh dev us-east-1
```

## Migration Guide

For a complete step-by-step migration plan, see [MIGRATION_PLAN.md](./MIGRATION_PLAN.md).

### Quick Migration Steps

1. **Migrate Database**
   ```bash
   export SOURCE_DB_PASSWORD=<current-password>
   export TARGET_DB_PASSWORD=<new-rds-password>
   
   ./scripts/migrate-database.sh \
     old-db.example.com \
     amapiano_ai \
     admin \
     new-rds.amazonaws.com
   ```

2. **Migrate S3 Files**
   ```bash
   ./scripts/migrate-s3.sh \
     /path/to/local/models \
     amapiano-ai-models-prod \
     us-east-1
   ```

3. **Deploy AI Service**
   ```bash
   ./scripts/deploy.sh prod us-east-1
   ```

4. **Run Smoke Tests**
   ```bash
   ./scripts/smoke-tests.sh prod us-east-1
   ```

## Infrastructure Components

### Networking
- **VPC**: 10.0.0.0/16
- **Public Subnets**: 2 AZs for high availability
- **Private Subnets**: 2 AZs for ECS tasks and RDS
- **NAT Gateways**: 2 for private subnet internet access
- **Internet Gateway**: Public subnet internet access

### Compute
- **ECS Fargate**: Managed container orchestration
  - AI Service: 4 vCPU, 16GB RAM
  - Auto-scaling: 1-10 tasks
- **Application Load Balancer**: HTTPS/HTTP traffic distribution
- **SageMaker** (Optional): GPU instances for model training

### Database
- **RDS PostgreSQL 15.4**
  - Dev: db.t3.micro
  - Prod: db.t3.medium with Multi-AZ
  - Automated backups (7 days retention)
  - Encrypted at rest

### Storage
- **S3**: ML models, audio files, training data
  - Versioning enabled
  - Lifecycle policies (archive after 90 days)
  - Encryption at rest (AES-256)
- **CloudFront**: CDN for audio file delivery

### Security
- **Secrets Manager**: Database credentials, API keys
- **IAM Roles**: Least privilege access
- **Security Groups**: Restrictive network policies
- **VPC**: Network isolation

### Monitoring
- **CloudWatch Logs**: Centralized logging
- **CloudWatch Metrics**: Performance monitoring
- **CloudWatch Alarms**: Automated alerts
- **CloudWatch Dashboards**: Visual monitoring

## Cost Optimization

### Monthly Cost Estimate

| Environment | Configuration | Monthly Cost |
|-------------|--------------|--------------|
| **Dev** | 1 ECS task, db.t3.micro, minimal traffic | ~$135 |
| **Prod** | 2 ECS tasks, db.t3.medium, Multi-AZ | ~$725 |

### Cost Saving Tips

1. **Use Spot Instances** for training workloads (70% savings)
2. **Reserved Instances** for RDS (30-60% savings on 1-3 year commitment)
3. **S3 Intelligent-Tiering** for automatic cost optimization
4. **Auto-scaling** to scale down during off-peak hours
5. **CloudFront caching** to reduce origin requests

## Common Operations

### View ECS Service Status
```bash
aws ecs describe-services \
  --cluster amapiano-ai-cluster-dev \
  --services amapiano-ai-ai-service-dev
```

### View CloudWatch Logs
```bash
aws logs tail /ecs/amapiano-ai/ai-service --follow
```

### Update ECS Service
```bash
aws ecs update-service \
  --cluster amapiano-ai-cluster-dev \
  --service amapiano-ai-ai-service-dev \
  --force-new-deployment
```

### Connect to RDS
```bash
psql -h <rds-endpoint> -U amapiano_admin -d amapiano_ai
```

### Upload to S3
```bash
aws s3 cp model.pt s3://amapiano-ai-models-dev/models/
```

### Rollback Deployment
```bash
./scripts/rollback.sh prod us-east-1
```

## Monitoring & Troubleshooting

### CloudWatch Dashboard
Access at: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=amapiano-ai-prod

### Key Metrics
- **ECS CPU/Memory Utilization**
- **ALB Request Count & Latency**
- **RDS CPU & Connections**
- **5XX Error Rate**

### Alarms
- **High CPU** (>80% for 10 minutes)
- **High Memory** (>80% for 10 minutes)
- **5XX Errors** (>10 per 5 minutes)

### Troubleshooting

**ECS Task Fails to Start:**
```bash
# Check task logs
aws logs tail /ecs/amapiano-ai/ai-service --follow

# Check task events
aws ecs describe-tasks --cluster <cluster> --tasks <task-id>
```

**Database Connection Issues:**
```bash
# Verify security group allows ECS tasks
# Check RDS security group ingress rules

# Test connection from ECS task
aws ecs execute-command \
  --cluster <cluster> \
  --task <task-id> \
  --container ai-service \
  --interactive \
  --command "/bin/bash"
```

**High Costs:**
```bash
# Use Cost Explorer
aws ce get-cost-and-usage \
  --time-period Start=2025-01-01,End=2025-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost
```

## Security Best Practices

1. **Secrets Management**
   - Store all sensitive values in Secrets Manager
   - Rotate credentials regularly
   - Never commit secrets to Git

2. **Network Security**
   - Use private subnets for ECS tasks and RDS
   - Restrict security group rules to minimum required
   - Enable VPC Flow Logs

3. **IAM Permissions**
   - Follow principle of least privilege
   - Use IAM roles for ECS tasks, not access keys
   - Enable MFA for console access

4. **Data Protection**
   - Enable encryption at rest (RDS, S3)
   - Use SSL/TLS for data in transit
   - Regular backups and backup testing

## Support & Resources

- **AWS Documentation**: https://docs.aws.amazon.com/
- **Terraform Registry**: https://registry.terraform.io/
- **Project Issues**: [GitHub Issues]
- **Migration Plan**: See [MIGRATION_PLAN.md](./MIGRATION_PLAN.md)

## License

See main project LICENSE file.
