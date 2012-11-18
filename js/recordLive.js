var audio_context;
var recorder;

function startUserMedia(stream) {
  var input = audio_context.createMediaStreamSource(stream);
  console.log('Media stream created.');
  
  input.connect(audio_context.destination);
  console.log('Input connected to audio context destination.');
  
  recorder = new Recorder(input);
  console.log('Recorder initialised.');
}

function startRecording(button) {
  recorder && recorder.record();
  button.disabled = true;
  button.nextElementSibling.disabled = false;
  console.log('Recording...');
}

function stopRecording(button) {
  recorder && recorder.stop();
  button.disabled = true;
  button.previousElementSibling.disabled = false;
  console.log('Stopped recording.');
  
  // create WAV download link using audio data blob
  createDownloadLink();
  
  recorder.clear();
}

function createDownloadLink() {
  recorder && recorder.exportWAV(function(blob) {
    var url = URL.createObjectURL(blob);
    var li = document.createElement('li');
    var audioElement = document.createElement('audio');
    //var downloadAnchor = document.createElement('a');
    var editButton = document.createElement('button');
    
    audioElement.controls = true;
    audioElement.src = url;

    // downloadAnchor.href = url;
    // downloadAnchor.download = new Date().toISOString() + '.wav';
    // downloadAnchor.innerHTML = downloadAnchor.download;

    editButton.onclick = function() {
      $('.recorder.container').addClass('hide');
      $('.editor.container').removeClass('invisible');

      var f = new FileReader();
      f.onload = function(e) {
          audio_context.decodeAudioData(e.target.result, function(buffer) {
            console.warn(buffer);
            $('#audioLayerControl')[0].handleAudio(buffer);
          }, function(e) {
            console.warn(e);
          });
      }
      f.readAsArrayBuffer(blob);
    }
    editButton.innerHTML = 'edit';

    li.appendChild(audioElement);
    // li.appendChild(downloadAnchor);
    li.appendChild(editButton);
    recordingslist.appendChild(li);
  });
}

window.onload = function init() {
  try {
    // webkit shim
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;
    window.URL = window.URL || window.webkitURL;
    
    audio_context = new AudioContext;
    console.log('Audio context set up.');
    console.log('navigator.getUserMedia ' + (navigator.getUserMedia ? 'available.' : 'not present!'));
  } catch (e) {
    alert('No web audio support in this browser!');
  }
  
  navigator.getUserMedia({audio: true}, startUserMedia, function(e) {
    console.log('No live audio input: ' + e);
  });
};