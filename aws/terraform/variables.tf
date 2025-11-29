variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "db_password" {
  description = "PostgreSQL database password"
  type        = string
  sensitive   = true
}

variable "ai_service_cpu" {
  description = "CPU units for AI service (1024 = 1 vCPU)"
  type        = number
  default     = 4096
}

variable "ai_service_memory" {
  description = "Memory for AI service in MB"
  type        = number
  default     = 16384
}

variable "enable_gpu" {
  description = "Enable GPU instances for AI service"
  type        = bool
  default     = true
}

variable "gpu_instance_type" {
  description = "EC2 GPU instance type for AI workloads"
  type        = string
  default     = "g4dn.xlarge"
}

variable "model_bucket_name" {
  description = "S3 bucket name for ML models and audio files"
  type        = string
  default     = "amapiano-ai-models"
}
