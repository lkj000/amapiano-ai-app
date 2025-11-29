terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

locals {
  app_name = "amapiano-ai"
  environment = var.environment
  common_tags = {
    Project     = "Amapiano-AI"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}
