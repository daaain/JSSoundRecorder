var Sequencer = {
  bpm: 130,
  sounds: [],
  timer: undefined,
  beatLength: 7,
  beatCount: 0,

  _beat: function _beat() {
    $('#sequencerBoxes input:checkbox').removeAttr('checked');
    $('#sequencerBoxes input:checkbox').eq(this.beatCount).attr('checked','checked');
    
    for (var i = 0, l = this.sounds.length; i < l; i++) {
      if($(this.sounds[i]).find('input[type=checkbox]').eq(this.beatCount).is(":checked")) {
        $(this.sounds[i]).find('audio').get(0).play();
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
  dronegain.gain.value = 10.0;
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