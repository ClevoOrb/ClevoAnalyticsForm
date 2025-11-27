import React, { useState, useEffect } from 'react';

function YesNoCheckbox({ index, fun, initialValue = "" }) {
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

  return (
    <div className='w-full tabxl:w-[40%] mac:w-full h-[3rem] items-center flex mb-8 cursor-pointer'>
      <div className={`mac:w-[6rem] w-[50%] p-[0.5rem] rounded-l-md text-center opensans-semibold text-lg uppercase  ${yesChecked == "yes" ? "bg-[#080594] text-white border-2 border-[#080594]" : "text-[#080594] border-2 border-[#080594]"}`} onClick={() => handleChange("yes")}>
        Yes
      </div>
      <div className={`mac:w-[6rem] w-[50%] p-[0.5rem] rounded-r-md text-center opensans-semibold text-lg uppercase ${yesChecked == "no" ? "bg-[#080594] text-white border-2 border-[#080594]" : "text-[#080594] border-2 border-l-0 border-[#080594]"}`} onClick={() => handleChange("no")}>
        No
      </div>
    </div>
  );
}

export default YesNoCheckbox;
