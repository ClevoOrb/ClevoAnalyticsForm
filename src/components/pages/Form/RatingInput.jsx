import React, { useState, useEffect } from 'react';

function RatingInput({ fun, initialValue = null, themeMethod = 'solid' }) {
  const [rating, setRating] = useState(initialValue ? Number(initialValue) : null);

  useEffect(() => {
    const newRating = initialValue ? Number(initialValue) : null;
    if (rating !== newRating) {
      setRating(newRating);
    }
  }, [initialValue]);

  const handleRatingChange = (value) => {
    setRating(Number(value));
    fun(Number(value))
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
      <p className="font-semibold mb-4 opensans-semibold text-[#2C2C2C]">Rate on a scale of 1-10:</p>

      <div className="flex gap-2 text-center cursor-pointer">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
          <label
            onClick={() => handleRatingChange(value)}
            value={value}
            key={value}
            className="h-8 tb:h-12 opensans-semibold cursor-pointer rounded-md md:rounded-xl w-[3rem] flex justify-center items-center mb-2 text-[1rem] leading-[1.5rem] tab:text-[1.3rem] tab:leading-[2.1rem] mac:text-[1.2rem] mac:leading-[1.7rem] md:leading-[1.7rem] md:text-[1.1rem] tb:text-xl transition-all duration-300"
            style={rating === value ? selectedStyle : unselectedStyle}
          >
            {value}
          </label>
        ))}
      </div>
    </div>
  );
}

export default RatingInput;
