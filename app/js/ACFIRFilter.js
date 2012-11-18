////////////////////////////////////////////////////////////////////////////////
///
/// General FIR digital filter routines with MMX optimization.
///
/// Note : MMX optimized functions reside in a separate, platform-specific file,
/// e.g. 'mmx_win.cpp' or 'mmx_gcc.cpp'
///
/// Author        : Copyright (c) Olli Parviainen
/// Author e-mail : oparviai 'at' iki.fi
/// SoundTouch WWW: http://www.surina.net/soundtouch
///
////////////////////////////////////////////////////////////////////////////////
//
// Last changed  : $Date: 2006-09-18 22:29:22 $
// File revision : $Revision: 1.4 $
//
// $Id: FIRFilter.cpp,v 1.4 2006-09-18 22:29:22 martynshaw Exp $
//
////////////////////////////////////////////////////////////////////////////////
//
// License :
//
//  SoundTouch audio processing library
//  Copyright (c) Olli Parviainen
//
//  This library is free software; you can redistribute it and/or
//  modify it under the terms of the GNU Lesser General Public
//  License as published by the Free Software Foundation; either
//  version 2.1 of the License, or (at your option) any later version.
//
//  This library is distributed in the hope that it will be useful,
//  but WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
//  Lesser General Public License for more details.
//
//  You should have received a copy of the GNU Lesser General Public
//  License along with this library; if not, write to the Free Software
//  Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
//
////////////////////////////////////////////////////////////////////////////////


/*****************************************************************************
 *
 * Implementation of the class 'FIRFilter'
 *
 *****************************************************************************/

function ACFIRFilter()
{
    this.resultDivFactor = 0;
    this.length = 0;
    this.lengthDiv8 = 0;
    this.filterCoeffs = undefined;
    this.resultDivider = 0; 
    
    this.evaluateFilter = function(dest, src, numSamples)
    {
        var i, j, end;
        var sum;
        var dScaler = 1.0 / this.resultDivider;
    
    
        if (this.length === 0) debugger;
    
        end = numSamples - this.length;
        var srcPos = 0;
        for (var j = 0; j < end; j ++)
        {
            sum = 0;
            for (var i = 0; i < this.length; i += 4)
            {
                // loop is unrolled by factor of 4 here for efficiency
                sum += src[srcPos + i + 0] * this.filterCoeffs[i + 0] +
                       src[srcPos + i + 1] * this.filterCoeffs[i + 1] +
                       src[srcPos + i + 2] * this.filterCoeffs[i + 2] +
                       src[srcPos + i + 3] * this.filterCoeffs[i + 3];
            }

            sum *= dScaler;

            dest[j] = sum;
            srcPos++;
        }
        return end;
    }
    
    this.setCoefficients = function setCoefficients(coeffs, newLength, uResultDivFactor)
    {
        if (newLength === 0) debugger;
        if (newLength % 8) throw ("FIR filter length not divisible by 8");
    
        this.lengthDiv8 = newLength / 8;
        this.length = this.lengthDiv8 * 8;
        if (this.length !== newLength) debugger;
    
        this.resultDivFactor = uResultDivFactor;
        this.resultDivider = Math.pow(2., this.resultDivFactor);
    
        this.filterCoeffs = new Float32Array(this.length);
        for (var i = 0; i < this.filterCoeffs.length; ++i)
        {
            this.filterCoeffs[i] = coeffs[i];
        }
    }
    
    this.getLength = function getLength()
    {
        return this.length;
    }
}
