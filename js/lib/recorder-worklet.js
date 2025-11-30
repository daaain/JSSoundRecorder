/**
 * RecorderWorkletProcessor - Modern AudioWorklet replacement for ScriptProcessor
 * Captures stereo audio and passes it to the WebWorker for processing
 */
class RecorderWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.isRecording = false;

    // Listen for messages from the main thread
    this.port.onmessage = (e) => {
      if (e.data.command === 'start') {
        this.isRecording = true;
      } else if (e.data.command === 'stop') {
        this.isRecording = false;
      }
    };
  }

  process(inputs, outputs, parameters) {
    // If not recording, just pass through
    if (!this.isRecording) {
      return true;
    }

    const input = inputs[0];

    // Make sure we have input
    if (!input || input.length === 0) {
      return true;
    }

    // Get left and right channels (or duplicate mono to stereo)
    const leftChannel = input[0];
    const rightChannel = input.length > 1 ? input[1] : input[0];

    // Send the audio data to the main thread, which will forward to WebWorker
    // Copy the arrays since they will be reused
    this.port.postMessage({
      command: 'audioData',
      buffer: [
        new Float32Array(leftChannel),
        new Float32Array(rightChannel)
      ]
    });

    // Keep the processor alive
    return true;
  }
}

registerProcessor('recorder-worklet', RecorderWorkletProcessor);
