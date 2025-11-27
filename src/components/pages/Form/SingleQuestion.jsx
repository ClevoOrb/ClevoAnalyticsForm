import { useEffect, useState } from "react";
import RatingInput from "./RatingInput";
import YesNoCheckbox from "./YesNoCheckbox";
import MCQInput from "./MCQInput";

export default function SingleQuestion({
  index,
  question,
  fun,
  hidden = "",
  spclq,
  mainq = () => {},
  subQ = () => {},
  initialData = null,
}) {
  const [option, setOption] = useState(initialData ? initialData[0] : "");
  const [suboption, setSuboption] = useState(initialData ? initialData[1] : "");
  const [data, setData] = useState(initialData || ["", ""]);

  useEffect(() => {
    if (initialData) {
      const newOption = initialData[0] || "";
      const newSuboption = initialData[1] || "";

      if (newOption !== option || newSuboption !== suboption) {
        setOption(newOption);
        setSuboption(newSuboption);
        setData(initialData);
      }
    }
  }, [JSON.stringify(initialData)]);

  const handleOptionChange = (val) => {
    if (val != question["subQuestionCondition"]) {
      if (typeof question["Sub-Question"] == "object") {
        question["Sub-Question"].map((mutiq, index) => {
          fun({ [mutiq["index"]]: ["", ""] });
        });
      } else {
        subQ(index, "delete");
        setSuboption("");
      }
    } else {
      if (typeof question["Sub-Question"] != "object") subQ(index, "add");
    }

    mainq(index, val);
    setOption(val);
  };

  const handleSubOptionChange = (val) => {
    setSuboption(val);
  };

  useEffect(() => {
    setData([option, suboption]);
  }, [option, suboption]);

  useEffect(() => {
    fun({ [index]: data });
  }, [data]);

  useEffect(() => {
    if (initialData && initialData[0]) {
      mainq(index, initialData[0]);
      if (initialData[0] === question["subQuestionCondition"] && typeof question["Sub-Question"] !== "object") {
        subQ(index, "add");
      }
    }
  }, []);

  return (
    <div className={` border-b-2 ${hidden} mt-1`}>
      <div className="my-8">
        <label className="opensans-semibold text-[#2C2C2C] text-[1rem] leading-[1.5rem] tab:text-[1.3rem] tab:leading-[2.1rem] mac:text-[1.2rem] mac:leading-[1.7rem] md:leading-[1.7rem] md:text-[1.1rem] text-left">
          {question["actuall index"] + 1 && !spclq
            ? question["actuall index"] + 1 + ". " + question["Question"]
            : index + 1 + ". " + question["Question"]}
        </label>
      </div>

      {question["Type"] === "boolean" ? (
        <YesNoCheckbox fun={handleOptionChange} index={question["index"]} initialValue={option} />
      ) : null}
      {question["Type"] === "rating" ? (
        <RatingInput fun={handleOptionChange} initialValue={option} />
      ) : null}
      {question["Type"] === "mcq" ? (
        <MCQInput
          fun={handleOptionChange}
          name={`group${index}`}
          options={question["Options"].split(",")}
          initialValue={option}
        />
      ) : null}

      {typeof question["Sub-Question"] == "object" ? (
        question["Sub-Question"].map((mutiq, index) => {
          return (
            <SingleQuestion
              question={mutiq}
              hidden={
                option == question["subQuestionCondition"] ? "" : "hidden"
              }
              fun={fun}
              index={mutiq["index"]}
              key={mutiq["index"]}
            />
          );
        })
      ) : question["Sub-Question"] !== "" &&
        option == question["subQuestionCondition"] ? (
        <div className="my-4">
          <label className="opensans-semibold text-[#2C2C2C] text-lg font-bold">{`${
            question["Sub-Question"].split(",")[1]
          }`}</label>
          {question["subQuestionType"] === "boolean" ? (
            <YesNoCheckbox fun={handleSubOptionChange} initialValue={suboption} />
          ) : null}
          {question["subQuestionType"] === "rating" ? (
            <RatingInput fun={handleSubOptionChange} initialValue={suboption} />
          ) : null}
          {question["subQuestionType"] === "mcq" ? (
            <MCQInput
              fun={handleSubOptionChange}
              name={`subgroup${index}`}
              options={question["Suboptions"].split(",")}
              initialValue={suboption}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
