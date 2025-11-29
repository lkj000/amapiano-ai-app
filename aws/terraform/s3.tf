resource "aws_s3_bucket" "models" {
  bucket = "${var.model_bucket_name}-${local.environment}"

  tags = merge(local.common_tags, {
    Name = "ML Models and Audio Storage"
  })
}

resource "aws_s3_bucket_versioning" "models" {
  bucket = aws_s3_bucket.models.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "models" {
  bucket = aws_s3_bucket.models.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "models" {
  bucket = aws_s3_bucket.models.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "models" {
  bucket = aws_s3_bucket.models.id

  rule {
    id     = "archive-old-training-data"
    status = "Enabled"

    filter {
      prefix = "training-data/"
    }

    transition {
      days          = 90
      storage_class = "GLACIER_IR"
    }

    transition {
      days          = 180
      storage_class = "DEEP_ARCHIVE"
    }
  }

  rule {
    id     = "expire-temp-files"
    status = "Enabled"

    filter {
      prefix = "temp/"
    }

    expiration {
      days = 7
    }
  }
}

resource "aws_s3_bucket_cors_configuration" "models" {
  bucket = aws_s3_bucket.models.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_cloudfront_origin_access_identity" "models" {
  comment = "OAI for ${local.app_name} models bucket"
}

resource "aws_s3_bucket_policy" "models" {
  bucket = aws_s3_bucket.models.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontOAI"
        Effect = "Allow"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.models.iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.models.arn}/*"
      }
    ]
  })
}

resource "aws_cloudfront_distribution" "models" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "CDN for ${local.app_name} audio files"
  default_root_object = "index.html"

  origin {
    domain_name = aws_s3_bucket.models.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.models.id}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.models.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.models.id}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = local.common_tags
}

output "s3_bucket_name" {
  description = "S3 bucket for models and audio"
  value       = aws_s3_bucket.models.id
}

output "cloudfront_domain" {
  description = "CloudFront distribution domain"
  value       = aws_cloudfront_distribution.models.domain_name
}
