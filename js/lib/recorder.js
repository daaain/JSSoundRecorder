(function(window){

  var WORKER_PATH = 'js/lib/recorderWorker.js';
  var WORKLET_PATH = 'js/lib/recorder-worklet.js';

  var Recorder = function(source, cfg){
    var config = cfg || {};
    var bufferLen = config.bufferLen || 4096;
    this.context = source.context;
    this.node = null;
    this.isWorkletReady = false;
    var worker = new Worker(config.workerPath || WORKER_PATH);
    var recording = false;
    var currCallback;
    var self = this;

    // Initialize the WebWorker
    worker.postMessage({
      command: 'init',
      config: {
        sampleRate: this.context.sampleRate
      }
    });

    // Register and create AudioWorklet
    this.context.audioWorklet.addModule(config.workletPath || WORKLET_PATH).then(function() {
      self.node = new AudioWorkletNode(self.context, 'recorder-worklet');

      // Handle messages from the worklet
      self.node.port.onmessage = function(e) {
        if (e.data.command === 'audioData') {
          worker.postMessage({
            command: 'record',
            buffer: e.data.buffer
          });
        }
      };

      // Connect the source to the worklet
      source.connect(self.node);
      self.node.connect(self.context.destination);

      self.isWorkletReady = true;
    }).catch(function(error) {
      console.error('Failed to load recorder worklet:', error);
    });

    this.configure = function(cfg){
      for (var prop in cfg){
        if (cfg.hasOwnProperty(prop)){
          config[prop] = cfg[prop];
        }
      }
    }

    this.record = function(){
      if (!self.isWorkletReady) {
        console.warn('Worklet not ready yet');
        return;
      }
      recording = true;
      self.node.port.postMessage({ command: 'start' });
    }

    this.stop = function(){
      if (!self.isWorkletReady) return;
      recording = false;
      self.node.port.postMessage({ command: 'stop' });
    }

    this.clear = function(){
      worker.postMessage({ command: 'clear' });
    }

    this.getBuffer = function(cb) {
      currCallback = cb || config.callback;
      worker.postMessage({ command: 'getBuffer' })
    }

    this.exportWAV = function(cb, type){
      currCallback = cb || config.callback;
      type = type || config.type || 'audio/wav';
      if (!currCallback) throw new Error('Callback not set');
      worker.postMessage({
        command: 'exportWAV',
        type: type
      });
    }

    worker.onmessage = function(e){
      var blob = e.data;
      currCallback(blob);
    }
  };

  Recorder.forceDownload = function(blob, filename){
    var url = URL.createObjectURL(blob);
    var link = window.document.createElement('a');
    link.href = url;
    link.download = filename || 'output.wav';
    var click = document.createEvent("Event");
    click.initEvent("click", true, true);
    link.dispatchEvent(click);
  }

  window.Recorder = Recorder;

})(window);
