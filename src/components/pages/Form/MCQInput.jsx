import React, { useState, useEffect } from 'react';

function MCQInput({ options, fun, name, initialValue = null, themeMethod = 'solid' }) {
  const [selectedOption, setSelectedOption] = useState(initialValue);

  useEffect(() => {
    if (selectedOption !== initialValue) {
      setSelectedOption(initialValue);
    }
  }, [initialValue]);

  const handleOptionChange = (option) => {
    setSelectedOption(option);
    fun(option);
  };

  // Style for selected radio - gradient or solid based on themeMethod
  const selectedRadioStyle = {
    background: themeMethod === 'gradient'
      ? 'linear-gradient(135deg, var(--color-dark), var(--color-accent))'
      : 'var(--color-dark)',
    borderColor: 'var(--color-dark)',
  };

  const unselectedRadioStyle = {
    background: 'white',
    borderColor: '#d1d5db',
  };

  return (
    <div>
      {options.map((option) => (
        <label
          key={option}
          className="flex my-4 items-center opensans-regular text-[0.9rem] leading-[1.4rem] tab:text-[1.2rem] tab:leading-[2rem] mac:text-[1.1rem] mac:leading-[1.6rem] md:leading-[1.6rem] md:text-[1rem] text-[#2C2C2C] cursor-pointer"
          onClick={() => handleOptionChange(option)}
        >
          {/* Custom Radio Button */}
          <div
            className="w-5 h-5 rounded-full border-2 flex items-center justify-center mr-4 transition-all duration-300 flex-shrink-0"
            style={selectedOption === option ? selectedRadioStyle : unselectedRadioStyle}
          >
            {selectedOption === option && (
              <div className="w-2 h-2 rounded-full bg-white" />
            )}
          </div>
          <div className='w-[70%] flex items-center opensans-regular'>{option}</div>
        </label>
      ))}
    </div>
  );
}

export default MCQInput;
