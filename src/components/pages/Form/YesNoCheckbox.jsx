import React, { useState, useEffect } from 'react';

function YesNoCheckbox({ index, fun, initialValue = "", themeMethod = 'solid' }) {
  const [yesChecked, setYesChecked] = useState(initialValue === "Yes" ? "yes" : initialValue === "No" ? "no" : "");

  useEffect(() => {
    const newChecked = initialValue === "Yes" ? "yes" : initialValue === "No" ? "no" : "";
    if (newChecked !== yesChecked) {
      setYesChecked(newChecked);
    }
  }, [initialValue]);

  const handleChange = (val) => {
    setYesChecked(val);
    if (val == "yes") {
      fun("Yes");
    } else {
      fun("No")
    }
  };

  // Style for selected state - gradient or solid based on themeMethod
  const selectedStyle = {
    background: themeMethod === 'gradient'
      ? 'linear-gradient(135deg, var(--color-dark), var(--color-accent))'
      : 'var(--color-dark)',
    color: 'white',
    borderColor: 'var(--color-dark)',
    borderWidth: '2px',
  };

  const unselectedStyle = {
    background: 'transparent',
    color: 'var(--color-dark)',
    borderColor: 'var(--color-dark)',
    borderWidth: '2px',
  };

  return (
    <div className='w-full tabxl:w-[40%] mac:w-full h-[3rem] items-center flex mb-8 cursor-pointer'>
      <div
        className="mac:w-[6rem] w-[50%] p-[0.5rem] rounded-l-md text-center opensans-semibold text-lg uppercase transition-all duration-300"
        style={yesChecked === "yes" ? selectedStyle : unselectedStyle}
        onClick={() => handleChange("yes")}
      >
        Yes
      </div>
      <div
        className="mac:w-[6rem] w-[50%] p-[0.5rem] rounded-r-md text-center opensans-semibold text-lg uppercase transition-all duration-300"
        style={{
          ...(yesChecked === "no" ? selectedStyle : unselectedStyle),
          borderLeftWidth: yesChecked === "no" ? '0px' : '0px',
        }}
        onClick={() => handleChange("no")}
      >
        No
      </div>
    </div>
  );
}

export default YesNoCheckbox;
