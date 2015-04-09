function AudioPlayback()
{
    /**
     * This is the internal update event to fill the buffer with the audio data
     */
    this.onAudioUpdate = function onAudioUpdate(evt)
    {
        var audioPlayback = this.eventHost;
        var bufferSize = audioPlayback.audioBufferSize;
        var elapsedTime = bufferSize / audioPlayback.sampleRate;
        
        // return if playback was stopped
        if (audioPlayback.isPlaying === false) return;
        
        // reference to the audio data arrays and audio buffer
        var audioData = audioPlayback.audioDataRef;
        var leftBuffer = evt.outputBuffer.getChannelData(0);
        var rightBuffer = evt.outputBuffer.getChannelData(1);
        
        if (audioData.length == 1) // mono
        {
            audioPlayback.copyChannelDataToBuffer(leftBuffer, audioData[0], audioPlayback.currentPlayPosition, bufferSize, audioPlayback.playStart, audioPlayback.playEnd, audioPlayback.isLooped);
            audioPlayback.currentPlayPosition = audioPlayback.copyChannelDataToBuffer(rightBuffer, audioData[0], audioPlayback.currentPlayPosition, bufferSize, audioPlayback.playStart, audioPlayback.playEnd, audioPlayback.isLooped);
        }
        else if (audioData.length == 2) // stereo
        {
            audioPlayback.copyChannelDataToBuffer(leftBuffer, audioData[0], audioPlayback.currentPlayPosition, bufferSize, audioPlayback.playStart, audioPlayback.playEnd, audioPlayback.isLooped);
            audioPlayback.currentPlayPosition = audioPlayback.copyChannelDataToBuffer(rightBuffer, audioData[1], audioPlayback.currentPlayPosition, bufferSize, audioPlayback.playStart, audioPlayback.playEnd, audioPlayback.isLooped);
        }
        
        // the playback is done
        if (audioPlayback.currentPlayPosition === undefined)
        {
            // stop playing, disconnect buffer
            audioPlayback.stop();
        }
        else
        {
            // Update the notification listener
            audioPlayback.lastPlaybackUpdate -= elapsedTime;
            if (audioPlayback.lastPlaybackUpdate < 0.0)
            {
                audioPlayback.lastPlaybackUpdate = audioPlayback.playbackUpdateInterval;
                audioPlayback.notifyUpdateListener();
            }
        }
    };
    
    /**
     * Copies the audio data to a channel buffer and sets the new play position. If looping is enabled,
     * the position is set automaticly.
     * @param bufferReference Reference to the channel buffer 
     * @param dataReference Reference to the audio data
     * @param position Current position of the playback
     * @param len Length of the chunk
     * @param startPosition Start position for looping
     * @param endPosition End position for looping
     * @param isLooped Enable looping.
     */
    this.copyChannelDataToBuffer = function copyChannelDataToBuffer(bufferReference, dataReference, position, len, startPosition, endPosition, isLooped)
    {
        /* In order to enable looping, we should need to split up when the end of the audio data is reached
         * to begin with the first position. Therefore is a split into two ranges if neccessary
         */
        var firstSplitStart = position;
        var firstSplitEnd = (position + len > dataReference.length) ?
                                        dataReference.length : (position + len > endPosition) ?
                                                    endPosition : (position + len);
                                                    
        var firstSplitLen = firstSplitEnd - firstSplitStart;
        
        var secondSplitStart = (firstSplitLen < bufferReference.length) ?
                                        (isLooped) ? startPosition : 0 : undefined;
                                        
        var secondSplitEnd = (secondSplitStart !== undefined) ? bufferReference.length - firstSplitLen + secondSplitStart : undefined;
        
        var secondSplitOffset = bufferReference.length - (firstSplitEnd - firstSplitStart);
        
        if (secondSplitStart === undefined)
        {
            this.copyIntoBuffer(bufferReference, 0, dataReference, firstSplitStart, firstSplitEnd);
            return firstSplitEnd;
        }
        else
        {
            this.copyIntoBuffer(bufferReference, 0, dataReference, firstSplitStart, firstSplitEnd);
            
            if (isLooped)
            {                
                this.copyIntoBuffer(bufferReference, firstSplitLen, dataReference, secondSplitStart, secondSplitEnd);
       
                return secondSplitEnd;
            }
            else
            {
                return undefined;
            }
        }
    };
    
    /**
     * copies data from an array to the buffer with fast coping methods
     */
    this.copyIntoBuffer = function copyIntoBuffer(bufferReference, bufferOffset, dataReference, dataOffset, end)
    {
        bufferReference.set(dataReference.slice(dataOffset, end), bufferOffset);  
    };
    
    
    this.play = function play(audioDataRef, sampleRate, isLooped, start, end)
    {
        // check if already playing or no data was given
        if (this.isPlaying || audioDataRef === undefined || audioDataRef.length < 1 ||
            sampleRate === undefined || sampleRate <= 0) return;
              
                    
        // update playback variables
        this.audioDataRef = audioDataRef;
        this.sampleRate = sampleRate;
        this.isLooped = (isLooped === undefined) ? false : isLooped;
        this.playStart = (start === undefined || start < 0 || start >= audioDataRef[0].length) ? 0 : start;
        this.playEnd = (end === undefined || end - this.audioBufferSize < start || end >= audioDataRef[0].length) ? audioDataRef[0].length : end;
        this.currentPlayPosition = this.playStart;
        this.isPlaying = true;
        
        // connect the node, play!
        this.javaScriptNode.connect(this.analyserNode);
        
        // inform updatelistener
        this.notifyUpdateListener();
    };
    
    /**
     * Stops the playback and set all references to undefined (no resume possible)
     */
    this.stop = function stop()
    {
        // no playing audio, nothing to stop
        if (this.isPlaying === false) return;
        
        // diconnect the node, stop!
        this.javaScriptNode.disconnect(this.analyserNode);
        
        // set all playback information to default
        this.playStart = 0;
        this.playEnd = 0;
        this.isLooped = false;
        this.currentPlayPosition = 0;
        this.isPlaying = false;
        this.lastPlaybackUpdate = 0;
        
        // remove reference to the audio data
        this.audioDataRef = undefined;
        this.sampleRate = 0;
        
        // inform updatelistener
        this.notifyUpdateListener();
    };
    
    /**
     * Pause the playback of the audio
     */
    this.pause = function pause()
    {
        // no playing audio, nothing to pause
        if (this.isPlaying === false) return;
        this.isPlaying = false;
        this.lastPlaybackUpdate = 0;
        
        // diconnect the node, stop!
        this.audioJavaScriptNode.disconnect(this.analyserNode);
        
        // inform updatelistener
        this.notifyUpdateListener();
    };
    
    /**
     * Resume the audio playback from the last position
     */
    this.resume = function resume()
    {
        // check if already playing or no data was given
        if (this.isPlaying || this.audioDataRef === undefined || this.audioDataRef.length < 1) return;
        this.isPlaying = true;
        
        // connect the node, play!
        this.audioJavaScriptNode.connect(this.analyserNode);
        
        // inform updatelistener
        this.notifyUpdateListener();
    };
    
    /**
     * Add an update listener, which gets informed about changes in playback
     */
    this.addUpdateListener = function addUpdateListener(updateCallback)
    {
        this.updateListener.push(updateCallback);
    };
    
    /**
     * Notifies all update listener
     */
    this.notifyUpdateListener = function notifyUpdateListener()
    {
        for(var i = 0; i < this.updateListener.length; ++i)
        {
            this.updateListener[i].audioPlaybackUpdate();
        }
    };
    
    // Creation of a new audio context
    this.audioBufferSize = 1024;
    this.sampleRate = 0;
    this.audioContext = new AudioContext();

    // The JavaScriptNode is used to modifiy the output buffer    
    this.javaScriptNode = this.audioContext.createScriptProcessor(this.audioBufferSize, 1, 2);
    this.javaScriptNode.onaudioprocess = this.onAudioUpdate;
    this.javaScriptNode.eventHost = this;
    
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.minDecibels = -100;
    this.analyserNode.maxDecibels = 0;
    this.analyserNode.smoothingTimeConstant = 0.0;
    this.analyserNode.connect(this.audioContext.destination);
    
    this.audioDataRef = undefined;
    
    // Playback information
    this.playStart = 0;
    this.playEnd = 0;
    this.isLooped = false;
    this.currentPlayPosition = 0;
    this.isPlaying = false;
    
    // Callback information
    this.updateListener = [];
    this.playbackUpdateInterval = 0.0; // in Seconds
    this.lastPlaybackUpdate = 0;
    
}