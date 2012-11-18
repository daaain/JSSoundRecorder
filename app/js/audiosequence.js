function AudioSequence()
{
    /// Name of the audio sequence (used for channel identification)
    this.name = "unnamed";
    this.sampleRate = 0;
    this.data = [];
    
    // gain level of the signal data (maximum value)
    this.gain = 0.0;
    
    /**
     * This function merges another sequence from with the same sampling rate
     * into this.
     * @param mergePosition optional position where the new data should be merged (default is the end of the data block)
     * */
    this.merge = function merge(otherAudioSequence, mergePosition)
    {
        // default parameters
        if (mergePosition === undefined) mergePosition = this.data.length;
        // requirement check
        if (otherAudioSequence.sampleRate !== this.sampleRate) throw "Samplerate does not match.";
        if (mergePosition < 0 || mergePosition > this.data.length) throw "Merge position is invalid!";
        
        // create a new data block
        var newData = [];
        
        // iterate through the local data block
        for (var i = 0; i <= this.data.length; ++i)
        {
            // if the position is reached where the merge has to be filled in
            if (i == mergePosition)
            {
                for (var j = 0; j < otherAudioSequence.data.length; ++j)
                {
                    newData.push(otherAudioSequence.data[j]);
                }
            }
            // copy from the old to the new local data block
            if (i < this.data.length)
            {
                newData.push(this.data[i]);
            }
        }
        // set new references
        this.data = newData;
        
        // update gain value
        this.gain = this.getGain();
    };
    
    /**
     * Cuts off a part of the data sequence
     * @param start beginning of the trim
     * @param len optional len length of the trim (default is till the end of the data block)
     **/
    this.trim = function trim(start, len)
    {
        // default parameter
        if (len === undefined) len = this.data.length - start;        
        
        if (start >= this.data.length || start < 0) throw "The start is invalid";
        if (start + len > this.data.length || len < 0) throw "The length is invalid.";    
        
        this.data.splice(start, len);
        
        // update gain value
        this.gain = this.getGain();
    };
    
    /**
     * Create a clone of this sequence. Optionally the clone can be partial
     * @param start Optional beginning of the data block which will be cloned (default is 0)
     * @param len Optional len of the data block which will be cloned (default is till the end of the data block)
     */
    this.clone = function clone(start, len)
    {
        // default parameter
        if (start === undefined) start = 0;
        if (len === undefined) len = this.data.length - start;
        
        // requirement check        
        if (start < 0 || start > this.data.length) throw "Invalid start parameter.";
        if (len < 0 || len + start > this.data.length) throw "Invalid len parameter.";
        
        // create new instance and copy array elements
        var clonedSequence = CreateNewAudioSequence(this.sampleRate);
        for(var i = start; i < start + len; ++i)
        {
            clonedSequence.data.push(this.data[i]);       
        }
        
        // Update the gain for the cloned sequence
        clonedSequence.gain = clonedSequence.getGain();        
        return clonedSequence;
    };
    
    /**
     * Creates a sequence with a specified length of data with value 0
     * @param len length of the 0 sequence
     * @param start optional insertion point for the 0 sequence (default is the end of the data block)
     */
    this.createZeroData = function createZeroData(len, start)
    {
        var emptyData = [];
        var i = len + 1;
        while(--i)
        {
            emptyData.push(0);
        }
        
        var tmpSequence = CreateNewAudioSequence(this.sampleRate, emptyData);
        this.merge(tmpSequence, start);
        
        // update gain value
        this.gain = this.getGain();
    };
    
    /**
     * Copies the data into a complex array
     * @param start optional beginning of the data point (default is 0)
     * @param len optional length of the data sequence (default is till the end of the data block)
     */
    this.toComplexSequence = function toComplexSequence(start, len)
    {
        // default parameter
        if (start === undefined) start = 0;
        if (len === undefined) len = this.data.length - start;
        
        // requirement check
        if (start < 0 || start > this.data.length) throw "start parameter is invalid.";
        if (len < 0 || len + start > this.data.length) throw "end parameter is invalid.";
        
        var result = [];
        
        for (var i = start; i < start + len; ++i)
        {
            result.push(this.data[i]);
            result.push(0);
        }
        
        return result;
    };
    
    /**
     * Overwrites the data with the given complex array data
     * @param complexArray the complex array which gets real value gets copied
     * @param start optional beginning in the data point (default is 0)
     * @param len optional length of the data sequence (default is till the end of the data block)
     */
    this.fromComplexSequence = function fromComplexSequence(complexArray, start, len)
    {
        // default parameter
        if (start === undefined) start = 0;
        if (len === undefined) len = this.data.length - start;
        
        // requirement check
        if (complexArray.length / 2 !== len) throw "length of complex array does not match";
        if (complexArray.length % 2 !== 0) throw "the length of the complex array is totally wrong";
        if (start < 0 || start > this.data.length) throw "start parameter is invalid.";
        if (len < 0 || len + start > this.data.length) throw "end parameter is invalid.";
        
        var complexArrayIdx = 0;
        for (var i = start; i < start + len; ++i)
        {
            this.data[i] = complexArray[complexArrayIdx];
            complexArrayIdx += 2;
        }
        
        // update gain value
        this.gain = this.getGain();
    };
    
    /**
     * Returns the gain (maximum amplitude)
     * @param start optional beginning in the data point (default is 0)
     * @param len optional length of the data sequence (default is till the end of the data block)
     */
    this.getGain = function getGain(start, len)
    {
        // default parameter
        if (start === undefined) start = 0;
        if (len === undefined) len = this.data.length - start;
        
        // requirement check
        if (start < 0 || start > this.data.length) throw "start parameter is invalid.";
        if (len < 0 || len + start > this.data.length) throw "end parameter is invalid.";
        
        var result = 0.0;
        for(var i = start; i < start + len; ++i)
        {
            // the amplitude could be positive or negative
            var absValue = Math.abs(this.data[i]);
            result = Math.max(result, absValue);
        }
        return result;
    }
    
    /**
     * Returns the total length of this sequence in seconds
     **/
    this.getLengthInSeconds = function getLengthInSeconds()
    {
        return this.data.length / this.sampleRate;
    }
    
    /**
     * Apply a normalize on the data block, which changes the data value to use the optimal bandwidth
     * @param start optional beginning in the data point (default is 0)
     * @param len optional length of the data sequence (default is till the end of the data block)
     */
    this.filterNormalize = function filterNormalize(start, len)
    {
        // default parameter
        if (start === undefined) start = 0;
        if (len === undefined) len = this.data.length - start;
        
        // requirement check
        if (start < 0 || start > this.data.length) throw "start parameter is invalid.";
        if (len < 0 || len + start > this.data.length) throw "end parameter is invalid.";
        
        // do a amplitude correction of the sequence
        var gainLevel = this.getGain(start, len);
        var amplitudeCorrection = 1.0 / gainLevel;
        for (var i = start; i < start + len; ++i)
        {
            this.data[i] = this.data[i] * amplitudeCorrection;
        }
        
        // update gain value
        this.gain = this.getGain();
    };
    
    /**
     * Change the gain of the sequence. The result will give the sequence more or less amplitude
     * @param gainFactor the factor which will be applied to the sequence
     * @param start optional beginning in the data point (default is 0)
     * @param len optional length of the data sequence (default is till the end of the data block)
     */
    this.filterGain = function filterGain(gainFactor, start, len)
    {
        // default parameter
        if (start === undefined) start = 0;
        if (len === undefined) len = this.data.length - start;
        
        // requirement check
        if (start < 0 || start > this.data.length) throw "start parameter is invalid.";
        if (len < 0 || len + start > this.data.length) throw "end parameter is invalid.";
        
        for (var i = start; i < start + len; ++i)
        {
            this.data[i] = this.data[i] * gainFactor;
        }
        
        // update gain value
        this.gain = this.getGain();
    };
    
    /**
     * Sets the data block to 0 (no amplitude = silence)
     * @param start optional beginning in the data point (default is 0)
     * @param len optional length of the data sequence (default is till the end of the data block)
     */
    this.filterSilence = function filterSilence(start, len)
    {
        this.filterGain(0.0, start, len);
    }
    
    /**
     * This function apply a fade effect on a given sequence range. The value of fadeStartGainFactor and fadeEndGainFactor
     * controls if the fade is an fadein or fadeout
     * @param fadeEndGainFactor The multiplier at the beginning of the fade
     * @param fadeEndGainFactor The multiplier at the end of the fade
     * @param start optional beginning in the data point (default is 0)
     * @param len optional length of the data sequence (default is till the end of the data block)
     */
    this.filterLinearFade = function filterLinearFade(fadeStartGainFactor, fadeEndGainFactor, start, len)
    {
        // default parameter
        if (start === undefined) start = 0;
        if (len === undefined) len = this.data.length - start;
        
        // requirement check
        if (start < 0 || start > this.data.length) throw "start parameter is invalid.";
        if (len < 0 || len + start > this.data.length) throw "end parameter is invalid.";
        
        var fadeGainMultiplier = 0.0;
        var fadePos = 0.0;
        for (var i = start; i < start + len; ++i)
        {
            fadePos = (i - start) / len;
            fadeGainMultiplier = MathEx.lerp(fadeStartGainFactor, fadeEndGainFactor, fadePos);
            
            this.data[i] = this.data[i] * fadeGainMultiplier;
               
        }   
        
        // update gain value
        this.gain = this.getGain();
    }
    
    /**
     * Process an reverse of the data block
     */
    this.filterReverse = function filterReverse()
    {
        this.data.reverse();
    };
    
    this.createTestTone = function createTestTone(frequency, sampleLength)
    {
        var data = [];
        var f = frequency / this.sampleRate;
        for (var i = 0; i < sampleLength; ++i)
        {
            data.push((Math.cos(2.0 * Math.PI * i * f) +
                      Math.cos(2.0 * Math.PI * i * f * 1)) / 2);   
        }
        
        this.data = data;
    };
}

/**
 * Creates a new empty or with data filled sequence with the given sample rate
 * @param sampleRate final samplerate of the sequence
 * @param data optional initialization data of the sequence
 */
function CreateNewAudioSequence(sampleRate, data)
{
    var sequence = new AudioSequence();
    sequence.sampleRate = sampleRate;
    sequence.data = [];
    if (data !== undefined)
    {
        sequence.data = [];
        for(var i = 0; i < data.length; ++i)
        {
            sequence.data.push(data[i]);
        }
    }
    return sequence;
}