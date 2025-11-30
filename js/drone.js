var context = new AudioContext();

//connect gain
var dronegain = context.createGain();
dronegain.gain.value = 0;
dronegain.connect(context.destination);
var recorder = new Recorder(dronegain);

var noiseNodes = [];
var workletLoaded = false;

function createNoiseGen(freq) {
  if (!workletLoaded) {
    console.warn('Worklet not loaded yet');
    return;
  }

  var panner = context.createPanner();
  var max = 20;
  var min = -20;
  var x = rand(min, max);
  var y = rand(min, max);
  var z = rand(min, max);
  panner.setPosition(x, y, z);
  panner.connect(dronegain);

  var filter = context.createBiquadFilter();
  filter.type = 'bandpass';  // Modern string-based type instead of deprecated constant
  filter.frequency.value = freq;
  filter.Q.value = 150;
  filter.connect(panner);

  // Create noise source using AudioWorklet
  var noiseSource = new AudioWorkletNode(context, 'noise-worklet', {
    numberOfInputs: 0,
    numberOfOutputs: 1,
    outputChannelCount: [2]
  });
  noiseSource.connect(filter);
  noiseNodes.push(noiseSource);

  setInterval(function () {
    x = x + rand(-0.1, 0.1);
    y = y + rand(-0.1, 0.1);
    z = z + rand(-0.1, 0.1);
    panner.setPosition(x, y, z);
  }, 500);

}

var scale = [0.0, 2.0, 4.0, 6.0, 7.0, 9.0, 11.0, 12.0, 14.0];

function generate(){
  var base_note = parseInt($('#BaseNote').val());
  var num_osc = parseInt($('#NumOsc').val());
  for (var i = 0; i < num_osc; i++) {
    var degree = Math.floor(Math.random() * scale.length);
    var freq = mtof(base_note + scale[degree]);
    freq += Math.random() * 4 - 2;
    createNoiseGen(freq);
  }
}

function mtof(m) {
  return Math.pow(2, (m - 69) / 12) * 440;
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function reset(){
  while (noiseNodes.length){
    noiseNodes.pop().disconnect();
  }
  generate();
}

function bindEvents(){
  var controls = $(".control");
  controls.each(function(){
    $(this).data('lastVal', $(this).val());
    var id = $(this).attr('id');
    $("label[for='"+id+"'] .controlVal").text($(this).val());
  });

  controls.on('mouseup keyup', function(){
    var control = $(this);
    var val = control.val();
    if (val !== control.data('lastVal')){
      control.data('lastVal', val);
      reset();
    }
  });

  controls.change(function(){
    var id = $(this).attr('id');
    $("label[for='"+id+"'] .controlVal").text($(this).val());
  });

  // $('#StartRec').click(recorder.record);
  // $('#StopRec').click(recorder.stop);
  // $('#Export').click(function(){
  //   recorder.exportWAV(function(blob){
  //     Recorder.forceDownload(blob);
  //   });
  // });
}

function showIntro(line){
  line = line || $(".intro p").first();

  line.transition({ opacity: 1 }, 700, function(){
    var next = $(this).next();
    if (next.length){
      setTimeout(showIntro, 500, next);
    }
  });
}

function setUpAnimateFallback(){
  if (!$.support.transition){
    $.fn.transition = $.fn.animate;
  }
}

$(window).load(function(){
  //setUpAnimateFallback();

  // Load the noise worklet, then initialise drone
  context.audioWorklet.addModule('js/noise-worklet.js').then(function() {
    workletLoaded = true;
    console.log('Noise worklet loaded');
    generate();
    bindEvents();
  }).catch(function(error) {
    console.error('Failed to load noise worklet:', error);
  });

  //showIntro();
});