/**
 * FormPreview.jsx
 *
 * A preview component that shows how the form will look with custom branding.
 * Displays a mini navbar with logo and 3 sample questions (MCQ, Checkbox, Rating).
 * Uses the actual form components to match the real form appearance.
 */

import { useState } from "react";
import MCQInput from "../Form/MCQInput";
import YesNoCheckbox from "../Form/YesNoCheckbox";
import RatingInput from "../Form/RatingInput";

// Default logos (fallback when no custom logo is provided)
const defaultLogoPC = "/assets/Logo1.svg";
const defaultLogoMobile = "/assets/LogoMobile.svg";

/**
 * FormPreview Component
 *
 * @param {string} logo - Custom logo (base64 string or URL)
 * @param {string} themeColor - Theme color for the preview
 * @param {string} formName - Name of the form to display
 * @param {string} className - Additional CSS classes
 */
export default function FormPreview({
  logo = null,
  themeColor = "#080594",
  formName = "Sample Form",
  className = "",
}) {
  // Sample question states
  const [mcqAnswer, setMcqAnswer] = useState(null);
  const [checkboxAnswer, setCheckboxAnswer] = useState("");
  const [ratingAnswer, setRatingAnswer] = useState(null);

  // Sample MCQ options
  const mcqOptions = ["Option A", "Option B", "Option C", "Option D"];

  // Calculate progress
  const answeredCount = (mcqAnswer ? 1 : 0) + (checkboxAnswer ? 1 : 0) + (ratingAnswer ? 1 : 0);
  const progressPercent = (answeredCount / 3) * 100;

  return (
    <div
      className={`w-full bg-gray-100 rounded-xl overflow-hidden shadow-lg ${className}`}
      style={{
        // Override CSS variable for this preview container so child components use the theme color
        "--color-dark": themeColor,
        "--color-accent": themeColor,
      }}
    >
      {/* Preview Label */}
      <div className="bg-gray-200 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Form Preview
      </div>

      {/* Mini Navbar */}
      <div
        className="w-full py-3 px-4 flex items-center justify-between"
        style={{ backgroundColor: themeColor }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2">
          {/* Default Logo - PC */}
          <img
            src={defaultLogoPC}
            alt="Default Logo"
            className="h-8 w-auto max-w-[80px] object-contain hidden sm:block"
          />
          {/* Default Logo - Mobile */}
          <img
            src={defaultLogoMobile}
            alt="Default Logo"
            className="h-8 w-auto max-w-[60px] object-contain sm:hidden"
          />
          {/* Show X and Custom Logo if provided */}
          {logo && (
            <>
              <span className="text-white/70 text-sm font-bold">X</span>
              <img
                src={logo}
                alt="Custom Logo"
                className="h-8 w-auto max-w-[80px] object-contain"
              />
            </>
          )}
        </div>

        {/* Form Name */}
        <div className="text-white text-sm font-bold arca truncate max-w-[50%]">
          {formName.toUpperCase()}
        </div>

        {/* Placeholder for rewards (disabled in preview) */}
        <div className="flex items-center gap-2 opacity-50">
          <div className="bg-white/20 rounded-full w-6 h-6 flex items-center justify-center">
            <span className="text-white text-xs">?</span>
          </div>
        </div>
      </div>

      {/* Section Header */}
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-lg font-bold text-gray-800 arca">Sample Section</h2>
        {/* Progress Bar */}
        <div className="h-2 bg-white border mt-2 rounded-md overflow-hidden">
          <div
            className="h-full rounded-md transition-all duration-300"
            style={{
              backgroundColor: themeColor,
              width: `${progressPercent}%`,
            }}
          />
        </div>
      </div>

      {/* Sample Questions - Using actual form components */}
      <div className="px-4 py-4 space-y-6">
        {/* Question 1: MCQ */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <p className="font-semibold text-[#2C2C2C] mb-2 opensans-semibold text-[0.9rem] leading-[1.4rem] tab:text-[1.2rem] tab:leading-[2rem] mac:text-[1.1rem] mac:leading-[1.6rem]">
            1. What is your preferred option?
          </p>
          <MCQInput
            options={mcqOptions}
            name="preview-mcq"
            fun={(val) => setMcqAnswer(val)}
            initialValue={mcqAnswer}
          />
        </div>

        {/* Question 2: Yes/No Checkbox */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <p className="font-semibold text-[#2C2C2C] mb-2 opensans-semibold text-[0.9rem] leading-[1.4rem] tab:text-[1.2rem] tab:leading-[2rem] mac:text-[1.1rem] mac:leading-[1.6rem]">
            2. Do you agree with the statement?
          </p>
          <YesNoCheckbox
            index={2}
            fun={(val) => setCheckboxAnswer(val)}
            initialValue={checkboxAnswer}
          />
        </div>

        {/* Question 3: Rating */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <p className="font-semibold text-[#2C2C2C] mb-2 opensans-semibold text-[0.9rem] leading-[1.4rem] tab:text-[1.2rem] tab:leading-[2rem] mac:text-[1.1rem] mac:leading-[1.6rem]">
            3. How would you rate your experience?
          </p>
          <RatingInput
            fun={(val) => setRatingAnswer(val)}
            initialValue={ratingAnswer}
          />
        </div>
      </div>

      {/* Footer Buttons (Preview Only) */}
      <div className="px-4 py-4 bg-white border-t flex justify-between">
        <button
          type="button"
          className="px-6 py-3 text-sm font-semibold uppercase rounded-full border-2 transition-all opensans-bold"
          style={{
            borderColor: themeColor,
            color: themeColor,
          }}
        >
          Go Back
        </button>
        <button
          type="button"
          className="px-8 py-3 text-sm font-semibold uppercase rounded-full text-white transition-all opensans-bold"
          style={{
            backgroundColor: answeredCount === 3 ? themeColor : "#8f8fae",
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}
