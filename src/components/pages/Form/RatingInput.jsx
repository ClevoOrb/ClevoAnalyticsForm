import React, { useState, useEffect } from 'react';

function RatingInput({ fun, initialValue = null, themeMethod = 'solid', options = null }) {
  const [rating, setRating] = useState(initialValue ? String(initialValue) : null);

  // Parse options or use default 1-10
  const ratingOptions = options && options.length > 0
    ? options.map(opt => String(opt).trim())
    : ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

  // Determine the scale label based on options
  const getScaleLabel = () => {
    if (options && options.length > 0) {
      const min = options[0];
      const max = options[options.length - 1];
      return `Rate on a scale of ${min}-${max}:`;
    }
    return 'Rate on a scale of 1-10:';
  };

  useEffect(() => {
    const newRating = initialValue ? String(initialValue) : null;
    if (rating !== newRating) {
      setRating(newRating);
    }
  }, [initialValue]);

  const handleRatingChange = (value) => {
    setRating(String(value));
    fun(value);
  };

  // Style for selected state - gradient or solid based on themeMethod
  const selectedStyle = {
    background: themeMethod === 'gradient'
      ? 'linear-gradient(135deg, var(--color-dark), var(--color-accent))'
      : 'var(--color-dark)',
    color: 'white',
  };

  const unselectedStyle = {
    background: '#d4d3d3',
    color: 'black',
  };

  return (
    <div className='cursor-pointer'>
      <p className="font-semibold mb-4 opensans-semibold text-[#2C2C2C]">{getScaleLabel()}</p>

      <div className="flex gap-2 text-center cursor-pointer flex-wrap">
        {ratingOptions.map((value) => (
          <label
            onClick={() => handleRatingChange(value)}
            value={value}
            key={value}
            className="h-8 tb:h-12 opensans-semibold cursor-pointer rounded-md md:rounded-xl min-w-[2.5rem] px-2 flex justify-center items-center mb-2 text-[1rem] leading-[1.5rem] tab:text-[1.3rem] tab:leading-[2.1rem] mac:text-[1.2rem] mac:leading-[1.7rem] md:leading-[1.7rem] md:text-[1.1rem] tb:text-xl transition-all duration-300"
            style={rating === String(value) ? selectedStyle : unselectedStyle}
          >
            {value}
          </label>
        ))}
      </div>
    </div>
  );
}

export default RatingInput;
