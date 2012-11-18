window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
            

var callback_requestSuccess = undefined;
var callback_requestFailed = undefined;
var fileSystemEntry = undefined;

function getLocalStorage(sizeInBytes, requestSuccess, requestFailed)
{
    callback_requestSuccess = requestSuccess;
    callback_requestFailed = requestFailed;
    
    // Webkit quota request for persistant storage
    window.webkitStorageInfo.requestQuota(PERSISTENT, sizeInBytes, successfulQuotaRequest,failedQuotaRequest);
}

function successfulQuotaRequest(grantedBytes)
{
    window.requestFileSystem(PERSISTENT, grantedBytes, successfulFileSystemCreated, failedFileSystemCreation);
}

function failedQuotaRequest(errorCode)
{
    if (callback_requestFailed !== undefined) callback_requestFailed(errorCode);
}

function successfulFileSystemCreated(fileSystem)
{
    fileSystemEntry = fileSystem;
    if (callback_requestSuccess !== undefined) callback_requestSuccess(fileSystem);
    
}

function failedFileSystemCreation(errorCode)
{
    if (callback_requestFailed !== undefined) callback_requestFailed(errorCode);
}



function readFile(filename, readSuccess, readError)
{
    if (fileSystemEntry === undefined) debugger;
    
    fileSystemEntry.root.getFile(filename, {}, function(fileEntry)
    {
        fileEntry.file(function(file)
        {
            var reader = new FileReader();
            reader.onload = function(evt)
            {
                readSuccess(evt, this);
            };
            reader.readAsArrayBuffer(file);
        });   
    }, readError);  
}

function writeFile(filename, writeFunction, writeError)
{
    if (fileSystemEntry === undefined) debugger;
    
    var writeFunc = function()
    {
        var file = fileSystemEntry.root.getFile(filename, {create: true}, function(fileEntry)
        {
            var writer = fileEntry.createWriter(writeFunction);
        }, writeError);
    };
    
    removeFile(filename, writeFunc, writeFunc);
}

function removeFile(filename, removeCallback, removeError)
{
    fileSystemEntry.root.getFile(filename, {create: false}, function(fileEntry)
    {
        fileEntry.remove(removeCallback, removeError);
    }, removeError);
}