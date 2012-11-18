/**********************************************************************

  FFT.cpp

  Dominic Mazzoni

  September 2000

*******************************************************************//*!

\file FFT.cpp
\brief Fast Fourier Transform routines.

  This file contains a few FFT routines, including a real-FFT
  routine that is almost twice as fast as a normal complex FFT,
  and a power spectrum routine when you know you don't care
  about phase information.

  Some of this code was based on a free implementation of an FFT
  by Don Cross, available on the web at:

    http://www.intersrv.com/~dcross/fft.html

  The basic algorithm for his code was based on Numerican Recipes
  in Fortran.  I optimized his code further by reducing array
  accesses, caching the bit reversal table, and eliminating
  float-to-double conversions, and I added the routines to
  calculate a real FFT and a real power spectrum.

*//*******************************************************************/
/*
  Salvo Ventura - November 2006
  Added more window functions:
    * 4: Blackman
    * 5: Blackman-Harris
    * 6: Welch
    * 7: Gaussian(a=2.5)
    * 8: Gaussian(a=3.5)
    * 9: Gaussian(a=4.5)
*/

var gFFTBitTable = undefined;
var MaxFastBits = 16;



function IsPowerOfTwo(x)
{
   if (x < 2)
      return false;

   if (x & (x - 1))             /* Thanks to 'byang' for this cute trick! */
      return false;

   return true;
}

function NumberOfBitsNeeded( PowerOfTwo)
{
   var i;

   if (PowerOfTwo < 2) {
      fprintf(stderr, "Error: FFT called with size %d\n", PowerOfTwo);
      exit(1);
   }

   for (var i = 0;; i++)
      if (PowerOfTwo & (1 << i))
         return i;
}

function ReverseBits( index,  NumBits)
{
   var i, rev;

   for (var i = rev = 0; i < NumBits; i++) {
      rev = (rev << 1) | (index & 1);
      index >>= 1;
   }

   return rev;
}

function ACInitFFT()
{
   gFFTBitTable = [];

   var len = 2;
   for (var b = 1; b <= MaxFastBits; b++) {

      gFFTBitTable[b - 1] = new Int32Array(len);

      for (var i = 0; i < len; i++)
         gFFTBitTable[b - 1][i] = ReverseBits(i, b);

      len <<= 1;
   }

   console.log("ACFFT initiliazed");
}

function DeinitFFT()
{
   if (gFFTBitTable) {
      for (var b = 1; b <= MaxFastBits; b++) {
         gFFTBitTable[b-1] = undefined;
      }
      gFFTBitTable = undefined;
   }
}

function FastReverseBits( i,  NumBits)
{
   if (NumBits <= MaxFastBits)
      return gFFTBitTable[NumBits - 1][i];
   else
      return ReverseBits(i, NumBits);
}

/*
 * Complex Fast Fourier Transform
 */

function ACFFT( NumSamples,
          InverseTransform,
          RealIn,  ImagIn,  RealOut,  ImagOut)
{
   var NumBits;                 /* Number of bits needed to store indices */
   var i, j, k, n;
   var BlockSize, BlockEnd;

   var angle_numerator = 2.0 * Math.PI;
   var tr, ti;                /* temp real, temp imaginary */

   if (!IsPowerOfTwo(NumSamples)) {
      console.log(NumSamples + " is not a power of two");
      return 1;
   }

   if (!gFFTBitTable)
      ACInitFFT();

   if (!InverseTransform)
      angle_numerator = -angle_numerator;

   NumBits = NumberOfBitsNeeded(NumSamples);

   /*
    **   Do simultaneous data copy and bit-reversal ordering into outputs...
    */

   for (var i = 0; i < NumSamples; i++) {
      j = FastReverseBits(i, NumBits);
      RealOut[j] = RealIn[i];
      ImagOut[j] = (ImagIn === undefined) ? 0.0 : ImagIn[i];
   }

   /*
    **   Do the FFT itself...
    */

   BlockEnd = 1;
   for (BlockSize = 2; BlockSize <= NumSamples; BlockSize <<= 1) {

      var delta_angle = angle_numerator /  BlockSize;

      var sm2 = Math.sin(-2 * delta_angle);
      var sm1 = Math.sin(-delta_angle);
      var cm2 = Math.cos(-2 * delta_angle);
      var cm1 = Math.cos(-delta_angle);
      var w = 2 * cm1;
      var ar0, ar1, ar2, ai0, ai1, ai2;

      for (var i = 0; i < NumSamples; i += BlockSize) {
         ar2 = cm2;
         ar1 = cm1;

         ai2 = sm2;
         ai1 = sm1;

         for (var j = i, n = 0; n < BlockEnd; j++, n++) {
            ar0 = w * ar1 - ar2;
            ar2 = ar1;
            ar1 = ar0;

            ai0 = w * ai1 - ai2;
            ai2 = ai1;
            ai1 = ai0;

            k = j + BlockEnd;
            tr = ar0 * RealOut[k] - ai0 * ImagOut[k];
            ti = ar0 * ImagOut[k] + ai0 * RealOut[k];

            RealOut[k] = RealOut[j] - tr;
            ImagOut[k] = ImagOut[j] - ti;

            RealOut[j] += tr;
            ImagOut[j] += ti;
         }
      }

      BlockEnd = BlockSize;
   }

   /*
      **   Need to normalize if inverse transform...
    */

   if (InverseTransform) {
      var denom = NumSamples;

      for (var i = 0; i < NumSamples; i++) {
         RealOut[i] /= denom;
         ImagOut[i] /= denom;
      }
   }
}

/*
 * Real Fast Fourier Transform
 *
 * This function was based on the code in Numerical Recipes in C.
 * In Num. Rec., the inner loop is based on a Math.single 1-based array
 * of interleaved real and imaginary numbers.  Because we have two
 * separate zero-based arrays, our indices are quite different.
 * Here is the correspondence between Num. Rec. indices and our indices:
 *
 * i1  <->  real[i]
 * i2  <->  imag[i]
 * i3  <->  real[n/2-i]
 * i4  <->  imag[n/2-i]
 */

function RealFFT( NumSamples,  RealIn,  RealOut,  ImagOut)
{

   var Half = NumSamples / 2;
   var i;

   var theta = Math.PI / Half;

   var tmpReal = new Float32Array(Half);
   var tmpImag = new Float32Array(Half);

   for (var i = 0; i < Half; i++) {
      tmpReal[i] = RealIn[2 * i];
      tmpImag[i] = RealIn[2 * i + 1];
   }

   ACFFT(Half, 0, tmpReal, tmpImag, RealOut, ImagOut);

   var wtemp = (Math.sin(0.5 * theta));

   var wpr = -2.0 * wtemp * wtemp;
   var wpi = -1.0 * (Math.sin(theta));
   var wr = 1.0 + wpr;
   var wi = wpi;

   var i3;

   var h1r, h1i, h2r, h2i;

   for (var i = 1; i < Half / 2; i++) {

      i3 = Half - i;

      h1r = 0.5 * (RealOut[i] + RealOut[i3]);
      h1i = 0.5 * (ImagOut[i] - ImagOut[i3]);
      h2r = 0.5 * (ImagOut[i] + ImagOut[i3]);
      h2i = -0.5 * (RealOut[i] - RealOut[i3]);

      RealOut[i] = h1r + wr * h2r - wi * h2i;
      ImagOut[i] = h1i + wr * h2i + wi * h2r;
      RealOut[i3] = h1r - wr * h2r + wi * h2i;
      ImagOut[i3] = -h1i + wr * h2i + wi * h2r;

      wr = (wtemp = wr) * wpr - wi * wpi + wr;
      wi = wi * wpr + wtemp * wpi + wi;
   }

   RealOut[0] = (h1r = RealOut[0]) + ImagOut[0];
   ImagOut[0] = h1r - ImagOut[0];
}


/*
 * PowerSpectrum
 *
 * This function computes the same as RealFFT, above, but
 * adds the squares of the real and imaginary part of each
 * coefficient, extracting the power and throwing away the
 * phase.
 *
 * For speed, it does not call RealFFT, but duplicates some
 * of its code.
 */

function PowerSpectrum( NumSamples,  In,  Out)
{
   var Half = NumSamples / 2;
   var i;

   var theta = Math.PI / Half;

   var tmpReal = new Float32Array(Half);
   var tmpImag = new Float32Array(Half);
   var RealOut = new Float32Array(Half);
   var ImagOut = new Float32Array(Half);

   for (var i = 0; i < Half; i++) {
      tmpReal[i] = In[2 * i];
      tmpImag[i] = In[2 * i + 1];
   }

   ACFFT(Half, 0, tmpReal, tmpImag, RealOut, ImagOut);

   var wtemp = (Math.sin(0.5 * theta));

   var wpr = -2.0 * wtemp * wtemp;
   var wpi = -1.0 * (Math.sin(theta));
   var wr = 1.0 + wpr;
   var wi = wpi;

   var i3;

   var h1r, h1i, h2r, h2i, rt, it;

   for (var i = 1; i < Half / 2; i++) {

      i3 = Half - i;

      h1r = 0.5 * (RealOut[i] + RealOut[i3]);
      h1i = 0.5 * (ImagOut[i] - ImagOut[i3]);
      h2r = 0.5 * (ImagOut[i] + ImagOut[i3]);
      h2i = -0.5 * (RealOut[i] - RealOut[i3]);

      rt = h1r + wr * h2r - wi * h2i;
      it = h1i + wr * h2i + wi * h2r;

      Out[i] = rt * rt + it * it;

      rt = h1r - wr * h2r + wi * h2i;
      it = -h1i + wr * h2i + wi * h2r;

      Out[i3] = rt * rt + it * it;

      wr = (wtemp = wr) * wpr - wi * wpi + wr;
      wi = wi * wpr + wtemp * wpi + wi;
   }

   rt = (h1r = RealOut[0]) + ImagOut[0];
   it = h1r - ImagOut[0];
   Out[0] = rt * rt + it * it;

   rt = RealOut[Half / 2];
   it = ImagOut[Half / 2];
   Out[Half / 2] = rt * rt + it * it;
}

/*
 * Windowing Functions
 */

function NumWindowFuncs()
{
   return 10;
}

function WindowFuncName(whichFunction)
{
   switch (whichFunction) {
   default:
   case 0:
      return "Rectangular";
   case 1:
      return "Bartlett";
   case 2:
      return "Hamming";
   case 3:
      return "Hanning";
   case 4:
      return "Blackman";
   case 5:
      return "Blackman-Harris";
   case 6:
      return "Welch";
   case 7:
      return "Gaussian(a=2.5)";
   case 8:
      return "Gaussian(a=3.5)";
   case 9:
      return "Gaussian(a=4.5)";
   }
}

function WindowFunc( whichFunction,  NumSamples,  inData)
{
   var i;
   var A;

   switch( whichFunction )
   {
   case 1:
      // Bartlett (triangular) window
      for (var i = 0; i < NumSamples / 2; i++) {
         inData[i] *= (i / NumSamples / 2.0);
         inData[i + (NumSamples / 2)] *=
             (1.0 - (i / NumSamples / 2.0));
      }
      break;
   case 2:
      // Hamming
      for (var i = 0; i < NumSamples; i++)
         inData[i] *= 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (NumSamples - 1));
      break;
   case 3:
      // Hanning
      for (var i = 0; i < NumSamples; i++)
         inData[i] *= 0.50 - 0.50 * Math.cos(2 * Math.PI * i / (NumSamples - 1));
      break;
   case 4:
      // Blackman
      for (var i = 0; i < NumSamples; i++) {
          inData[i] *= 0.42 - 0.5 * Math.cos (2 * Math.PI * i / (NumSamples - 1)) + 0.08 * Math.cos (4 * Math.PI * i / (NumSamples - 1));
      }
      break;
   case 5:
      // Blackman-Harris
      for (var i = 0; i < NumSamples; i++) {
          inData[i] *= 0.35875 - 0.48829 * Math.cos(2 * Math.PI * i /(NumSamples-1)) + 0.14128 * Math.cos(4 * Math.PI * i/(NumSamples-1)) - 0.01168 * Math.cos(6 * Math.PI * i/(NumSamples-1));
      }
      break;
   case 6:
      // Welch
      for (var i = 0; i < NumSamples; i++) {
          inData[i] *= 4*i/ NumSamples *(1-(i/NumSamples));
      }
      break;
   case 7:
      // Gaussian (a=2.5)
      // Precalculate some values, and simplify the fmla to try and reduce overhead
      A=-2*2.5*2.5;

      for (var i = 0; i < NumSamples; i++) {

          inData[i] *= Math.exp(A*(0.25 + ((i/NumSamples)*(i/NumSamples)) - (i/NumSamples)));
      }
      break;
   case 8:
      // Gaussian (a=3.5)
      A=-2*3.5*3.5;
      for (var i = 0; i < NumSamples; i++) {
          // reduced
          inData[i] *= Math.exp(A*(0.25 + ((i/NumSamples)*(i/NumSamples)) - (i/NumSamples)));
      }
      break;
   case 9:
      // Gaussian (a=4.5)
      A=-2*4.5*4.5;

      for (var i = 0; i < NumSamples; i++) {
          // reduced
          inData[i] *= Math.exp(A*(0.25 + ((i/NumSamples)*(i/NumSamples)) - (i/NumSamples)));
      }
      break;
   default:
      
   }
}

// Indentation settings for Vim and Emacs and unique identifier for Arch, a
// version control system. Please do not modify past this point.
//
// Local Variables:
// c-basic-offset: 3
// indent-tabs-mode: nil
// End:
//
// vim: et sts=3 sw=3
// arch-tag: 47691958-d393-488c-abc5-81178ea2686e

