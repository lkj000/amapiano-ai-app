.PHONY: help init plan apply deploy test rollback clean

ENVIRONMENT ?= dev
REGION ?= us-east-1

help:
	@echo "Amapiano AI - AWS Deployment Makefile"
	@echo ""
	@echo "Available targets:"
	@echo "  init          - Initialize Terraform"
	@echo "  plan          - Plan infrastructure changes"
	@echo "  apply         - Apply infrastructure changes"
	@echo "  deploy        - Full deployment (build + push + apply)"
	@echo "  test          - Run smoke tests"
	@echo "  rollback      - Rollback to previous version"
	@echo "  clean         - Clean Terraform state"
	@echo ""
	@echo "Usage:"
	@echo "  make deploy ENVIRONMENT=prod REGION=us-east-1"

init:
	@echo "Initializing Terraform..."
	cd terraform && terraform init

plan:
	@echo "Planning infrastructure changes for $(ENVIRONMENT)..."
	cd terraform && terraform plan \
		-var="environment=$(ENVIRONMENT)" \
		-var="aws_region=$(REGION)"

apply:
	@echo "Applying infrastructure changes for $(ENVIRONMENT)..."
	cd terraform && terraform apply \
		-var="environment=$(ENVIRONMENT)" \
		-var="aws_region=$(REGION)" \
		-auto-approve

deploy:
	@echo "Running full deployment for $(ENVIRONMENT)..."
	./scripts/deploy.sh $(ENVIRONMENT) $(REGION)

test:
	@echo "Running smoke tests for $(ENVIRONMENT)..."
	./scripts/smoke-tests.sh $(ENVIRONMENT) $(REGION)

rollback:
	@echo "Rolling back $(ENVIRONMENT)..."
	./scripts/rollback.sh $(ENVIRONMENT) $(REGION)

clean:
	@echo "Cleaning Terraform state..."
	cd terraform && rm -rf .terraform terraform.tfstate* tfplan

migrate-db:
	@echo "Migrating database..."
	./scripts/migrate-database.sh $(SOURCE_DB_HOST) amapiano_ai admin $(TARGET_DB_HOST)

migrate-s3:
	@echo "Migrating files to S3..."
	./scripts/migrate-s3.sh $(SOURCE_DIR) $(S3_BUCKET) $(REGION)

build-image:
	@echo "Building Docker image..."
	cd ../ai-service && docker build -t amapiano-ai/ai-service:latest .

push-image:
	@echo "Pushing Docker image to ECR..."
	$(eval ACCOUNT_ID=$(shell aws sts get-caller-identity --query Account --output text))
	aws ecr get-login-password --region $(REGION) | \
		docker login --username AWS --password-stdin $(ACCOUNT_ID).dkr.ecr.$(REGION).amazonaws.com
	docker tag amapiano-ai/ai-service:latest \
		$(ACCOUNT_ID).dkr.ecr.$(REGION).amazonaws.com/amapiano-ai/ai-service:latest
	docker push $(ACCOUNT_ID).dkr.ecr.$(REGION).amazonaws.com/amapiano-ai/ai-service:latest

outputs:
	@echo "Infrastructure outputs:"
	cd terraform && terraform output

destroy:
	@echo "⚠️  WARNING: This will destroy all infrastructure!"
	@read -p "Type 'DESTROY' to confirm: " confirm && [ "$$confirm" = "DESTROY" ]
	cd terraform && terraform destroy \
		-var="environment=$(ENVIRONMENT)" \
		-var="aws_region=$(REGION)"
