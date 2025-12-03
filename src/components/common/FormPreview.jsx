/**
 * FormPreview.jsx
 *
 * A preview component that shows how a form will look with the selected
 * theme colors and custom logo. Supports gradient and solid fill methods.
 */

// No useState needed - preview is static and non-interactive

// Default logos
const defaultLogoPC = "/assets/Logo1.svg";
const defaultLogoMobile = "/assets/LogoMobile.svg";

export default function FormPreview({
  themeColor = "#080594",  // Dark/primary color
  accentColor = "#08b7f6", // Accent/secondary color
  themeMethod = "solid", // "gradient" or "solid" (solid by default)
  logoPC = null,    // Custom logo for PC/Desktop
  logoMobile = null, // Custom logo for Mobile
  formName = "Sample Form"
}) {
  // Sample question states - prefilled with default answers for preview
  // These values are static since the preview is non-interactive
  const mcqAnswer = "Option B";
  const checkboxAnswer = "Yes";
  const ratingAnswer = 8;

  // Sample MCQ options
  const mcqOptions = ["Option A", "Option B", "Option C", "Option D"];

  // Calculate progress
  const answeredCount = (mcqAnswer ? 1 : 0) + (checkboxAnswer ? 1 : 0) + (ratingAnswer ? 1 : 0);
  const progressPercent = (answeredCount / 3) * 100;

  // Fill styles based on theme method
  // Gradient: uses both colors in a gradient
  // Solid: uses only the dark/primary color (matches RatingInput, YesNoCheckbox, MCQInput, buttons)
  const isGradient = themeMethod === "gradient";
  const fillBg = isGradient
    ? `linear-gradient(135deg, ${themeColor}, ${accentColor})`
    : themeColor;

  return (
    <div
      className="border-2 border-gray-200 rounded-2xl overflow-hidden bg-gray-50 shadow-lg"
      style={{
        "--color-dark": themeColor,
        "--color-accent": accentColor,
      }}
    >
      {/* Preview Label */}
      <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Live Preview
        </span>
      </div>

      {/* Mini Navbar */}
      <div
        className="px-4 py-3 flex items-center justify-between bg-[var(--color-dark)]"
      >
        <div className="flex items-center gap-2">
          {/* Desktop: Show default PC logo + custom PC logo if exists */}
          <div className="hidden sm:flex items-center gap-2">
            <img
              src={defaultLogoPC}
              alt="Default Logo"
              className="h-8 w-auto max-w-[80px] object-contain"
            />
            {logoPC && (
              <>
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                <img
                  src={logoPC}
                  alt="Custom Logo"
                  className="h-8 w-auto max-w-[80px] object-contain"
                />
              </>
            )}
          </div>
          {/* Mobile: Show default mobile logo + custom mobile logo if exists */}
          <div className="flex sm:hidden items-center gap-1">
            <img
              src={defaultLogoMobile}
              alt="Default Logo"
              className="h-7 w-auto max-w-[50px] object-contain"
            />
            {logoMobile && (
              <>
                <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                <img
                  src={logoMobile}
                  alt="Custom Logo"
                  className="h-7 w-auto max-w-[50px] object-contain"
                />
              </>
            )}
          </div>
        </div>
        <div className="absolute left-1/2 transform -translate-x-1/2 text-sm text-white arca">
                {formName.toUpperCase() || "FORM NAME"}
              </div>
        <div className="flex items-center gap-2">
          <div className="bg-white/20 rounded-full px-2 py-1 flex items-center gap-1">
            <span className="text-yellow-300 text-xs">&#9733;</span>
            <span className="text-white text-xs font-bold">100</span>
          </div>
        </div>
      </div>

      {/* Section Header & Progress Bar - always uses accent color */}
      <div className="px-4 pt-4">
        <div className="text-lg font-bold text-gray-800 arca">Sample Section</div>
        <div className="h-2 bg-white border mt-2 rounded-md overflow-hidden">
          <div
            className="h-full rounded-md transition-all duration-500"
            style={{ background: accentColor, width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Sample Questions - pointer-events-none makes it uninteractive */}
      <div className="p-4 space-y-6 pointer-events-none">
        {/* Question 1: MCQ with Radio Buttons */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="font-semibold text-[#2C2C2C] mb-3 opensans-semibold text-[0.9rem] leading-[1.4rem]">
            1. What is your preferred option?
          </p>
          <div className="space-y-2">
            {mcqOptions.map((option) => (
              <label
                key={option}
                className="flex items-center gap-3 cursor-pointer text-sm text-gray-700 opensans-regular"
                onClick={() => setMcqAnswer(option)}
              >
                <div
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                  style={{
                    borderColor: mcqAnswer === option ? themeColor : "#d1d5db",
                    background: mcqAnswer === option ? fillBg : "white",
                  }}
                >
                  {mcqAnswer === option && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
                <span>{option}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Question 2: Yes/No Checkbox */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="font-semibold text-[#2C2C2C] mb-3 opensans-semibold text-[0.9rem] leading-[1.4rem]">
            2. Do you agree with the statement?
          </p>
          <div className="flex w-full max-w-[200px]">
            <button
              type="button"
              onClick={() => setCheckboxAnswer("Yes")}
              className="flex-1 py-2 text-sm font-semibold uppercase rounded-l-md border-2 transition-all opensans-semibold"
              style={{
                background: checkboxAnswer === "Yes" ? fillBg : "transparent",
                color: checkboxAnswer === "Yes" ? "white" : themeColor,
                borderColor: themeColor,
              }}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setCheckboxAnswer("No")}
              className="flex-1 py-2 text-sm font-semibold uppercase rounded-r-md border-2 border-l-0 transition-all opensans-semibold"
              style={{
                background: checkboxAnswer === "No" ? fillBg : "transparent",
                color: checkboxAnswer === "No" ? "white" : themeColor,
                borderColor: themeColor,
              }}
            >
              No
            </button>
          </div>
        </div>

        {/* Question 3: Number Rating (1-10) */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="font-semibold text-[#2C2C2C] mb-2 opensans-semibold text-[0.9rem] leading-[1.4rem]">
            3. How would you rate your experience?
          </p>
          <p className="text-sm text-gray-600 mb-3 opensans-semibold">Rate on a scale of 1-10:</p>
          <div className="flex gap-1 flex-wrap">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRatingAnswer(value)}
                className="w-8 h-8 rounded-md text-sm font-semibold transition-all opensans-semibold"
                style={{
                  background: ratingAnswer === value ? fillBg : "#e5e5e5",
                  color: ratingAnswer === value ? "white" : "#333",
                }}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Buttons - pointer-events-none makes them uninteractive */}
      <div className="px-4 pb-4 pointer-events-none">
        <div className="flex justify-between gap-3">
          {/* Go Back Button */}
          <button
            type="button"
            className="flex-1 py-2 px-4 rounded-full text-sm font-bold border-2 transition-all opensans-bold"
            style={{
              background: "white",
              borderColor: themeColor,
              color: themeColor,
            }}
          >
            GO BACK
          </button>

          {/* Done Button - Always shown as enabled in preview */}
          <button
            type="button"
            className="flex-1 py-2 px-4 rounded-full text-sm font-bold text-white transition-all opensans-bold"
            style={{
              background: fillBg,
            }}
          >
            DONE
          </button>
        </div>
      </div>
    </div>
  );
}
