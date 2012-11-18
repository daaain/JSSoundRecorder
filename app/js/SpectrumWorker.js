function SpectrumWorker()
{
    this.toFrequencyDomain = function toFrequencyDomain(timeDomainRealIn, timeDomainImagIn, start, len, realOut, imagOut)
    {
        if (start === undefined) start = 0;
        if (len === undefined) len = timeDomainRealIn.length;
        
        if (IsPowerOfTwo(len) !== true) throw "The length of the timeDomain has to be power of two!";
        
        var tempR = timeDomainRealIn.slice(start, start + len);
        var tempI = (timeDomainImagIn === undefined) ? undefined : timeDomainImagIn.slice(start, start + len);
        ACFFT(tempR.length, false, tempR, tempI, realOut, imagOut);
    };
    
    this.fromFrequencyDomain = function fromFrequencyDomain(freqDomainRealIn, freqDomainImagIn, realOut, imagOut)
    {
        if (freqDomainRealIn.length !== freqDomainImagIn) throw "The real and imaginary arrays have a different size";
        
        ACFFT(freqDomainRealIn.length, true, freqDomainRealIn, freqDomainImagIn, realOut, imagOut);
    };
    
    this.toAmplitudeSpectrum = function toAmplitudeSpectrum(timeDomainData, sampleRate, start, len, windowSize, windowFuncId)
    {
        if (start === undefined) start = 0;
        if (len === undefined) len = timeDomainData.length;
        if (windowSize === undefined) windowSize = 1024;
        if (windowFuncId === undefined) windowFuncId = 4;
        if (sampleRate === undefined) sampleRate = 44100;
        
        if (timeDomainData.length < windowSize || len < windowSize) throw "Length of the timeDomainData is to small (minimum is the windowSize: " + windowSize + ")";
        if (start < 0 || start >= timeDomainData.length) throw "Start is out of range";
        if (start + len > timeDomainData.length) throw "Length is out of range";
        
        var temp = timeDomainData.slice(start, start + len);
        var result = [];
        ComputeSpectrum(temp, temp.length, windowSize, sampleRate, result, false, windowFuncId);
        
        return result;
    };
    
    this.toAmplitudeSpectrumFromAudioSequence = function toAmplitudeSpectrumFromAudioSequence(audioSequence, start, len, windowSize, windowFuncId)
    {
        return this.toAmplitudeSpectrum(audioSequence.data, audioSequence.sampleRate, start, len, windowSize, windowFuncId);  
    };
    
    
}