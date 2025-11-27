import React, { useState, useEffect } from 'react';

function MCQInput({ options, fun, name, initialValue = null }) {
  const [selectedOption, setSelectedOption] = useState(initialValue);

  useEffect(() => {
    if (selectedOption !== initialValue) {
      setSelectedOption(initialValue);
    }
  }, [initialValue]);

  const handleOptionChange = (event) => {
    setSelectedOption(event.target.value);
    fun(event.target.value)
  };

  return (
    <div>
      {options.map((option) => (
        <label key={option} className=" flex my-4 items-center opensans-regular text-[0.9rem] leading-[1.4rem] tab:text-[1.2rem] tab:leading-[2rem] mac:text-[1.1rem] mac:leading-[1.6rem] md:leading-[1.6rem] md:text-[1rem] text-[#2C2C2C] ">
          <input
            type="radio"
            name={name}
            value={option}
            checked={selectedOption === option}
            onChange={handleOptionChange}
            className="mr-4  w-5 h-5 mt-[2px] text-[#080594]  cursor-pointer"
            required
          />
          <div className='w-[70%] flex items-center opensans-regular'>{option}</div>
        </label>
      ))}
    </div>
  );
}

export default MCQInput;
