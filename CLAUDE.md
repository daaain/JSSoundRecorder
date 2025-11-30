# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JSSoundRecorder is a pure client-side web application for recording live audio, editing it, and creating musical loops. No servers involved - everything runs in the browser using Web Audio API with binary WAV Blobs.

Live demo: <http://daaain.github.com/JSSoundRecorder>

## Development Commands

**Setup (first time):**

```bash
pnpm install
```

**Local development server:**

```bash
pnpm dev
# Opens at http://localhost:5173 (default Vite port)
```

**Build for production (GitHub Pages):**

```bash
pnpm build
# Outputs to dist/
```

**No build required for development** - Vite serves files directly. Edit and refresh.

## Browser Requirements

- Modern browsers with Web Audio API support
- Requires `navigator.mediaDevices.getUserMedia` for microphone access
- Works best with headphones to avoid feedback during live recording

## Architecture

### Three-Module System

1. **Recording Module** (`js/recordLive.js`, `js/lib/recorder.js`, `js/lib/recorderWorker.js`)
   - Captures live audio via getUserMedia → MediaStreamSource
   - Uses WebWorker for buffer processing (interleaving channels, WAV encoding)
   - Outputs binary WAV Blob stored in memory

2. **Editor Module** (`app/js/`)
   - Complex waveform editor adapted from html5-audio-editor
   - Core: `AudioLayerControl` manages multiple `AudioSequenceEditor` instances (stereo channels)
   - Spectrum analyser uses FFT in WebWorker (`SpectrumWorker.js`)
   - Filters: gain, normalize, silence, fade in/out
   - All editing done in-memory on AudioBuffer data

3. **Sequencer + Drone Synth** (`js/sequencer.js`, `js/drone.js`)
   - Simple 8-step loop sequencer triggering recorded sounds
   - Drone: generative synth using multiple Web Audio oscillators with random 3D panning

### Data Flow

```
Microphone
  → getUserMedia
  → MediaStreamSource (Web Audio API)
  → Recorder (ScriptProcessor node at 4096 buffer)
  → WebWorker (interleave channels + encode WAV)
  → Blob
  → URL.createObjectURL
  → <audio> element OR AudioContext.decodeAudioData
  → AudioLayerControl (editor)
  → Modified Blob → Download/Playback
```

### Key Technical Patterns

**WebWorker Usage**: Heavy processing (WAV encoding, spectrum FFT) offloaded to workers to keep UI responsive. Workers receive commands via postMessage with typed arrays.

**AudioWorklet**: Modern audio processing on separate rendering thread:

- `recorder-worklet.js` - Captures audio data from microphone
- `noise-worklet.js` - Generates white noise for drone synth
- Worklets must be registered via `audioWorklet.addModule()` before use

**Audio Routing**: Web Audio API nodes chained together:

- Input: `MediaStreamSource → GainNode → destination` (for monitoring)
- Recording: `MediaStreamSource → AudioWorkletNode → WebWorker`
- Playback: `AudioBufferSource → AnalyserNode → GainNode → destination`
- Drone: `AudioWorkletNode → BiquadFilter → Panner → GainNode → destination`

**Binary Blob Handling**: WAV files never touch filesystem during editing. Created in-memory via ArrayBuffer/DataView, wrapped in Blob, exposed via URL.createObjectURL for download links or audio element sources.

**UI State**: Recording/editing states toggle visibility between `.recorder.container` and `.editor.container` divs. Current edited sound tracked by `currentEditedSoundIndex`.

## File Organisation

- `index.html` - Single-page app, all UI and script loading
- `js/` - Recording, sequencer, drone (top-level features)
- `app/js/` - Editor module (AudioLayerControl, filters, spectrum, etc.)
- `bootstrap/` - UI framework (v2.x)
- `jquery/` - jQuery 1.7.2

## Important Constraints

- **No module system** - all scripts loaded via `<script>` tags in dependency order (see index.html:271-292)
- **Global namespace** - modules expose constructors/objects to `window`
- **Modern AudioWorklet** - Uses AudioWorklet for audio processing (runs on separate audio rendering thread for better performance)

## Common Development Patterns

When working with audio data:

- Audio buffers are Float32Array (range -1.0 to 1.0)
- Stereo: separate left/right channels, interleaved for WAV format
- Sample rate from AudioContext (typically 44100 or 48000)

When modifying the editor:

- Editor operations work on `AudioSequence` objects containing channel data
- Changes must update both visual waveform and underlying buffer
- Link mode synchronises left/right channel editors

When debugging:

- Check browser console for Web Audio API availability
- Microphone permission must be granted
- Monitor worker messages for processing errors
