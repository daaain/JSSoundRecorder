/**
 * NoiseWorkletProcessor - Modern AudioWorklet replacement for noise generation
 * Generates white noise for the drone synthesizer
 */
class NoiseWorkletProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const output = outputs[0];

    // Generate white noise for all channels
    for (let channel = 0; channel < output.length; channel++) {
      const outputChannel = output[channel];
      for (let i = 0; i < outputChannel.length; i++) {
        // White noise: random value between -1 and 1
        outputChannel[i] = Math.random() * 2 - 1;
      }
    }

    // Keep the processor alive
    return true;
  }
}

registerProcessor('noise-worklet', NoiseWorkletProcessor);
