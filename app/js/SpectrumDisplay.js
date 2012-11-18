function SpectrumDisplay(rootElement, divElement)
{
    this.rootElement = rootElement;
    
    this.canvasRef = document.createElement("canvas");
    this.canvasRef.id = "editor-spectrum";
    divElement.appendChild(this.canvasRef);
    this.canvasRef.width = divElement.clientWidth;
    this.canvasRef.height = divElement.clientHeight;
    this.buffer = new Float32Array(this.canvasRef.width);
    this.min = -150;// decibel
    this.max = 0;// decibel
    this.range = this.max - this.min;
    this.minRange = this.canvasRef.height;
    
    this.updateBuffer = function updateBuffer(frequencyData)
    {
        this.min = -150;
        this.max = 0;
        
        for(var i = 0; i < this.buffer.length; ++i)
        {
            var data = frequencyData[Math.round(frequencyData.length / this.buffer.length * i)];
            // clamp into range
            data = Math.min(this.max, Math.max(this.min, data));
            this.buffer[i] = data;
        }
    };
    
    this.paintSpectrum = function paintSpectrum()
    {
        var canvasContext = this.canvasRef.getContext('2d');
        canvasContext.clearRect(0, 0, this.canvasRef.width, this.canvasRef.height);
        
        canvasContext.strokeStyle = "#369bd7";
        canvasContext.beginPath();
        
        // fit the y to display all values
        var yFactor = this.canvasRef.height / this.range;
        
        for(var i = 0 ; i < this.buffer.length - 1; ++i)
        {
            canvasContext.moveTo(i + 0.5, this.buffer[i] * -1.0 * yFactor);
            canvasContext.lineTo(i + 1.5, this.buffer[i + 1] * -1.0 * yFactor);
        }
        canvasContext.stroke();
        
        canvasContext.fillStyle = canvasContext.strokeStyle;
        canvasContext.fillText(Math.round(this.max) + " db",0, 20);
        canvasContext.fillText(Math.round(this.min) + " db",0, this.canvasRef.height);
    };
}