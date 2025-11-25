-- Add missing columns to samples and patterns tables

ALTER TABLE samples ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE samples ADD COLUMN IF NOT EXISTS cultural_significance TEXT;

ALTER TABLE patterns ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE patterns ADD COLUMN IF NOT EXISTS cultural_significance TEXT;

-- Update existing rows to have default values
UPDATE samples SET description = 'Sample audio clip' WHERE description IS NULL;
UPDATE samples SET cultural_significance = 'Traditional Amapiano element' WHERE cultural_significance IS NULL;

UPDATE patterns SET description = 'Musical pattern' WHERE description IS NULL;
UPDATE patterns SET cultural_significance = 'Amapiano pattern structure' WHERE cultural_significance IS NULL;
