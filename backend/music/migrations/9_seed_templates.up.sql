INSERT INTO smart_templates (id, name, version, description, author, genre, category, signal_chain, preset_parameters, tags, target_framework, verified, rating, cultural_context, use_case)
VALUES 
(
  'amapianorizer',
  'Amapianorizer',
  '1.0.0',
  'Authentic amapiano sound enhancer with log drum saturation, percussive pumping, and spatial depth',
  'Amapiano AI Team',
  'amapiano',
  'genre_specific',
  '{
    "modules": [
      {
        "id": "eq_1",
        "name": "EQ",
        "type": "filter",
        "order": 1,
        "parameters": [
          {"id": "lowShelfFreq", "name": "Low Shelf Frequency", "type": "float", "defaultValue": 40, "minValue": 20, "maxValue": 200, "unit": "Hz"},
          {"id": "lowShelfGain", "name": "Low Shelf Gain", "type": "float", "defaultValue": 6, "minValue": -12, "maxValue": 12, "unit": "dB"},
          {"id": "highShelfFreq", "name": "High Shelf Frequency", "type": "float", "defaultValue": 8000, "minValue": 2000, "maxValue": 16000, "unit": "Hz"},
          {"id": "highShelfGain", "name": "High Shelf Gain", "type": "float", "defaultValue": 2, "minValue": -12, "maxValue": 12, "unit": "dB"}
        ]
      },
      {
        "id": "comp_1",
        "name": "Pumping Compressor",
        "type": "dynamics",
        "order": 2,
        "parameters": [
          {"id": "ratio", "name": "Ratio", "type": "float", "defaultValue": 6, "minValue": 1, "maxValue": 20, "unit": ":1"},
          {"id": "attack", "name": "Attack", "type": "float", "defaultValue": 50, "minValue": 1, "maxValue": 100, "unit": "ms"},
          {"id": "release", "name": "Release", "type": "float", "defaultValue": 150, "minValue": 50, "maxValue": 500, "unit": "ms"},
          {"id": "threshold", "name": "Threshold", "type": "float", "defaultValue": -18, "minValue": -40, "maxValue": 0, "unit": "dB"}
        ]
      },
      {
        "id": "gate_1",
        "name": "Gate",
        "type": "dynamics",
        "order": 3,
        "parameters": [
          {"id": "threshold", "name": "Threshold", "type": "float", "defaultValue": -30, "minValue": -60, "maxValue": 0, "unit": "dB"},
          {"id": "attack", "name": "Attack", "type": "float", "defaultValue": 5, "minValue": 0.1, "maxValue": 50, "unit": "ms"},
          {"id": "release", "name": "Release", "type": "float", "defaultValue": 100, "minValue": 10, "maxValue": 500, "unit": "ms"}
        ]
      },
      {
        "id": "reverb_1",
        "name": "Reverb",
        "type": "spatial",
        "order": 4,
        "parameters": [
          {"id": "roomSize", "name": "Room Size", "type": "float", "defaultValue": 0.6, "minValue": 0, "maxValue": 1},
          {"id": "damping", "name": "Damping", "type": "float", "defaultValue": 0.4, "minValue": 0, "maxValue": 1},
          {"id": "wetDry", "name": "Wet/Dry", "type": "float", "defaultValue": 0.25, "minValue": 0, "maxValue": 1}
        ]
      },
      {
        "id": "delay_1",
        "name": "Delay",
        "type": "spatial",
        "order": 5,
        "parameters": [
          {"id": "time", "name": "Delay Time", "type": "float", "defaultValue": 375, "minValue": 1, "maxValue": 2000, "unit": "ms"},
          {"id": "feedback", "name": "Feedback", "type": "float", "defaultValue": 0.3, "minValue": 0, "maxValue": 0.9},
          {"id": "wetDry", "name": "Wet/Dry", "type": "float", "defaultValue": 0.2, "minValue": 0, "maxValue": 1}
        ]
      },
      {
        "id": "sat_1",
        "name": "Log Drum Saturator",
        "type": "distortion",
        "order": 6,
        "parameters": [
          {"id": "drive", "name": "Drive", "type": "float", "defaultValue": 0.4, "minValue": 0, "maxValue": 1},
          {"id": "character", "name": "Character", "type": "enum", "defaultValue": "warm", "enumValues": ["warm", "bright", "dark"]}
        ]
      }
    ],
    "routing": "serial"
  }',
  '{
    "swing": 62,
    "pumpIntensity": 70,
    "spatialDepth": 60,
    "logDrumEnhancement": 40
  }',
  ARRAY['amapiano', 'log_drum', 'pumping', 'south_african', 'percussion'],
  'WebAudio',
  true,
  5.0,
  'Authentic South African amapiano production tool designed to capture the signature log drum sound and percussive pumping rhythm that defines the genre.',
  'Perfect for producers creating amapiano tracks who want instant access to the signature sound without extensive mixing.'
),
(
  'chillifier',
  'Chillifier',
  '1.0.0',
  'Lo-fi warmth generator with tape saturation, vinyl crackle, and analog character',
  'Amapiano AI Team',
  NULL,
  'functional',
  '{
    "modules": [
      {
        "id": "eq_1",
        "name": "Vintage EQ",
        "type": "filter",
        "order": 1,
        "parameters": [
          {"id": "lowPassFreq", "name": "Low Pass Frequency", "type": "float", "defaultValue": 8000, "minValue": 2000, "maxValue": 16000, "unit": "Hz"},
          {"id": "resonance", "name": "Resonance", "type": "float", "defaultValue": 0.3, "minValue": 0, "maxValue": 1}
        ]
      },
      {
        "id": "comp_1",
        "name": "Gentle Compressor",
        "type": "dynamics",
        "order": 2,
        "parameters": [
          {"id": "ratio", "name": "Ratio", "type": "float", "defaultValue": 3, "minValue": 1, "maxValue": 10, "unit": ":1"},
          {"id": "attack", "name": "Attack", "type": "float", "defaultValue": 20, "minValue": 1, "maxValue": 100, "unit": "ms"},
          {"id": "release", "name": "Release", "type": "float", "defaultValue": 200, "minValue": 50, "maxValue": 500, "unit": "ms"},
          {"id": "threshold", "name": "Threshold", "type": "float", "defaultValue": -20, "minValue": -40, "maxValue": 0, "unit": "dB"}
        ]
      },
      {
        "id": "noise_1",
        "name": "Tape Hiss",
        "type": "utility",
        "order": 3,
        "parameters": [
          {"id": "amount", "name": "Amount", "type": "float", "defaultValue": 0.15, "minValue": 0, "maxValue": 1},
          {"id": "color", "name": "Color", "type": "enum", "defaultValue": "pink", "enumValues": ["white", "pink", "brown"]}
        ]
      },
      {
        "id": "vinyl_1",
        "name": "Vinyl Crackle",
        "type": "utility",
        "order": 4,
        "parameters": [
          {"id": "intensity", "name": "Intensity", "type": "float", "defaultValue": 0.2, "minValue": 0, "maxValue": 1},
          {"id": "density", "name": "Density", "type": "float", "defaultValue": 0.3, "minValue": 0, "maxValue": 1}
        ]
      },
      {
        "id": "reverb_1",
        "name": "Room Reverb",
        "type": "spatial",
        "order": 5,
        "parameters": [
          {"id": "roomSize", "name": "Room Size", "type": "float", "defaultValue": 0.4, "minValue": 0, "maxValue": 1},
          {"id": "damping", "name": "Damping", "type": "float", "defaultValue": 0.7, "minValue": 0, "maxValue": 1},
          {"id": "wetDry", "name": "Wet/Dry", "type": "float", "defaultValue": 0.15, "minValue": 0, "maxValue": 1}
        ]
      }
    ],
    "routing": "serial"
  }',
  '{
    "warmth": 65,
    "tapeHiss": 15,
    "vinylCrackle": 20,
    "loFiIntensity": 55
  }',
  ARRAY['lo-fi', 'chill', 'vintage', 'tape', 'vinyl', 'warmth'],
  'WebAudio',
  true,
  4.8,
  NULL,
  'Adds nostalgic lo-fi character to any audio. Perfect for creating chill beats, bedroom pop, or adding vintage warmth to modern productions.'
),
(
  'vocal_fx_suite',
  'Vocal FX Suite',
  '1.0.0',
  'Professional vocal processing chain with reverb, delay, de-essing, and spatial enhancement',
  'Amapiano AI Team',
  NULL,
  'functional',
  '{
    "modules": [
      {
        "id": "eq_1",
        "name": "Vocal EQ",
        "type": "filter",
        "order": 1,
        "parameters": [
          {"id": "highPassFreq", "name": "High Pass Frequency", "type": "float", "defaultValue": 80, "minValue": 20, "maxValue": 200, "unit": "Hz"},
          {"id": "presenceFreq", "name": "Presence Frequency", "type": "float", "defaultValue": 3000, "minValue": 1000, "maxValue": 8000, "unit": "Hz"},
          {"id": "presenceGain", "name": "Presence Gain", "type": "float", "defaultValue": 3, "minValue": -6, "maxValue": 12, "unit": "dB"}
        ]
      },
      {
        "id": "deesser_1",
        "name": "De-esser",
        "type": "dynamics",
        "order": 2,
        "parameters": [
          {"id": "frequency", "name": "Frequency", "type": "float", "defaultValue": 6000, "minValue": 4000, "maxValue": 10000, "unit": "Hz"},
          {"id": "threshold", "name": "Threshold", "type": "float", "defaultValue": -25, "minValue": -40, "maxValue": 0, "unit": "dB"},
          {"id": "reduction", "name": "Reduction", "type": "float", "defaultValue": 6, "minValue": 0, "maxValue": 20, "unit": "dB"}
        ]
      },
      {
        "id": "comp_1",
        "name": "Vocal Compressor",
        "type": "dynamics",
        "order": 3,
        "parameters": [
          {"id": "ratio", "name": "Ratio", "type": "float", "defaultValue": 4, "minValue": 1, "maxValue": 10, "unit": ":1"},
          {"id": "attack", "name": "Attack", "type": "float", "defaultValue": 10, "minValue": 1, "maxValue": 50, "unit": "ms"},
          {"id": "release", "name": "Release", "type": "float", "defaultValue": 100, "minValue": 50, "maxValue": 300, "unit": "ms"},
          {"id": "threshold", "name": "Threshold", "type": "float", "defaultValue": -15, "minValue": -30, "maxValue": 0, "unit": "dB"}
        ]
      },
      {
        "id": "reverb_1",
        "name": "Vocal Reverb",
        "type": "spatial",
        "order": 4,
        "parameters": [
          {"id": "roomSize", "name": "Room Size", "type": "float", "defaultValue": 0.5, "minValue": 0, "maxValue": 1},
          {"id": "damping", "name": "Damping", "type": "float", "defaultValue": 0.5, "minValue": 0, "maxValue": 1},
          {"id": "preDelay", "name": "Pre-delay", "type": "float", "defaultValue": 30, "minValue": 0, "maxValue": 100, "unit": "ms"},
          {"id": "wetDry", "name": "Wet/Dry", "type": "float", "defaultValue": 0.3, "minValue": 0, "maxValue": 1}
        ]
      },
      {
        "id": "delay_1",
        "name": "Vocal Delay",
        "type": "spatial",
        "order": 5,
        "parameters": [
          {"id": "time", "name": "Delay Time", "type": "float", "defaultValue": 250, "minValue": 1, "maxValue": 2000, "unit": "ms"},
          {"id": "feedback", "name": "Feedback", "type": "float", "defaultValue": 0.25, "minValue": 0, "maxValue": 0.9},
          {"id": "wetDry", "name": "Wet/Dry", "type": "float", "defaultValue": 0.2, "minValue": 0, "maxValue": 1}
        ]
      },
      {
        "id": "stereo_1",
        "name": "Stereo Widener",
        "type": "spatial",
        "order": 6,
        "parameters": [
          {"id": "width", "name": "Width", "type": "float", "defaultValue": 0.6, "minValue": 0, "maxValue": 1},
          {"id": "mono", "name": "Mono", "type": "bool", "defaultValue": false}
        ]
      }
    ],
    "routing": "serial"
  }',
  '{
    "vocalClarity": 75,
    "deEssAmount": 30,
    "reverbTail": 50,
    "spatialWidth": 60
  }',
  ARRAY['vocals', 'processing', 'reverb', 'delay', 'compression', 'professional'],
  'WebAudio',
  true,
  4.9,
  NULL,
  'Complete vocal processing chain for polished, professional-sounding vocals. Works with any genre from amapiano to pop.'
);
