-- Insert sample data for testing and demonstration
INSERT INTO samples (name, category, genre, file_url, bpm, key_signature, duration_seconds, tags) VALUES
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
('Ambient Synth', 'synth', 'private_school_amapiano', 'samples/synth_ambient_110.wav', 110, 'Dm', 64.0, ARRAY['ambient', 'textural', 'evolving']);

-- Insert pattern data
INSERT INTO patterns (name, category, genre, pattern_data, bpm, key_signature, bars) VALUES
-- Classic Amapiano Chord Progressions
('Classic Amapiano', 'chord_progression', 'amapiano', '{"chords": ["C", "Am", "F", "G"], "progression": "I-vi-IV-V", "style": "soulful"}', 120, 'C', 4),
('Kabza Style', 'chord_progression', 'amapiano', '{"chords": ["Cm", "Fm", "G", "Cm"], "progression": "i-iv-V-i", "style": "energetic"}', 118, 'Cm', 4),
('Deep House Influence', 'chord_progression', 'amapiano', '{"chords": ["Am7", "Dm7", "G7", "Cmaj7"], "progression": "vim7-iim7-V7-Imaj7", "style": "deep"}', 122, 'C', 4),

-- Private School Chord Progressions
('Private School Classic', 'chord_progression', 'private_school_amapiano', '{"chords": ["Cmaj9", "Am7", "Fmaj7", "G7sus4"], "progression": "Imaj9-vim7-IVmaj7-V7sus4", "style": "jazzy"}', 115, 'C', 4),
('Kelvin Momo Style', 'chord_progression', 'private_school_amapiano', '{"chords": ["Dm9", "G13", "Cmaj7", "Am7"], "progression": "iim9-V13-Imaj7-vim7", "style": "sophisticated"}', 110, 'C', 4),
('Smooth Jazz Influence', 'chord_progression', 'private_school_amapiano', '{"chords": ["Fmaj7", "Em7", "Am7", "Dm7"], "progression": "IVmaj7-iiim7-vim7-iim7", "style": "smooth"}', 112, 'C', 4),

-- Drum Patterns
('Classic Log Drum', 'drum_pattern', 'amapiano', '{"logDrum": "x-x-.-x-x-.-x-.-", "kick": "x...x...x...x...", "snare": "....x.......x...", "hiHat": "x.x.x.x.x.x.x.x.", "style": "classic"}', 120, NULL, 1),
('Private School Subtle', 'drum_pattern', 'private_school_amapiano', '{"logDrum": "x.-.x.-.x.-.x.-.", "kick": "x.......x.......", "snare": "........x.......", "hiHat": "..x...x...x...x.", "style": "minimal"}', 110, NULL, 1),
('Modern Amapiano', 'drum_pattern', 'amapiano', '{"logDrum": "x-x.x-x.x-x.x-x.", "kick": "x...x.x.x...x.x.", "snare": "....x.......x...", "hiHat": "x.x.x.x.x.x.x.x.", "style": "modern"}', 122, NULL, 1),

-- Bass Patterns
('Classic Bass Walk', 'bass_pattern', 'amapiano', '{"notes": ["C2", "C2", "F2", "G2"], "rhythm": "quarter", "style": "walking"}', 120, 'C', 4),
('Jazz Bass Line', 'bass_pattern', 'private_school_amapiano', '{"notes": ["Dm", "G", "C", "Am"], "rhythm": "syncopated", "style": "jazz"}', 115, 'C', 4),

-- Melodies
('Soulful Piano Melody', 'melody', 'amapiano', '{"notes": ["C4", "E4", "G4", "A4", "G4", "F4", "E4", "C4"], "rhythm": "eighth", "style": "soulful"}', 120, 'C', 2),
('Jazz Piano Melody', 'melody', 'private_school_amapiano', '{"notes": ["D4", "F4", "A4", "C5", "Bb4", "G4", "F4", "D4"], "rhythm": "triplet", "style": "jazzy"}', 115, 'Dm', 2);
