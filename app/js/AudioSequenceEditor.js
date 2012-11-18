function AudioLayerSequenceEditor(elementContext)
{
    this.elementContext = elementContext;
    this.elementContext.audioLayerSequenceEditor = this;
    
    // references to the elements
    this.audioLayerControl = undefined;
    this.canvasReference = undefined;
    this.audioSequenceReference = undefined;

    this.canvasHeight = 100;
    this.canvasWidth = elementContext.parentNode.parentNode.clientWidth - 50;
    
    this.name = name;
    
    // properties for the selection feature (mouse, ...)    
    
    // is the mouse inside of the editor (for background coloring)
    this.mouseInside = false;
    // state of the mouse button
    this.mouseDown = false;
    // is the mouse clicked inside of the selection
    this.mouseInsideOfSelection = false;

    // is the start or end bar selected
    this.mouseSelectionOfStart = false;
    this.mouseSelectionOfEnd = false;
    
    // current and previous position of the mouse
    this.mouseX = 0;
    this.mouseY = 0;
    this.previousMouseX = 0;
    this.previousMouseY = 0;
    
    // position of the selection (if equal, the selection is disabled)
    this.selectionStart = 0;
    this.selectionEnd = 0;
    
    // color states (gradient from top to bottom)
    
    // colors when the mouse is outside of the editor box
    this.colorInactiveTop = "#d7e5c7";
    this.colorInactiveBottom = "#d7e5c7";
    // colors when the mouse is inside of the editor box
    this.colorActiveTop = "#EEE";
    this.colorActiveBottom = "#CCC";
    // color when the mouse is pressed during inside of the editor box
    this.colorMouseDownTop = "#EEE";
    this.colorMouseDownBottom = "#CDC";
    // color of the selection frame
    this.colorSelectionStroke = "rgba(255,0,0,0.5)";
    this.colorSelectionFill = "rgba(255,0,0,0.2)";
    
    // temporary optimized visualization data    
    this.visualizationData = [];
    
    // handle focus for copy, paste & cut
    this.hasFocus = true;    
    
    // a list of editors which are linked to this one
    this.linkedEditors = [];
    
    // movement
    this.movePos = 0;
    this.movementActive = false;
    
    // zoom
    this.viewResolution = 10; // default 10 seconds
    this.viewPos = 0; // at 0 seconds
    
    // playback
    this.playbackPos = 0;
    
    this.link = function link(otherEditor)
    {
        for(var i = 0; i < this.linkedEditors.length; ++i)
        {
            if (this.linkedEditors[i] === otherEditor) return;
        }
        
        this.linkedEditors.push(otherEditor);
        otherEditor.link(this);
    }
    
    this.updateSelectionForLinkedEditors = function updateSelectionForLinkedEditors()
    {
        for(var i = 0; i < this.linkedEditors.length; ++i)
        {
            this.linkedEditors[i].selectionStart = this.selectionStart;
            this.linkedEditors[i].selectionEnd = this.selectionEnd;
            
            if (this.linkedEditors[i].viewPos != this.viewPos ||
                this.linkedEditors[i].viewResolution != this.linkedEditors[i].viewResolution)
            {
                this.linkedEditors[i].viewPos = this.viewPos;
                this.linkedEditors[i].viewResolution = this.viewResolution;
                this.linkedEditors[i].updateVisualizationData();
            }
            
            this.linkedEditors[i].repaint();
        }
    };
    
    /**
     * Create a new editor instance
     */
    this.createEditor = function createEditor()
    {
        // Create a canvas element from code and append it to the audiolayer
        this.canvasReference = document.createElement("canvas");
        this.canvasReference.setAttribute("class", "audioLayerEditor");
        this.canvasReference.width = this.canvasWidth;
        this.canvasReference.height = this.canvasHeight;
        this.canvasReference.style['border'] = '1px solid #b8d599';
        this.elementContext.appendChild(this.canvasReference);
        
        // add the mouse listener to the canvas
        this.addEventlistener();
        // do an intial repaint
        this.repaint();
    };    
    
    /**
     * Create a new editor instance with the given audio sequence reference
     * @param audioSequenceReference reference to the audio sequence which will be edited
     */
    this.setAudioSequence = function setAudioSequence(audioSequenceReference)
    {
        this.audioSequenceReference = audioSequenceReference;
        this.updateVisualizationData();
    };
    
    this.updateVisualizationData = function updateVisualizationData()
    {
        this.getDataInResolution(this.viewResolution, this.viewPos);
        
        // do an intial repaint
        this.repaint();
    }
    

    this.getDataInResolution = function getDataInResultion(resolution, offset)
    {
        this.visualizationData = [];
        var data = this.audioSequenceReference.data;
        var offsetR = this.audioSequenceReference.sampleRate * offset;
        
        // get the offset and length in samples
        var from = Math.round(offset * this.audioSequenceReference.sampleRate);
        var len = Math.round(resolution * this.audioSequenceReference.sampleRate);
        
        // when the spot is to large
        if (len > this.canvasReference.width)
        {
            var dataPerPixel = len / this.canvasReference.width;
            for (var i = 0; i < this.canvasReference.width; ++i)
            {
                var dataFrom = i * dataPerPixel + offsetR;
                var dataTo = (i + 1) * dataPerPixel + offsetR + 1;
                
                if (dataFrom >= 0 && dataFrom < data.length &&
                    dataTo >= 0 && dataTo < data.length)
                {
                    var peakAtFrame = this.getPeakInFrame(dataFrom, dataTo, data);
                    this.visualizationData.push(peakAtFrame);
                }
                else
                {
                    this.visualizationData.push({
                                                    min : 0.0,
                                                    max : 0.0
                                                })
                }
            }
            this.visualizationData.plotTechnique = 1;
        }
        else
        {
            var pixelPerData = this.canvasReference.width / len;
            var x = 0;
            for (var i = from; i <= from + len; ++i)
            {
                // if outside of the data range
                if (i < 0 || i >= data.length)
                {
                    this.visualizationData.push({
                                                    y : 0.0,
                                                    x : x
                                                });
                }
                else
                {
                    this.visualizationData.push({
                                                    y : data[i],
                                                    x : x
                                                });
                }
                x += pixelPerData;
            }
            this.visualizationData.plotTechnique = 2;
        }
    }
    
    /**
     * adding of several event listener for mouse and keyboard
     */
    this.addEventlistener = function addEventListener()
    {
        // need a reference of this in the canvas to react on events which has the local scope of the canvas
        this.canvasReference.eventHost = this;
        
        this.canvasReference.addEventListener("mouseover", function()
        {
            this.eventHost.mouseInside = true;
            this.eventHost.repaint(); 
        }, true);
        
        this.canvasReference.onmouseout = function()
        {
            if (this.eventHost.selectionStart > this.eventHost.selectionEnd)
            {
                var temp = this.eventHost.selectionStart;
                this.eventHost.selectionStart = this.eventHost.selectionEnd;
                this.eventHost.selectionEnd = temp;
            }
            
            // reset the selction mouse states for the selection
            this.eventHost.mouseInsideOfSelection = false;
            this.eventHost.mouseSelectionOfStart = false;
            this.eventHost.mouseSelectionOfEnd = false;
            this.eventHost.mouseDown = false;
            this.eventHost.mouseInside = false;
            this.eventHost.repaint();
            
            this.eventHost.updateSelectionForLinkedEditors();
        };
        
        this.canvasReference.onscroll = function(e)
        {
          debugger;  
        };
        
        this.canvasReference.onmousemove = function(e)
        {
            this.eventHost.previousMouseX = this.eventHost.mouseX;
            this.eventHost.previousMouseY = this.eventHost.mouseY;
            this.eventHost.mouseX = e.clientX - this.offsetLeft;
            this.eventHost.mouseY = e.clientY - this.offsetTop;
            var mouseXDelta = this.eventHost.mouseX - this.eventHost.previousMouseX;
            
            if (this.eventHost.mouseDown && this.eventHost.movementActive == false)
            {
                // if the mouse is inside of a selection, then move the whole selection
                if (this.eventHost.mouseInsideOfSelection)
                {
                    var absDelta = this.eventHost.getPixelToAbsolute(this.eventHost.mouseX) -
                    this.eventHost.getPixelToAbsolute(this.eventHost.previousMouseX);
                    
                    // move the selection with the delta
                    this.eventHost.selectionStart += absDelta;
                    this.eventHost.selectionEnd += absDelta;
                    this.eventHost.audioLayerControl.audioSequenceSelectionUpdate();
                    
                }
                // if the left bar is selected, then move it only
                else if (this.eventHost.mouseSelectionOfStart)
                {
                    this.eventHost.selectionStart = this.eventHost.getPixelToAbsolute(this.eventHost.mouseX);
                    //this.eventHost.audioLayerControl.audioSequenceSelectionUpdate();
                }
                // if the right bar is selected (default during creation of a selection), then move it only
                else
                {
                    this.eventHost.selectionEnd = this.eventHost.getPixelToAbsolute(this.eventHost.mouseX);
                    //this.eventHost.audioLayerControl.audioSequenceSelectionUpdate();
                }
            }
            
            if (this.eventHost.mouseDown && this.eventHost.movementActive)
            {
                var movementResolution = this.eventHost.viewResolution / this.eventHost.canvasReference.width;
                this.eventHost.viewPos -= mouseXDelta * movementResolution;
                this.selectionStart -= mouseXDelta * movementResolution;
                this.selectionEnd -= mouseXDelta * movementResolution;
                this.eventHost.updateVisualizationData();
            }
            
            this.eventHost.repaint();
            this.eventHost.updateSelectionForLinkedEditors();
        };
        
        this.canvasReference.onmousedown = function(e)
        {
            this.eventHost.mouseDown = true;
            
            if (this.eventHost.movementActive == false)
            {
                var selectionStartPixel = this.eventHost.getAbsoluteToPixel(this.eventHost.selectionStart);
                var selectionEndPixel = this.eventHost.getAbsoluteToPixel(this.eventHost.selectionEnd);
                
                // is the mouse inside of the selection right now
                if (this.eventHost.mouseX - 5 > selectionStartPixel &&
                    this.eventHost.mouseX + 5 < selectionEndPixel)
                {
                    this.eventHost.mouseInsideOfSelection = true;
                }
                // is the mouse on the left bar of the selection
                else if (this.eventHost.mouseX - 5 < selectionStartPixel &&
                         this.eventHost.mouseX + 5 > selectionStartPixel)
                {
                    this.eventHost.mouseSelectionOfStart = true;
                }
                // is the mouse on the right bar of the selection
                else if (this.eventHost.mouseX - 5 < selectionEndPixel &&
                         this.eventHost.mouseX + 5 > selectionEndPixel)
                {
                    this.eventHost.mouseSelectionOfEnd = true;
                }
                // if the mouse is somewhere else, start a new selection
                else
                {
                    this.eventHost.selectionStart = this.eventHost.getPixelToAbsolute(this.eventHost.mouseX);
                    this.eventHost.selectionEnd = this.eventHost.selectionStart;
                    console.log("Set " + this.eventHost.selectionStart);
                }
            }
            // get the focus on this editor
            focusOnAudioLayerSequenceEditor = this.eventHost;
            this.eventHost.repaint();
            this.eventHost.updateSelectionForLinkedEditors();
        };
        
    
        
        this.canvasReference.onmouseup = function()
        {
            // swap the selection position if start is bigger then end
            if (this.eventHost.selectionStart > this.eventHost.selectionEnd)
            {
                var temp = this.eventHost.selectionStart;
                this.eventHost.selectionStart = this.eventHost.selectionEnd;
                this.eventHost.selectionEnd = temp;
            }
            
            // reset the selction mouse states for the selection
            this.eventHost.mouseInsideOfSelection = false;
            this.eventHost.mouseSelectionOfStart = false;
            this.eventHost.mouseSelectionOfEnd = false;
            this.eventHost.mouseDown = false;
            this.eventHost.repaint();
            this.eventHost.updateSelectionForLinkedEditors();
        };
        
        this.canvasReference.ondblclick = function()
        {
            // deselect on double click
            if (this.eventHost.selectionStart != this.eventHost.selectionEnd)
            {
                this.eventHost.selectionStart = 0;
                this.eventHost.selectionEnd = 0;
            }
            else
            {
                this.eventHost.selectionStart = 0;
                this.eventHost.selectionEnd = this.eventHost.getPixelToAbsolute(this.eventHost.canvasReference.width);
            }
            
            this.eventHost.mouseDown = false;
            this.eventHost.mouseSelectionOfStart = false;
            this.eventHost.mouseSelectionOfEnd = false;
            this.eventHost.mouseInsideOfSelection = false;
            focusOnAudioLayerSequenceEditor = undefined;
            this.eventHost.repaint();
            this.eventHost.updateSelectionForLinkedEditors();
        };
        
        
    };
    
    /**
     * Repaint of the editor window
     */
    this.repaint = function repaint()
    {
        // no canvas, no paint
        if (this.canvasReference === undefined) return;
        // get the context for the sub methos
        var canvasContext = this.canvasReference.getContext('2d');
        // clear the drawing area
        this.clearCanvas(canvasContext);
        
        // draw background
        this.paintBackground(canvasContext);
            
        // if no audio sequence is attached, nothing can be rendered
        if (this.audioSequenceReference === undefined)
        {
            this.paintEmpty(canvasContext);
        }
        else
        {
            
        
            // draw the normal waveform 
            this.paintWaveform(canvasContext);
            
            // draw the selector rectangle
            this.paintSelector(canvasContext);
            
            
            this.paintTextInfo(canvasContext);
        }
        
    };
    
    /**
     * clear the canvas for redrawing
     * @param canvasContext reference to the drawing context of the canvas
     */
    this.clearCanvas = function clearCanvas(canvasContext)
    {
        canvasContext.clearRect(0, 0, this.canvasReference.width, this.canvasReference.height);
    };
    
    /**
     * paint in case of no sequence available
     * @param canvasContext reference to the drawing context of the canvas
     */
    this.paintEmpty = function paintEmpty(canvasContext)
    {
        var oldFont = canvasContext.font;
        var oldTextAlign = canvasContext.textAlign;
        var oldBaseline = canvasContext.textBaseline;

        canvasContext.font = 'italic 40px Calibri';
        canvasContext.textAlign = 'center';
        canvasContext.textBaseline = "middle"
        this.paintTextWithShadow("Drag audio file here to edit", canvasContext.canvas.clientWidth / 2.0, canvasContext.canvas.clientHeight / 2.0, "rgba(0,0,0,1)", canvasContext);
        
        canvasContext.font = oldFont;
        canvasContext.textAlign = 'left';
        canvasContext.textBaseline = 'top';
    };
    
    /**
     * paint the background of the editor
     * @param canvasContext reference to the drawing context of the canvas
     */
    this.paintBackground = function paintBackground(canvasContext)
    {
        var gradient = canvasContext.createLinearGradient(0, 0, 0, this.canvasReference.height);
        gradient.addColorStop(0, (this.mouseInside) ? (this.mouseDown) ? this.colorMouseDownTop : this.colorActiveTop : this.colorInactiveTop);
        gradient.addColorStop(1, (this.mouseInside) ? (this.mouseDown) ? this.colorMouseDownBottom : this.colorActiveBottom : this.colorInactiveBottom);
        canvasContext.fillStyle = gradient;
        canvasContext.fillRect(0, 0, this.canvasReference.width, this.canvasReference.height);
    };
    
    /**
     * Draw the waveform of the referenced audio sequence
     * @param canvasContext reference to the drawing context of the canvas
     */
    this.paintWaveform = function paintWaveform(canvasContext)
    {
        var seq = this.audioSequenceReference;
        var center = this.canvasReference.height / 2;
        
        // if the signal is above the 0db border, then a vertical zoomout must be applied
        var verticalMultiplier = (seq.gain < 1.0) ? 1.0 : 1.0 / seq.gain;     
        
        // for later use of sequencial context        
        var data = seq.data;
        
        //canvasContext.setLineWidth(1);
        canvasContext.strokeStyle = "rgba(0, 0,0,0.5)";                
        canvasContext.beginPath();
        canvasContext.moveTo(0, center);
        
        // choose the drawing style of the waveform
        if (this.visualizationData.plotTechnique == 1)
        {
            // data per pixel
            for (var i = 0; i < this.canvasReference.width; ++i)
            {
                var peakAtFrame = this.visualizationData[i];
                canvasContext.moveTo(i + 0.5, center + peakAtFrame.min * verticalMultiplier * -center);
                canvasContext.lineTo(i + 0.5, (center + peakAtFrame.max * verticalMultiplier * -center) + 1.0);
            }
            
        }
        else if (this.visualizationData.plotTechnique == 2)
        {
            var s = 1;
            
            for(var i = 0; i < this.visualizationData.length; ++i)
            {
                var x = this.visualizationData[i].x;
                var y = center + this.visualizationData[i].y * verticalMultiplier * -center;                   
                    
                canvasContext.lineTo(x, y);
                
                // draw edges around each data point
                canvasContext.moveTo(x + s, y - s);
                canvasContext.lineTo(x + s, y + s);
                canvasContext.moveTo(x - s, y - s);
                canvasContext.lineTo(x - s, y + s);
                canvasContext.moveTo(x - s, y + s);
                canvasContext.lineTo(x + s, y + s);
                canvasContext.moveTo(x - s, y - s);
                canvasContext.lineTo(x + s, y - s);
                
                canvasContext.moveTo(x, y);
            }
        }
        
        canvasContext.stroke(); 
        
        // draw the horizontal center line
        //canvasContext.setLineWidth(1.0);
        canvasContext.strokeStyle = "rgba(0, 0, 0,0.5)";                
        canvasContext.beginPath();
        canvasContext.moveTo(0, center);
        canvasContext.lineTo(this.canvasReference.width, center);
        canvasContext.stroke();   
    };
    
    /**
     * Draw the selector
     * @param canvasContext reference to the drawing context of the canvas
     */
    this.paintSelector = function paintSelector(canvasContext)
    {
        var selectionStartPixel = this.getAbsoluteToPixel(this.selectionStart);
        var selectionEndPixel = this.getAbsoluteToPixel(this.selectionEnd);
            
            
        if (this.selectionStart !== this.selectionEnd)
        {
            
            var start = (selectionStartPixel < selectionEndPixel) ? selectionStartPixel : selectionEndPixel;
            var width = (selectionStartPixel < selectionEndPixel) ? selectionEndPixel - selectionStartPixel : selectionStartPixel - selectionEndPixel;
            
            canvasContext.fillStyle = this.colorSelectionFill;
            canvasContext.fillRect(start, 0, width, this.canvasReference.height);
            
            canvasContext.strokeStyle = this.colorSelectionStroke;
            canvasContext.strokeRect(start, 0, width, this.canvasReference.height);
        }
        else
        {
            canvasContext.strokeStyle = this.colorSelectionStroke;
            //canvasContext.setLineWidth(1.0);               
            canvasContext.beginPath();
            canvasContext.moveTo(selectionStartPixel, 0);
            canvasContext.lineTo(selectionStartPixel, this.canvasReference.height);
            canvasContext.stroke(); 
        }
        
        var playbackPixelPos = this.getAbsoluteToPixel(this.playbackPos);
        if (playbackPixelPos > 0 && playbackPixelPos < this.canvasReference.width)
        {
            canvasContext.strokeStyle = this.colorSelectionStroke;
            //canvasContext.setLineWidth(1.0);               
            canvasContext.beginPath();
            canvasContext.moveTo(playbackPixelPos, 0);
            canvasContext.lineTo(playbackPixelPos, this.canvasReference.height);
            canvasContext.stroke();
        }
    };
    
    this.getPeakInFrame = function getPeakInFrame(from, to, data)
    {
        var fromRounded = Math.round(from);
        var toRounded = Math.round(to);
        var min = 1.0;
        var max = -1.0;
        
        if (fromRounded < 0 || toRounded > data.length) debugger;
        
        for (var i = fromRounded; i < toRounded; ++i)
        {
            var sample = data[i];
            
            max = (sample > max) ? sample : max;
            min = (sample < min) ? sample : min;
        }
        
        return {
            min : min,
            max : max
            };
    };
    
    this.paintTextInfo = function paintTextInfo(canvasContext)
    {
        this.paintTextWithShadow(this.title, 1, 10, "rgba(0,0,0,1)", canvasContext);
        this.paintTextWithShadow("Position: " + Math.round(this.viewPos), 1, 20, "rgb(0,0,0)", canvasContext);
        this.paintTextWithShadow("Selection: " + this.selectionStart +
                                 " - " + this.selectionEnd +
                                 " (" + (this.selectionEnd - this.selectionStart) + ")", 1, 30, "rgb(255,0,0)", canvasContext);
    }
    
    this.paintTextWithShadow = function paintTextWithShadow(text, x, y, style, canvasContext)
    {
        canvasContext.fillStyle = "rgba(0,0,0,0.25)";
        canvasContext.fillText(text,x + 1, y + 1);
        
        canvasContext.fillStyle = style;
        canvasContext.fillText(text,x, y);
    };
    
    this.getSelectionInDataRange = function getSelectionInDataRange()
    {
        var start = Math.round(this.audioSequenceReference.data.length / this.canvasReference.width * this.selectionStart);
        var end = Math.round(this.audioSequenceReference.data.length / this.canvasReference.width * this.selectionEnd);
        
        return {
            start : start,
            end : end
            };
    };
    
    this.selectDataInRange = function selectDataInRange(start, end)
    {
        this.selectionStart = Math.round(this.canvasReference.width / this.audioSequenceReference.data.length * start);
        this.selectionEnd = Math.round(this.canvasReference.width / this.audioSequenceReference.data.length * end);
    }
    
    this.getPixelToAbsolute = function getPixelToAbsolute(pixelValue)
    {
        if (this.audioSequenceReference === undefined) return 0;
        
        var totalSamplesInResolution = this.viewResolution * this.audioSequenceReference.sampleRate;
        var totalSamplesOffset = this.viewPos * this.audioSequenceReference.sampleRate;
        
        return Math.round(totalSamplesInResolution / this.canvasReference.width * pixelValue + totalSamplesOffset);
    };
    
    this.getAbsoluteToPixel = function getAbsoluteToPixel(absoluteValue)
    {
        if (this.audioSequenceReference === undefined) return 0;
        
        var totalSamplesInResolution = this.viewResolution * this.audioSequenceReference.sampleRate;
        var totalSamplesOffset = this.viewPos * this.audioSequenceReference.sampleRate;
    
        return (absoluteValue - totalSamplesOffset) / totalSamplesInResolution * this.canvasReference.width; 
    };
    
    this.getAbsoluteToSeconds = function getAbsoluteToSeconds(absoluteValue)
    {
        if (this.audioSequenceReference === undefined) return 0;
        
        return absoluteValue / this.audioSequenceReference.sampleRate;
    };
    
    this.getSecondsToAbsolute = function getSecondsToAbsolute(seconds)
    {
        if (this.audioSequenceReference === undefined) return 0;
        
        return seconds * this.audioSequenceReference.sampleRate;  
    };
    
    this.zoomIntoSelection = function zoomIntoSelection()
    {
        this.viewResolution = this.getAbsoluteToSeconds(this.selectionEnd - this.selectionStart);
        this.viewPos = this.getAbsoluteToSeconds(this.selectionStart);

        this.updateVisualizationData();
        this.updateSelectionForLinkedEditors();
        this.repaint();
    };
    
    this.zoomToFit = function zoomToFit()
    {
        this.viewPos = 0;
        this.viewResolution = this.getAbsoluteToSeconds(this.audioSequenceReference.data.length);
        
        this.updateVisualizationData();
        this.updateSelectionForLinkedEditors();
        this.repaint();
    };
    
    // APPLY EFFECTS
    this.filterNormalize = function filterNormalize()
    {
        var start = (this.selectionStart < 0) ? 0 : (this.selectionStart >= this.audioSequenceReference.data.length) ? this.audioSequenceReference.data.length - 1 : this.selectionStart;
        var end = (this.selectionEnd < 0) ? 0 : (this.selectionEnd >= this.audioSequenceReference.data.length) ? this.audioSequenceReference.data.length - 1 : this.selectionEnd;
        
        if (start == end)
        {
            this.audioSequenceReference.filterNormalize();
        }
        else
        {
            this.audioSequenceReference.filterNormalize(start, end - start);
        }
        
        this.updateVisualizationData();
        this.repaint();
    };
    
    this.filterFade = function filterFade(fadeIn)
    {
        var start = (this.selectionStart < 0) ? 0 : (this.selectionStart >= this.audioSequenceReference.data.length) ? this.audioSequenceReference.data.length - 1 : this.selectionStart;
        var end = (this.selectionEnd < 0) ? 0 : (this.selectionEnd >= this.audioSequenceReference.data.length) ? this.audioSequenceReference.data.length - 1 : this.selectionEnd;
        
         if (start == end)
        {
            this.audioSequenceReference.filterLinearFade((fadeIn === true) ? 0.0 : 1.0, (fadeIn === true) ? 1.0 : 0.0);
        }
        else
        {
            this.audioSequenceReference.filterLinearFade((fadeIn === true) ? 0.0 : 1.0, (fadeIn === true) ? 1.0 : 0.0, start, end - start);
        }
        
        this.updateVisualizationData();
        this.repaint();
    };
    
    this.filterGain = function filterGain(decibel)
    {
        var start = (this.selectionStart < 0) ? 0 : (this.selectionStart >= this.audioSequenceReference.data.length) ? this.audioSequenceReference.data.length - 1 : this.selectionStart;
        var end = (this.selectionEnd < 0) ? 0 : (this.selectionEnd >= this.audioSequenceReference.data.length) ? this.audioSequenceReference.data.length - 1 : this.selectionEnd;
        
        if (start == end)
        {
            this.audioSequenceReference.filterGain(this.getQuantity(decibel));
        }
        else
        {
            this.audioSequenceReference.filterGain(this.getQuantity(decibel), start, end - start);
        }
        
        this.updateVisualizationData();
        this.repaint();
    };
    
    this.filterSilence = function filterSilence()
    {
        var start = (this.selectionStart < 0) ? 0 : (this.selectionStart >= this.audioSequenceReference.data.length) ? this.audioSequenceReference.data.length - 1 : this.selectionStart;
        var end = (this.selectionEnd < 0) ? 0 : (this.selectionEnd >= this.audioSequenceReference.data.length) ? this.audioSequenceReference.data.length - 1 : this.selectionEnd;
        
        if (start == end)
        {
            this.audioSequenceReference.filterSilence();
        }
        else
        {
            this.audioSequenceReference.filterSilence(start, end - start);
        }
        
        this.updateVisualizationData();
        this.repaint();
    };
    
    this.getDecibel = function getDecibel(signalValue, signalMaxium)
    {
        return 20.0 * Math.log(signalValue / signalMaxium) / Math.LN10;
    };
    
    this.getQuantity = function getQuantity(decibel)
    {
        return Math.exp(decibel * Math.LN10 / 20.0);
    };
    
    // CLIPBOARD FUNCTIONALITY
    
    this.clipboardAudioSequence = undefined;            
    
    this.selectAll = function selectAll(processLinks)
    {
        this.selectionStart = 0;
        this.selectionEnd = this.audioSequenceReference.data.length;
        this.repaint();
    };
    
    this.copy = function copy(processLinks)
    {
        var start = (this.selectionStart < 0) ? 0 : (this.selectionStart >= this.audioSequenceReference.data.length) ? this.audioSequenceReference.data.length - 1 : this.selectionStart;
        var end = (this.selectionEnd < 0) ? 0 : (this.selectionEnd >= this.audioSequenceReference.data.length) ? this.audioSequenceReference.data.length - 1 : this.selectionEnd;
        
        this.clipboardAudioSequence = this.audioSequenceReference.clone(start, end - start);
        
        if (processLinks !== undefined && processLinks === true)
        {
            for (var i = 0; i < this.linkedEditors.length; ++i)
            {
                this.linkedEditors[i].copy(false);   
            }
        }   
    };
    
    this.paste = function paste(processLinks)
    {
        if (this.clipboardAudioSequence === undefined) return;
        
        if (this.selectionStart != this.selectionEnd)
        {
            this.del(false);
        }
        
        // paste before the data block begins 
        if (this.selectionEnd < 0)
        {
            // fill the space with zeros
            this.viewPos -= this.getAbsoluteToSeconds(this.selectionStart);
            this.audioSequenceReference.createZeroData(-this.selectionEnd, 0);
            this.audioSequenceReference.merge(this.clipboardAudioSequence, 0);
            this.selectionStart = 0;
            this.selectionEnd = this.clipboardAudioSequence.data.length;
            
        }
        // paste beyond the data block
        else if (this.selectionStart > this.audioSequenceReference.data.length)
        {
            this.audioSequenceReference.createZeroData(this.selectionStart - this.audioSequenceReference.data.length);
            this.audioSequenceReference.merge(this.clipboardAudioSequence);
            this.selectionEnd = this.selectionStart + this.clipboardAudioSequence.data.length;
        }
        // paste inside of the datablock
        else
        {
            this.audioSequenceReference.merge(this.clipboardAudioSequence, this.selectionStart);
            this.selectionStart = this.selectionStart;
            this.selectionEnd = this.selectionStart + this.clipboardAudioSequence.data.length;
        }
        
        this.updateVisualizationData();
        this.repaint();
        
        if (processLinks !== undefined && processLinks === true)
        {
            for (var i = 0; i < this.linkedEditors.length; ++i)
            {
                this.linkedEditors[i].paste(false);   
            }
        }
    };
    
   
    this.cut = function cut(processLinks)
    {
        var start = (this.selectionStart < 0) ? 0 : (this.selectionStart >= this.audioSequenceReference.data.length) ? this.audioSequenceReference.data.length - 1 : this.selectionStart;
        var end = (this.selectionEnd < 0) ? 0 : (this.selectionEnd >= this.audioSequenceReference.data.length) ? this.audioSequenceReference.data.length - 1 : this.selectionEnd;
        
        
        this.clipboardAudioSequence = this.audioSequenceReference.clone(start, end - start);
        
        
        this.del(false);
        this.selectionEnd = this.selectionStart;
        this.updateVisualizationData();
        if (processLinks !== undefined && processLinks === true)
        {
            for (var i = 0; i < this.linkedEditors.length; ++i)
            {
                this.linkedEditors[i].cut(false);   
            }
        }
    };
    
    this.del = function del(processLinks)
    {
        var start = (this.selectionStart < 0) ? 0 : (this.selectionStart >= this.audioSequenceReference.data.length) ? this.audioSequenceReference.data.length - 1 : this.selectionStart;
        var end = (this.selectionEnd < 0) ? 0 : (this.selectionEnd >= this.audioSequenceReference.data.length) ? this.audioSequenceReference.data.length - 1 : this.selectionEnd;
        
        this.audioSequenceReference.trim(start, end - start);
        this.updateVisualizationData();
                
        
        if (processLinks !== undefined && processLinks === true)
        {
            for (var i = 0; i < this.linkedEditors.length; ++i)
            {
                this.linkedEditors[i].del(false);   
            }
        }
    };
    
    // Scan for attributes during the creation
    if ((typeof this.elementContext.attributes.title !== undefined) &&
        this.elementContext.attributes.title !== null)
    {
        this.title = this.elementContext.attributes.title.value;
    }
    
    // Add this element to the hosting layer control
    if (this.elementContext.parentNode.nodeName.toLowerCase() === "audiolayercontrol")
    {
        this.audioLayerControl = this.elementContext.parentNode.audioLayerControl;
        this.audioLayerControl.addAudioLayerSequenceEditor(this);
        this.createEditor();
    }
}

// Handle copy & cut & paste
var focusOnAudioLayerSequenceEditor = undefined;    
var clipboardAudioSequence = undefined;
            
window.addEventListener("copy", function(e, f)
{
    if (focusOnAudioLayerSequenceEditor !== undefined)
    {
        focusOnAudioLayerSequenceEditor.copy(true);
    }
}, true);

window.addEventListener("paste", function(e, f)
{
    if (focusOnAudioLayerSequenceEditor !== undefined)
    {
        focusOnAudioLayerSequenceEditor.paste(true);
    }
}, true);

window.addEventListener("cut", function(e, f)
{
    if (focusOnAudioLayerSequenceEditor !== undefined)
    {
        focusOnAudioLayerSequenceEditor.cut(true);
    }
}, true);

window.addEventListener("scroll", function(e)
{
//debugger;
}, true);

window.addEventListener("keydown", function(e)
{
    
    
    if (focusOnAudioLayerSequenceEditor === undefined) return;
    
    if (e.keyCode == 46) // Delete
    {
        focusOnAudioLayerSequenceEditor.del(true);
    }
    
    if (e.keyCode == 81) // Q
    {
        focusOnAudioLayerSequenceEditor.movementActive = true;
    }
    
    if (e.keyCode == 32) // Space
    {
        document.querySelector("#audioLayerControl").playToggle();
        e.cancelBubble = true;
        e.returnValue = false;
    }
}, true);

window.addEventListener("keyup", function(e)
{
    if (focusOnAudioLayerSequenceEditor === undefined) return;
    
    if (e.keyCode == 81) // q
    {
        focusOnAudioLayerSequenceEditor.movementActive = false;
    }
}, true);