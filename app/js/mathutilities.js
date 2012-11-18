var MathEx = new function MathEx()
{
    this.lerp = function lerp(start, end, percentage)
    {
        if (start < end)
        {
            return start + (end - start) * percentage;
        }
        else
        {
            return end + (start - end) * (1.0 - percentage);
        }
    };
}

