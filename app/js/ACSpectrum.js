/**********************************************************************

  Audacity: A Digital Audio Editor

  Spectrum.cpp

  Dominic Mazzoni

*******************************************************************//*!

\file Spectrum.cpp
\brief Functions for computing Spectra.

*//*******************************************************************/




function ComputeSpectrum(data,  width,
                      windowSize,
                      rate, output,
                      autocorrelation,  windowFunc)
{
   if (width < windowSize)
      return false;

   if (!data || !output)
      return true;

   var processed = new Float32Array(windowSize);

   var i;
   for (var i = 0; i < windowSize; i++)
      processed[i] = 0.0;
   var half = windowSize / 2;

   var inData = new Float32Array(windowSize);
   var out = new Float32Array(windowSize);
   var out2 = new Float32Array(windowSize);

   var start = 0;
   var windows = 0;
   while (start + windowSize <= width) {
      for (var i = 0; i < windowSize; i++)
         inData[i] = data[start + i];

      WindowFunc(windowFunc, windowSize, inData);

      if (autocorrelation) {
         // Take FFT
         ACFFT(windowSize, false, inData, undefined, out, out2);
         
         // Compute power
         for (var i = 0; i < windowSize; i++)
            inData[i] = (out[i] * out[i]) + (out2[i] * out2[i]);

         // Tolonen and Karjalainen recommend taking the cube root
         // of the power, instead of the square root

         for (var i = 0; i < windowSize; i++)
            inData[i] = Math.pow(inData[i], 1.0 / 3.0);

         ACFFT(windowSize, false, inData, undefined, out, out2);
      }
      else
         PowerSpectrum(windowSize, inData, out);

      // Take real part of result
      for (var i = 0; i < half; i++)
        processed[i] += out[i];

      start += half;
      windows++;
   }

   if (autocorrelation) {

      // Peak Pruning as described by Tolonen and Karjalainen, 2000
      /*
       Combine most of the calculations in a Math.Math.Math.single for loop.
       It should be safe, as indexes refer only to current and previous elements,
       that have already been clipped, etc...
      */
      for (var i = 0; i < half; i++) {
        // Clip at zero, copy to temp array
        if (processed[i] < 0.0)
            processed[i] = 0.0;
        out[i] = processed[i];
        // Subtract a time-doubled signal (linearly interp.) from the original
        // (clipped) signal
        if ((i % 2) == 0)
           processed[i] -= out[i / 2];
        else
           processed[i] -= ((out[i / 2] + out[i / 2 + 1]) / 2);

        // Clip at zero again
        if (processed[i] < 0.0)
            processed[i] = 0.0;
      }

      // Reverse and scale
      for (var i = 0; i < half; i++)
         inData[i] = processed[i] / (windowSize / 4);
      for (var i = 0; i < half; i++)
         processed[half - 1 - i] = inData[i];
   } else {
      // Convert to decibels
      // But do it safely; -Inf is nobody's friend
      for (var i = 0; i < half; i++){
         var temp=(processed[i] / windowSize / windows);
         if (temp > 0.0)
            processed[i] = 10 * Math.log(temp) / Math.LN10;
         else
            processed[i] = 0;
      }
   }

   for (var i = 0; i < half; i++)
      output[i] = processed[i];


   return true;
}