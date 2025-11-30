var Sequencer = {
  bpm: 130,
  sounds: [],
  timer: undefined,
  beatLength: 7,
  beatCount: 0,

  _beat: function _beat() {
    // Clear previous beat highlight
    $('#recordingslist th, #recordingslist td').removeClass('current-beat-column');
    $('#recordingslist input:checkbox').removeClass('current-beat');

    // Highlight current beat column (beatCount 0-7 maps to column 3-10)
    var colIndex = this.beatCount + 3;
    $('#recordingslist tr').each(function() {
      $(this).children().eq(colIndex).addClass('current-beat-column');
    });
    $('#recordingslist td:nth-child(' + (colIndex + 1) + ') input:checkbox').addClass('current-beat');
    
    for (var i = 0, l = this.sounds.length; i < l; i++) {
      if($(this.sounds[i]).find('input[type=checkbox]').eq(this.beatCount).is(":checked")) {
        var audio = $(this.sounds[i]).find('audio').get(0);
        audio.currentTime = 0;
        audio.play();
      }
    }

    this.beatCount++;
    if(this.beatCount > this.beatLength){ this.beatCount = 0; }
    this._play();
  },
  _play: function _play() {
    Sequencer.timer = setTimeout(function() {
      this._beat();
    }.bind(this), 1000 / (this.bpm / 60));
  },
  _stop: function _stop() {
    clearTimeout(Sequencer.timer);
    $('#recordingslist th, #recordingslist td').removeClass('current-beat-column');
    $('#recordingslist input:checkbox').removeClass('current-beat');
  },
  _reset: function _getSounds() {
    this.sounds = $('.soundBite');
    this.beatCount = 0;
  }
};


function startSequencer(button) {
  button.disabled = true;
  button.nextElementSibling.disabled = false;
  console.log('Playing...');

  volume.gain.value = 0;
  if ($('#droneToggle').is(':checked')) {
    // Resume the drone's AudioContext (may be suspended until user interaction)
    context.resume();
    dronegain.gain.value = 10.0;
  }
  Sequencer._reset();
  Sequencer._play();
}

function stopSequencer(button) {
  button.disabled = true;
  button.previousElementSibling.disabled = false;
  console.log('Stopped sequencer.');

  Sequencer._stop();
  volume.gain.value = volumeLevel;
  dronegain.gain.value = 0;
}