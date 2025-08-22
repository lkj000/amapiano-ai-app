-- Ensure we have sample data by inserting if not exists
INSERT INTO samples (name, category, genre, file_url, bpm, key_signature, duration_seconds, tags) 
SELECT * FROM (VALUES
-- Classic Amapiano Log Drums
('Deep Log Drum Loop', 'log_drum', 'amapiano', 'samples/log_drum_deep_120.wav', 120, 'C', 4.0, ARRAY['deep', 'groovy', 'classic']),
('Kabza Style Log Drum', 'log_drum', 'amapiano', 'samples/log_drum_kabza_118.wav', 118, 'Am', 8.0, ARRAY['kabza', 'energetic', 'signature']),
('Soulful Log Drum', 'log_drum', 'amapiano', 'samples/log_drum_soulful_115.wav', 115, 'F', 4.0, ARRAY['soulful', 'warm', 'classic']),
('Heavy Log Drum', 'log_drum', 'amapiano', 'samples/log_drum_heavy_122.wav', 122, 'G', 2.0, ARRAY['heavy', 'punchy', 'driving']),

-- Private School Amapiano Log Drums
('Subtle Log Drum', 'log_drum', 'private_school_amapiano', 'samples/log_drum_subtle_110.wav', 110, 'Dm', 4.0, ARRAY['subtle', 'mellow', 'kelvin_momo']),
('Jazz Log Drum', 'log_drum', 'private_school_amapiano', 'samples/log_drum_jazz_112.wav', 112, 'Bb', 8.0, ARRAY['jazzy', 'sophisticated', 'smooth']),

-- Classic Amapiano Piano
('Soulful Piano Chords', 'piano', 'amapiano', 'samples/piano_soulful_120.wav', 120, 'C', 16.0, ARRAY['soulful', 'chords', 'emotional']),
('Gospel Piano', 'piano', 'amapiano', 'samples/piano_gospel_118.wav', 118, 'F', 8.0, ARRAY['gospel', 'uplifting', 'spiritual']),
('Deep House Piano', 'piano', 'amapiano', 'samples/piano_deep_house_122.wav', 122, 'Am', 12.0, ARRAY['deep_house', 'atmospheric', 'moody']),

-- Private School Piano
('Jazz Piano Progression', 'piano', 'private_school_amapiano', 'samples/piano_jazz_115.wav', 115, 'Dm', 16.0, ARRAY['jazz', 'complex', 'sophisticated']),
('Kelvin Momo Style Piano', 'piano', 'private_school_amapiano', 'samples/piano_kelvin_110.wav', 110, 'Bb', 32.0, ARRAY['kelvin_momo', 'melodic', 'private_school']),
('Smooth Jazz Chords', 'piano', 'private_school_amapiano', 'samples/piano_smooth_jazz_112.wav', 112, 'Eb', 8.0, ARRAY['smooth_jazz', 'mellow', 'refined']),

-- Percussion
('Amapiano Hi-Hats', 'percussion', 'amapiano', 'samples/percussion_hihats_120.wav', 120, NULL, 4.0, ARRAY['hi_hats', 'crisp', 'rhythmic']),
('Shaker Loop', 'percussion', 'amapiano', 'samples/percussion_shaker_118.wav', 118, NULL, 8.0, ARRAY['shaker', 'continuous', 'groove']),
('Clap Pattern', 'percussion', 'amapiano', 'samples/percussion_claps_122.wav', 122, NULL, 2.0, ARRAY['claps', 'snappy', 'accent']),
('Subtle Percussion', 'percussion', 'private_school_amapiano', 'samples/percussion_subtle_110.wav', 110, NULL, 16.0, ARRAY['subtle', 'textural', 'ambient']),

-- Bass
('Deep Sub Bass', 'bass', 'amapiano', 'samples/bass_deep_sub_120.wav', 120, 'C', 4.0, ARRAY['sub_bass', 'deep', 'foundation']),
('Groovy Bassline', 'bass', 'amapiano', 'samples/bass_groovy_118.wav', 118, 'F', 8.0, ARRAY['groovy', 'melodic', 'walking']),
('Jazz Bass', 'bass', 'private_school_amapiano', 'samples/bass_jazz_115.wav', 115, 'Bb', 16.0, ARRAY['jazz', 'sophisticated', 'smooth']),

-- Vocals
('Amapiano Vocal Chops', 'vocal', 'amapiano', 'samples/vocal_chops_120.wav', 120, 'C', 2.0, ARRAY['vocal_chops', 'rhythmic', 'processed']),
('Soulful Vocal', 'vocal', 'amapiano', 'samples/vocal_soulful_118.wav', 118, 'Am', 8.0, ARRAY['soulful', 'emotional', 'lead']),
('Jazz Vocal', 'vocal', 'private_school_amapiano', 'samples/vocal_jazz_112.wav', 112, 'Dm', 16.0, ARRAY['jazz', 'smooth', 'sophisticated']),

-- Saxophone
('Smooth Saxophone', 'saxophone', 'private_school_amapiano', 'samples/sax_smooth_115.wav', 115, 'Bb', 32.0, ARRAY['smooth', 'melodic', 'jazz']),
('Soulful Sax Lead', 'saxophone', 'private_school_amapiano', 'samples/sax_soulful_110.wav', 110, 'Eb', 16.0, ARRAY['soulful', 'lead', 'expressive']),

-- Guitar
('Jazz Guitar Chords', 'guitar', 'private_school_amapiano', 'samples/guitar_jazz_112.wav', 112, 'Am', 8.0, ARRAY['jazz', 'chords', 'clean']),
('Mellow Guitar', 'guitar', 'private_school_amapiano', 'samples/guitar_mellow_108.wav', 108, 'F', 16.0, ARRAY['mellow', 'fingerpicked', 'ambient']),

-- Synth
('Warm Pad', 'synth', 'amapiano', 'samples/synth_warm_pad_120.wav', 120, 'C', 32.0, ARRAY['pad', 'warm', 'atmospheric']),
('Lead Synth', 'synth', 'amapiano', 'samples/synth_lead_122.wav', 122, 'G', 8.0, ARRAY['lead', 'bright', 'melodic']),
('Ambient Synth', 'synth', 'private_school_amapiano', 'samples/synth_ambient_110.wav', 110, 'Dm', 64.0, ARRAY['ambient', 'textural', 'evolving'])
) AS v(name, category, genre, file_url, bpm, key_signature, duration_seconds, tags)
WHERE NOT EXISTS (
  SELECT 1 FROM samples WHERE samples.name = v.name
);
