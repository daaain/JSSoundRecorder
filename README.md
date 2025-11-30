# JSSoundRecorder

Update 2025/11/30: after more than a decade, I decided to update the app and make it work again with current browsers! Also updated the outdated snippets below, but left the rest mostly the same.

Record sounds / noises around you and turn them into music.

It’s a work in progress, at the moment it enables you to record live audio straight from your browser, edit it and save these sounds as a WAV file.

There's also a sequencer part where you can create small loops using these sounds with a drone synth overlaid on them.

See it working: <https://daaain.github.io/JSSoundRecorder>

## Technology

No servers involved, only Web Audio API with binary sound Blobs passed around!

### Web Audio API

#### GetUserMedia audio for live recording

Experimental API to record any system audio input (including USB soundcards, musical instruments, etc).

```javascript
// create AudioContext and request microphone access
var audio_context = new AudioContext();

const stream = await navigator.mediaDevices.getUserMedia({audio: true});
startUserMedia(stream);
```

#### Audio nodes for routing

You can route audio stream around, with input nodes (microphone, synths, etc), filters (volume / gain, equaliser, low pass, etc) and outputs (speakers, binary streams, etc).

```javascript
function startUserMedia(stream) {
  // create MediaStreamSource and GainNode
  var input = audio_context.createMediaStreamSource(stream);
  var volume = audio_context.createGain();
  volume.gain.value = 0.7;

  // connect them and pipe output
  input.connect(volume);
  volume.connect(audio_context.destination);
  
  // connect recorder as well - see below
  var recorder = new Recorder(input);
}
```

### AudioWorklet + WebWorker

Audio capture uses AudioWorklet (runs on the audio rendering thread for glitch-free recording), while heavy processing (interleaving, WAV encoding) is done in a WebWorker to not block the main thread.

```javascript
// Register AudioWorklet for capturing audio
this.context.audioWorklet.addModule('js/lib/recorder-worklet.js').then(function() {
  self.node = new AudioWorkletNode(self.context, 'recorder-worklet');

  // Forward audio data from worklet to worker for processing
  self.node.port.onmessage = function(e) {
    if (e.data.command === 'audioData') {
      worker.postMessage({
        command: 'record',
        buffer: e.data.buffer
      });
    }
  };

  source.connect(self.node);
});
```

```javascript
function record(inputBuffer){
  var bufferL = inputBuffer[0];
  var bufferR = inputBuffer[1];
  var interleaved = interleave(bufferL, bufferR);
  recBuffers.push(interleaved);
  recLength += interleaved.length;
}

function interleave(inputL, inputR){
  var length = inputL.length + inputR.length;
  var result = new Float32Array(length);

  var index = 0,
      inputIndex = 0;

  while (index < length){
    result[index++] = inputL[inputIndex];
    result[index++] = inputR[inputIndex];
    inputIndex++;
  }
  return result;
}
```

```javascript
function encodeWAV(samples){
  var buffer = new ArrayBuffer(44 + samples.length * 2);
  var view = new DataView(buffer);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length */
  view.setUint32(4, 32 + samples.length * 2, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, 1, true);
  /* channel count */
  view.setUint16(22, 2, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * 4, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, 4, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, samples.length * 2, true);

  floatTo16BitPCM(view, 44, samples);

  return view;
}
```

### Binary Blob

Instead of file drag and drop interface this binary blob is passed to editor.

Note: BlobBuilder deprecated (but a lot of examples use it), you should use Blob constructor instead!

```javascript
var f = new FileReader();
f.onload = function(e) {
  audio_context.decodeAudioData(e.target.result, function(buffer) {
      $('#audioLayerControl')[0].handleAudio(buffer);
    }, function(e) {
      console.warn(e);
    });
  };
f.readAsArrayBuffer(blob);
```

```javascript
function exportWAV(type){
  var buffer = mergeBuffers(recBuffers, recLength);
  var dataview = encodeWAV(buffer);
  var audioBlob = new Blob([dataview], { type: type });

  this.postMessage(audioBlob);
}
```

### Virtual File – URL.createObjectURL

You can create file download link pointing to WAV blob, but also set it as the source of an Audio element.

```javascript
var url = URL.createObjectURL(blob);
var audioElement = document.createElement('audio');
var downloadAnchor = document.createElement('a');

audioElement.controls = true;
audioElement.src = url;

downloadAnchor.href = url;
```

### TODO

* Sequencer top / status row should be radio buttons :)
* Code cleanup / restructuring
* Enable open / drag and drop files for editing
* Visual feedback (levels) for live recording
* Sequencer UI (and separation to a different module)

### Credits

Live recording code adapted from: <http://www.phpied.com/files/webaudio/record.html>

Editor code adapted from: <https://github.com/plucked/html5-audio-editor>
