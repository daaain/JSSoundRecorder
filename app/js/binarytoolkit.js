/* BinaryToolkit written by Rainer Heynke */
window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
window.URL = window.URL || window.webkitURL;

function BinaryReader(data)
{
    this.data = new Uint8Array(data);
    this.pos = 0;
    
    this.signMasks = [ 0x0, 0x80, 0x8000, 0x800000, 0x80000000 ];
    this.masks = [ 0x0, 0xFF + 1, 0xFFFF + 1, 0xFFFFFF + 1, 0xFFFFFFFF + 1 ];
    
    this.gotoString = function gotoString(value)
    {
        for(var i = this.pos; i < this.data.length; ++i)
        {
            if (value[0] == String.fromCharCode(this.data[i]))
            {
                var complete = true;
                for (var j = i; j < value.length + i; ++j)
                {
                    if (value[j - i] != String.fromCharCode(this.data[j]))
                    {
                        complete = false;
                        break;
                    }
                }
                
                if (complete == true)
                {
                    this.pos = i;
                    break;
                }
            }
        }
    }
    
    this.readUInt8 = function readUInt8(bigEndian)    
    {
        return this.readInteger(1, false, bigEndian);
    };
    
    this.readInt8 = function readInt8(bigEndian)    
    {
        return this.readInteger(1, true, bigEndian);
    };
    
    this.readUInt16 = function readUInt16(bigEndian)    
    {
        return this.readInteger(2, false, bigEndian);
    };
    
    this.readInt16 = function readInt16(bigEndian)    
    {
        return this.readInteger(2, true, bigEndian);
    };
    
    this.readUInt32 = function readUInt32(bigEndian)
    {
        return this.readInteger(4, false, bigEndian);
    };
    
    this.readInt32 = function readInt32(bigEndian)
    {
        return this.readInteger(4, true, bigEndian);
    };
    
    this.readString = function readString(size)
    {
        var r = "";
        var i = 0;
        
        for(i = 0; i < size; ++i)
        {
            r += String.fromCharCode(this.data[this.pos++]);
        }
        return r;
    };

    /* size = size in bytes (e.g. 1 = 8 bits, ...)
     * signed = boolean flag to define if the value is signed
     * bigEndian = boolean flag to define the decoding in big endian style
     */
    this.readInteger = function readInteger(size, signed, bigEndian)
    {
        if (this.pos + (size - 1) >= this.data.length) throw "Buffer overflow during reading.";
        
        var i = 0;
        var r = 0;
        
        // read the bytes
        for(i = 0; i < size; ++i)
        {
            if (bigEndian === true)
            {
                r = this.data[this.pos++] + (r << (i * 8));
            }
            else
            {
                r += (this.data[this.pos++] << (i * 8));
            }
        }
        
        // convert from unsigned to signed
        if (signed && r & this.signMasks[size])
        {
            r = r - this.masks[size];
        }
        
        return r;
    };
    
    this.eof = function eof()
    {
        return (this.data.length >= this.pos);
    };
}

function BinaryWriter(estimatedSize)
{
    this.estimatedSize = estimatedSize;
    this.pos = 0;
    this.data = new Uint8Array(estimatedSize);
    
    this.masks = [ 0x0, 0xFF + 1, 0xFFFF + 1, 0xFFFFFF + 1, 0xFFFFFFFF + 1 ];
    
    this.writeUInt8 = function writeUInt8(value, bigEndian)    
    {
        return this.writeInteger(value, 1, bigEndian);
    };
    
    this.writeInt8 = function writeInt8(value, bigEndian)    
    {
        return this.writeInteger(value, 1, bigEndian);
    };
    
    this.writeUInt16 = function writeUInt16(value, bigEndian)    
    {
        return this.writeInteger(value, 2, bigEndian);
    };
    
    this.writeInt16 = function writeInt16(value, bigEndian)    
    {
        return this.writeInteger(value, 2, bigEndian);
    };
    
    this.writeUInt32 = function writeUInt32(value, bigEndian)
    {
        return this.writeInteger(value, 4, bigEndian);
    };
    
    this.writeInt32 = function writeInt32(value, bigEndian)
    {
        return this.writeInteger(value, 4, bigEndian);
    };
    
    this.writeString = function writeString(value)
    {
        var i = 0;
        for(i = 0; i < value.length; ++i)
        {
            this.data[this.pos++] = value.charCodeAt(i);
        }
    };
    
    /* value = the actual value which want to get stored
    * size = size in bytes of the value
    * bigEndian = flag to store the number in big endian style
    */
   this.writeInteger = function writeInteger(value, size, bigEndian)
   {
       var r = value;
       var i = 0;
       
       // convert to unsigned if value is negative
       if (value < 0)
       {
           r += this.masks[size];
       }
       
       // write the bytes
       for(i = 0; i < size; ++i)
       {
           if (bigEndian === true)
           {
               this.data[this.pos++] = (r >> ((size - i - 1) * 8)) & 0xFF;
           }
           else
           {
               this.data[this.pos++] = (r >> (i * 8)) & 0xFF;
           }
       }
   };
}