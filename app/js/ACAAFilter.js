
////////////////////////////////////////////////////////////////////////////////
///
/// FIR low-pass (anti-alias) filter with filter coefficient design routine and
/// MMX optimization.
///
/// Anti-alias filter is used to prevent folding of high frequencies when
/// transposing the sample rate with interpolation.
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
// $Id: AAFilter.cpp,v 1.4 2006-09-18 22:29:22 martynshaw Exp $
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

function ACAAFilter(length)
{
    if (length === undefined) length = 32;
    
    this.pFIR = new ACFIRFilter();
    this.cutoffFreq = 0.9;
    this.length = 0;
    
    this.setCutoffFreq = function setCutoffFreq(newCutoffFreq)
    {
        this.cutoffFreq = newCutoffFreq;
        this.calculateCoeffs();
    };
    
    this.setLength = function setLength(newLength)
    {
        this.length = newLength;
        this.calculateCoeffs();
    };
        
    this.calculateCoeffs = function calculateCoeffs()
    {
        var i;
        var cntTemp, temp, tempCoeff,h, w;
        var fc2, wc;
        var scaleCoeff, sum;
        var work;
        var coeffs;
    
        if (this.length <= 0 || this.length % 4 != 0 || this.cutoffFreq < 0 || this.cutoffFreq > 1.5) debugger;
    
        work = new Float32Array(this.length);
        this.coeffs = new Float32Array(this.length);
    
        fc2 = 2.0 * this.cutoffFreq;
        wc = Math.PI * fc2;
        tempCoeff = Math.PI * 2 / length;
    
        sum = 0;
        for (i = 0; i < this.length; i ++)
        {
            cntTemp = i - (this.length / 2);
    
            temp = cntTemp * wc;
            if (temp != 0)
            {
                h = fc2 * Math.sin(temp) / temp;                     // sinc function
            }
            else
            {
                h = 1.0;
            }
            w = 0.54 + 0.46 * Math.cos(tempCoeff * cntTemp);       // hamming window
    
            temp = w * h;
            work[i] = temp;
    
            // calc net sum of coefficients
            sum += temp;
        }
    
        // ensure the sum of coefficients is larger than zero
      /*  assert(sum > 0);
    
        // ensure we've really designed a lowpass filter...
        assert(work[length/2] > 0);
        assert(work[length/2 + 1] > -1e-6);
        assert(work[length/2 - 1] > -1e-6);
    */
        // Calculate a scaling coefficient in such a way that the result can be
        // divided by 16384
        scaleCoeff = 16384.0 / sum;
    
        for (var i = 0; i < this.length; i ++)
        {
            // scale & round to nearest integer
            temp = work[i] * scaleCoeff;
            temp += (temp >= 0) ? 0.5 : -0.5;
            // ensure no overfloods
            if (temp < -32768 || temp > 32767) debugger;
            this.coeffs[i] = temp;
        }
    
        // Set coefficients. Use divide factor 14 => divide result by 2^14 = 16384
        this.pFIR.setCoefficients(this.coeffs, this.length, 14);
    }    
    
    this.evaluate = function evaluate(dest, src, numSamples)
    {
        return this.pFIR.evaluateFilter(dest, src, numSamples);
    };
    
    this.getLength = function getLength()
    {
        return this.pFIR.getLength();
    };
    
    this.setLength(length);
}

