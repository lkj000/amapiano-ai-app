-- Fix pattern_recommendations table - add missing cultural_alignment column

ALTER TABLE pattern_recommendations ADD COLUMN IF NOT EXISTS cultural_alignment DECIMAL(3,2) DEFAULT 0.0;

-- Update existing rows to have reasonable default values
UPDATE pattern_recommendations SET cultural_alignment = relevance_score * 0.8 WHERE cultural_alignment IS NULL OR cultural_alignment = 0.0;

CREATE INDEX IF NOT EXISTS idx_pattern_recommendations_cultural ON pattern_recommendations(cultural_alignment DESC);

COMMENT ON COLUMN pattern_recommendations.cultural_alignment IS 'Cultural alignment score for pattern recommendation';
