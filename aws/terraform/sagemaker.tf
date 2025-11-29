resource "aws_iam_role" "sagemaker" {
  name = "${local.app_name}-sagemaker-${local.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "sagemaker.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "sagemaker_full_access" {
  role       = aws_iam_role.sagemaker.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSageMakerFullAccess"
}

resource "aws_iam_role_policy" "sagemaker_s3" {
  name = "${local.app_name}-sagemaker-s3-${local.environment}"
  role = aws_iam_role.sagemaker.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.models.arn,
          "${aws_s3_bucket.models.arn}/*"
        ]
      }
    ]
  })
}

resource "aws_sagemaker_notebook_instance" "training" {
  count                   = var.environment == "prod" ? 1 : 0
  name                    = "${local.app_name}-training-notebook-${local.environment}"
  role_arn                = aws_iam_role.sagemaker.arn
  instance_type           = "ml.g4dn.xlarge"
  platform_identifier     = "notebook-al2-v2"
  volume_size             = 100
  direct_internet_access  = "Enabled"
  root_access             = "Enabled"

  tags = merge(local.common_tags, {
    Name = "Training Notebook"
  })
}

output "sagemaker_notebook_url" {
  description = "SageMaker notebook instance URL"
  value       = var.environment == "prod" ? "https://console.aws.amazon.com/sagemaker/home?region=${var.aws_region}#/notebook-instances/${aws_sagemaker_notebook_instance.training[0].name}" : "Not created in non-prod environment"
}
