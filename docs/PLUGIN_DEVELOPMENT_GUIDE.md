# Amapiano AI Plugin Development Guide

Welcome to the Amapiano AI Plugin SDK! This guide will help you create culturally-authentic plugins for the world's first AI-powered Amapiano DAW.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Plugin Architecture](#plugin-architecture)
3. [Creating Your First Plugin](#creating-your-first-plugin)
4. [Plugin Types](#plugin-types)
5. [Cultural Authenticity](#cultural-authenticity)
6. [API Reference](#api-reference)
7. [Best Practices](#best-practices)
8. [Publishing](#publishing)

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- TypeScript knowledge
- Understanding of Web Audio API (helpful but not required)
- Respect for South African musical culture

### Installation

```bash
npm install @amapiano-ai/plugin-sdk
# or
bun add @amapiano-ai/plugin-sdk
```

### Quick Start

```typescript
import { BasePlugin, sdk } from '@amapiano-ai/plugin-sdk';
import type { PluginMetadata, PluginParameter } from '@amapiano-ai/plugin-sdk/types';

export class MyFirstPlugin extends BasePlugin {
  constructor() {
    const metadata: PluginMetadata = {
      id: 'my-first-plugin',
      name: 'My First Plugin',
      version: '1.0.0',
      author: 'Your Name',
      description: 'A simple example plugin',
      type: 'effect',
      format: 'javascript',
      category: 'utility',
      tags: ['example', 'learning'],
      supportsAutomation: true,
      supportsMIDI: false,
      hasCustomUI: false,
      license: 'free'
    };

    const parameters: PluginParameter[] = [
      sdk.createParameter({
        id: 'gain',
        name: 'Gain',
        label: 'Output Gain',
        type: 'float',
        defaultValue: 0,
        minValue: -12,
        maxValue: 12,
        unit: 'dB',
        isAutomatable: true
      })
    ];

    super(metadata, parameters);
  }

  protected async onInitialize(): Promise<void> {
    console.log('Plugin initialized!');
  }

  protected onDispose(): void {
    console.log('Plugin disposed!');
  }

  process(inputs, outputs, context, midiEvents) {
    const input = inputs[0];
    const output = outputs[0];
    const gain = sdk.audio.decibelsToLinear(this.getParameter('gain'));

    for (let i = 0; i < output.length; i++) {
      output[i] = input[i] * gain;
    }
  }
}

export default MyFirstPlugin;
```

## Plugin Architecture

### Plugin Types

1. **Instrument Plugins** - Generate audio from MIDI input
   - Synthesizers
   - Samplers
   - Drum machines

2. **Effect Plugins** - Process audio signals
   - EQ
   - Compression
   - Reverb/Delay
   - Distortion

3. **MIDI Effect Plugins** - Process MIDI data
   - Arpeggiat ors
   - Chord generators
   - MIDI transformers

4. **Analyzer Plugins** - Visualize audio
   - Spectrum analyzers
   - Meters
   - Tuners

### Plugin Lifecycle

```
Load → Initialize → Process Loop → Dispose
```

1. **Load**: Plugin class is instantiated
2. **Initialize**: Resources are allocated, sample rate is set
3. **Process Loop**: Audio/MIDI processing happens here
4. **Dispose**: Cleanup and resource deallocation

## Creating Instrument Plugins

### Basic Synthesizer Example

```typescript
import { BasePlugin, sdk } from '@amapiano-ai/plugin-sdk';
import type { IInstrumentPlugin, MIDIEvent } from '@amapiano-ai/plugin-sdk/types';

export class SimpleSynth extends BasePlugin implements IInstrumentPlugin {
  private voices: Voice[] = [];
  private oscillator = sdk.dsp.createOscillator('sine');

  constructor() {
    // ... metadata and parameters
    super(metadata, parameters);
  }

  noteOn(note: number, velocity: number, channel: number = 0): void {
    const frequency = sdk.midi.noteToFrequency(note);
    const gain = sdk.midi.velocityToGain(velocity);
    
    // Find free voice and trigger
    const voice = this.findFreeVoice();
    voice.trigger(frequency, gain);
  }

  noteOff(note: number, channel: number = 0): void {
    const voice = this.findVoiceByNote(note);
    if (voice) {
      voice.release();
    }
  }

  allNotesOff(): void {
    this.voices.forEach(v => v.release());
  }

  process(inputs, outputs, context, midiEvents) {
    // Process MIDI events
    if (midiEvents) {
      midiEvents.forEach(event => {
        if (event.type === 'note_on') {
          this.noteOn(event.note!, event.velocity!);
        } else if (event.type === 'note_off') {
          this.noteOff(event.note!);
        }
      });
    }

    // Generate audio
    const output = outputs[0];
    for (let i = 0; i < output.length; i++) {
      let sample = 0;
      this.voices.forEach(voice => {
        sample += voice.process(context.sampleRate);
      });
      output[i] = sample;
    }
  }
}
```

### Amapiano Log Drum Example

```typescript
export class LogDrumSynth extends BasePlugin implements IInstrumentPlugin {
  constructor() {
    const metadata = sdk.cultural.createCulturalMetadata(
      'amapiano',
      'Authentic log drum is the heartbeat of amapiano music',
      'Log Drum (electronic interpretation)'
    );

    // ... setup
  }

  private generateLogDrumSound(frequency, time, depth, resonance) {
    // Pitch envelope for realistic "thud"
    const pitchEnv = Math.exp(-time * 50 * (1 - resonance));
    const currentFreq = frequency * (1 + pitchEnv * depth * 2);

    // Generate oscillator with harmonics
    const fundamental = Math.sin(2 * Math.PI * this.phase);
    const harmonic2 = Math.sin(4 * Math.PI * this.phase) * 0.3;
    
    return fundamental + harmonic2;
  }
}
```

## Cultural Authenticity

### Cultural Guidelines

When creating plugins for Amapiano music, please:

1. **Research the Culture**: Understand the history and significance of amapiano
2. **Respect Traditional Elements**: Log drums, gospel piano, and South African rhythms are sacred
3. **Consult Cultural Experts**: When in doubt, seek guidance
4. **Give Credit**: Acknowledge cultural origins in your metadata
5. **Avoid Appropriation**: Use cultural elements respectfully and educate users

### Cultural Metadata

Always include cultural context in your plugins:

```typescript
culturalContext: {
  genre: 'amapiano',
  culturalSignificance: 'This plugin emulates traditional South African percussion patterns',
  traditionalInstrument: 'Shekere',
  culturalReferences: [
    'Township music traditions',
    'Kwaito influences'
  ],
  respectfulUsage: 'Please use this instrument with respect for its cultural origins'
}
```

### Using Cultural Helpers

The SDK provides culturally-authentic scales, rhythms, and chord progressions:

```typescript
// Get traditional scales
const scales = sdk.cultural.getAmapianoScales();
const minorPentatonic = scales['minor_pentatonic']; // [0, 3, 5, 7, 10]

// Get traditional rhythms
const rhythms = sdk.cultural.getTraditionalRhythms();
const logDrumPattern = rhythms['log_drum_syncopated'];

// Get gospel chord progressions
const chords = sdk.cultural.getGospelChords();
const gospelTurnaround = chords['gospel_turnaround'];
```

## Effect Plugins

### Basic EQ Example

```typescript
export class SimpleEQ extends BasePlugin implements IEffectPlugin {
  private bypassed = false;
  private lowShelf = sdk.dsp.createFilter('lowshelf');
  private highShelf = sdk.dsp.createFilter('highshelf');

  setBypassed(bypassed: boolean): void {
    this.bypassed = bypassed;
  }

  process(inputs, outputs, context) {
    if (this.bypassed) {
      outputs[0].set(inputs[0]);
      return;
    }

    const lowGain = this.getParameter('low_gain');
    const highGain = this.getParameter('high_gain');

    // Update filter coefficients
    this.lowShelf.setCoefficients(100, lowGain, context.sampleRate);
    this.highShelf.setCoefficients(10000, highGain, context.sampleRate);

    // Process audio
    for (let i = 0; i < outputs[0].length; i++) {
      let sample = inputs[0][i];
      sample = this.lowShelf.process(sample);
      sample = this.highShelf.process(sample);
      outputs[0][i] = sample;
    }
  }
}
```

## Custom UI

### Creating Plugin UI

```typescript
createUI(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'my-plugin-ui';
  
  // Add controls for each parameter
  this.parameters.forEach(param => {
    const control = sdk.ui.createKnob(param);
    
    control.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.setParameter(param.id, value);
    });
    
    container.appendChild(control);
  });

  return container;
}
```

## Presets

### Creating and Managing Presets

```typescript
// Create a preset
const preset = this.savePreset('My Preset', 'Description of this preset');

// Load a preset
this.loadPreset(preset);

// Add built-in presets
protected async onInitialize(): Promise<void> {
  this.addPreset({
    id: 'warm',
    name: 'Warm Sound',
    parameters: {
      tone: 0.7,
      depth: 0.8,
      resonance: 0.6
    },
    culturalContext: 'Optimized for gospel piano warmth',
    createdAt: new Date()
  });
}
```

## Publishing Your Plugin

### 1. Prepare Your Plugin

```bash
# Build your plugin
npm run build

# Test thoroughly
npm test

# Create documentation
```

### 2. Register with Plugin Registry

```typescript
import backend from '~backend/client';

const response = await backend.plugin.registerPlugin({
  metadata: yourPluginMetadata,
  downloadUrl: 'https://your-cdn.com/plugin.js',
  sourceCode: 'https://github.com/you/plugin' // optional
});
```

### 3. Plugin Review Process

1. Submit plugin for review
2. Cultural authenticity verification (for amapiano-specific plugins)
3. Security and performance testing
4. Publication to marketplace

## Best Practices

### Performance

- Keep processing efficient (< 5% CPU per instance)
- Use lookup tables for expensive calculations
- Avoid allocations in the process loop
- Profile your plugin regularly

### Audio Quality

- Avoid clicks and pops with proper envelope shaping
- Use anti-aliasing for non-band-limited oscillators
- Implement proper denormal handling
- Test at different sample rates

### Cultural Sensitivity

- Research before implementing cultural elements
- Provide context and education in documentation
- Seek feedback from cultural experts
- Credit sources and influences

### Code Quality

- Use TypeScript for type safety
- Write comprehensive tests
- Document your code
- Follow the style guide

## Example Plugins

Check out these example plugins for inspiration:

- **Amapiano Log Drum** - Traditional log drum synthesizer
- **Gospel Piano EQ** - Culturally-aware equalizer
- **Township Reverb** - Spatial effects inspired by township sound
- **Jazz Chord Generator** - MIDI effect for sophisticated harmonies

## Support and Community

- Documentation: https://docs.amapiano-ai.app/plugins
- Discord: https://discord.gg/amapiano-ai
- GitHub: https://github.com/amapiano-ai/plugins
- Cultural Consultants: https://amapiano-ai.app/cultural-advisory

## License

Plugin SDK is MIT licensed. Individual plugins may have different licenses.

## Acknowledgments

This plugin system is built with respect for:
- South African musical traditions
- The amapiano community
- Cultural heritage and authenticity
- Open-source development

---

**Remember**: With great power comes great responsibility. Build plugins that honor the culture and educate users about amapiano's rich heritage.
