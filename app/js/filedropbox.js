/* Cross Browser Support */
    window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
    window.URL = window.URL || window.webkitURL;
    
/* The FileDropbox prepares a HTMLElement to be a drop container and loads the first dropped file into a array */
function FileDropbox()
{
    this.result = null;
    this.resultArrayBuffer = null;
    this.onFinish = null;
    this.onFail = null;

    this.defineDropHandler = function defineDropHandler(dropContainerElement)
    {
        // init event handlers
        dropContainerElement.addEventListener("dragenter", this.skipEventHandler, false);
        dropContainerElement.addEventListener("dragexit", this.skipEventHandler, false);
        dropContainerElement.addEventListener("dragover", this.skipEventHandler, false);
        dropContainerElement.addEventListener("drop", this.dropHandler, false);
        dropContainerElement.masterObj = this; // need to define this controller for further events
    };
    
    this.skipEventHandler = function skipEventHandler(evt)
    {
        evt.stopPropagation();
        evt.preventDefault();
    };
    
    this.dropHandler = function dropHandler(evt)
    {
        evt.stopPropagation();
        evt.preventDefault();
        
        // get list of dropped files 
        var files = evt.dataTransfer.files;
        // amount of dropped files
        var count = files.length;
        
        // One file at least neccessary to continue
        if (count > 0)
        {
            handleFiles(files, evt.currentTarget.masterObj);
        }
    };
    
    function handleFiles(files, masterObj)
    {
        // handle only the first file (no multifile support) 
        var file = files[0];
        // create the reader to access the local file (note: browser have different security restrictions) 
        var reader = new FileReader();
        
        // init the reader event handlers
        reader.onload = function (evt)
        {
            var arrayBuffer = evt.target.result;
            
            masterObj.resultArrayBuffer = arrayBuffer;
            // write into the result array
            masterObj.result = new Uint8Array(arrayBuffer);
            
            // callback
            if (masterObj.onFinish !== null)
            {
                masterObj.onFinish();
            }
        }; // event handle on success
        
        reader.onerror = masterObj.onFail; // event handle on failure
        
        // load the file as array buffer
        reader.readAsArrayBuffer(file);
    }
    
    
};