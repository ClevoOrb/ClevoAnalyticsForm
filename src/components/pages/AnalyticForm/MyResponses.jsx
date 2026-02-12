/**
 * MyResponses.jsx
 *
 * A user-facing page where anyone can enter their code (Clevo code or
 * direct access code) and see all the forms they've filled.
 *
 * Two states:
 *   A) Code entry form — user types their code and clicks "See Your Report"
 *   B) Results view — shows a list of all forms filled by that code
 *
 * No authentication guard needed — this page is open to anyone with a code.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import usePersonResponses from "../../../hooks/usePersonResponses";

/* Same illustration the login page uses */
const AuthImg = "https://d2zcrs37ownl9k.cloudfront.net/asset/auth Image/Group 2.webp";

export default function MyResponses() {
  // The code the user types into the input field
  const [code, setCode] = useState("");
  // The 10-digit mobile number the user types (without +91 prefix)
  const [mobileNumber, setMobileNumber] = useState("");
  // The code that was actually submitted (used to display in results header)
  const [submittedCode, setSubmittedCode] = useState("");
  // Whether we're showing results (State B) or the entry form (State A)
  const [showResults, setShowResults] = useState(false);

  const navigate = useNavigate();
  const { getPersonResponses, responses, isLoading, error } = usePersonResponses();

  /**
   * When the user clicks "See Your Report", fetch all their form data
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;

    setSubmittedCode(code.trim());
    await getPersonResponses(code.trim(), mobileNumber.trim());
    setShowResults(true);
  };

  /**
   * Go back to the code entry screen (State A)
   */
  const handleBack = () => {
    setShowResults(false);
    setSubmittedCode("");
    setCode("");
    setMobileNumber("");
  };

  /**
   * Format a date string into a readable format like "Feb 10, 2026"
   */
  const formatDate = (dateString) => {
    if (!dateString) return "—";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "—";
    }
  };

  /**
   * Build the URL for viewing a report.
   * form_code looks like "orgName/formName", so we split it.
   * Ayurveda reports go to /ayurveda-report/..., everything else to /report/...
   */
  const getReportUrl = (resp) => {
    const [orgName, formName] = resp.form_code.split('/');
    if (resp.report_type === 'ayurveda') {
      return `/ayurveda-report/${orgName}/${formName}/${submittedCode}`;
    }
    return `/report/${orgName}/${formName}/${submittedCode}`;
  };

  return (
    <div className="min-h-screen flex justify-center p-4 tab:px-4 overflow-hidden py-10 mx-auto tab:overflow-auto max-w-full">

      {/* AnimatePresence mode="wait" ensures State A fully exits before State B enters (no overlap glitch) */}
      <AnimatePresence mode="wait">

        {/* ========== STATE A: Code Entry Form ========== */}
        {!showResults && (
          <motion.div
            key="code-entry"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
            className="mac:bg-[#F2F4F7] rounded-[30px] mac:w-[90%] mac:py-16 mac:flex mac:items-center mac:justify-center"
          >
            <div className="grid mac:grid-cols-2 items-center gap-6 mac:gap-12 w-[85%] tab:w-[80%] mx-auto">

              {/* Illustration — shown ABOVE the form on mobile/tablet, hidden on desktop */}
              <div className="mac:hidden flex justify-center items-center">
                <img className="w-[55%] tab:w-[70%]" src={AuthImg} alt="" loading="lazy" />
              </div>

              {/* Form Column */}
              <div className="mac:pr-24">
                <h2 className="text-[1.8rem] leading-[3rem] tab:text-[2.75rem] mac:text-[2.5rem] mac:leading-[4rem] tab:leading-[3.5rem] mb-2 flex justify-center tab:justify-start">
                  See Your Report
                </h2>
                <p className="text-[#848484] text-sm mb-8 text-center tab:text-left opensans-semibold">
                  Enter your code and mobile number to see all the forms you've filled.
                </p>

                <form onSubmit={handleSubmit}>
                  {/* Code Input — underline style matching AnalyticFormLogin */}
                  <div className="flex-col">
                    <div className="mb-1 w-full">
                      <label className="inline-block mb-1 text-[#848484] text-[1rem] leading-[1.5rem] tab:text-[1.3rem] tab:leading-[2.1rem] mac:text-[1.2rem] mac:leading-[1.7rem] md:leading-[1.7rem] md:text-[1.1rem] opensans-semibold">
                        Your Code
                      </label>
                    </div>
                    <div>
                      <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="Enter your code"
                        className="flex-grow w-full py-1 mb-3 text-black transition duration-200 mac:bg-[#F2F4F7] border-b border-[#7c7c7c9b] focus:border-[#080594] focus:outline-none placeholder:text-[1rem] leading-[1.5rem] tab:text-[1.3rem] tab:leading-[2.1rem] mac:text-[1.2rem] mac:leading-[1.7rem] md:leading-[1.7rem] md:text-[1.1rem] placeholder:font-[500] placeholder:text-[#b0b0b0]"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Mobile Number Input — disabled +91 prefix input + underline style, same as login */}
                  <div className="flex-col mt-4">
                    <div>
                      <label className="inline-block mb-1 text-[#848484] whitespace-nowrap text-[1rem] leading-[1.5rem] tab:text-[1.3rem] tab:leading-[2.1rem] mac:text-[1.2rem] mac:leading-[1.7rem] md:leading-[1.7rem] md:text-[1.1rem] opensans-semibold">
                        Mobile Number
                      </label>
                    </div>
                    <div className="flex">
                      <input
                        type="text"
                        disabled
                        placeholder="+91"
                        className="flex-grow w-10 py-1 mb-3 transition duration-200 mac:bg-[#F2F4F7] border-b border-[#7c7c7c9b] focus:border-[#080594] focus:outline-none placeholder:text-[16px] placeholder:font-[500] placeholder:text-black"
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={mobileNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                          setMobileNumber(value);
                        }}
                        onKeyDown={(e) => {
                          const isControlCommand =
                            (e.ctrlKey || e.metaKey) &&
                            ["c", "v", "x", "a"].includes(e.key.toLowerCase());
                          if (
                            !/[0-9]/.test(e.key) &&
                            e.key !== "Backspace" &&
                            e.key !== "Tab" &&
                            e.key !== "Enter" &&
                            e.key !== "Delete" &&
                            e.key !== "ArrowLeft" &&
                            e.key !== "ArrowRight" &&
                            !isControlCommand
                          ) {
                            e.preventDefault();
                          }
                        }}
                        onPaste={(e) => {
                          e.preventDefault();
                          const pasteData = e.clipboardData.getData("text/plain").replace(/\D/g, "");
                          setMobileNumber(pasteData.slice(0, 10));
                        }}
                        placeholder="10-digit mobile number"
                        pattern="[0-9]{10}"
                        maxLength={10}
                        className="flex-grow w-full text-black text-lg py-1 mb-3 transition duration-200 mac:bg-[#F2F4F7] border-b border-[#7c7c7c9b] focus:border-[#080594] ml-2 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Submit Button — same style as login page */}
                  <div className="w-full flex justify-center mac:block">
                    <button
                      type="submit"
                      disabled={!code.trim() || mobileNumber.length !== 10 || isLoading}
                      className={`uppercase py-3 font-semibold rounded-full w-full mt-6 cursor-pointer text-[15px] transition-colors ${
                        code.trim() && mobileNumber.length === 10 && !isLoading
                          ? "bg-[#080594] text-white hover:bg-[#060480]"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="spinner" />
                          Loading...
                        </span>
                      ) : (
                        "See Your Report"
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Illustration — shown on the RIGHT on desktop only */}
              <div className="hidden mac:flex">
                <img src={AuthImg} alt="" loading="lazy" />
              </div>
            </div>
          </motion.div>
        )}

        {/* ========== STATE B: Results View ========== */}
        {showResults && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
            className="w-[90%] tab:w-[94%] mac:w-[94%]"
          >
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-[1.1rem] leading-[1.5rem] tab:text-[1.3rem] tab:leading-[2.1rem] mac:text-[1.2rem] mac:leading-[1.7rem] md:leading-[1.7rem] md:text-3xl font-bold text-[#2C2C2C] arca">
                  Your Responses
                </h1>
                <motion.button
                  onClick={handleBack}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="text-[15px] px-8 py-4 rounded-full opensans-bold border-[3px] border-[#080594] text-[#080594] uppercase hover:bg-[#080594] hover:text-white transition-all cursor-pointer"
                >
                  Enter Different Code
                </motion.button>
              </div>
              <p className="text-[1.1rem] leading-[1.5rem] tab:text-[1.3rem] tab:leading-[2.1rem] mac:text-[1.2rem] mac:leading-[1.7rem] md:leading-[1.7rem] md:text-[1.1rem] opensans-regular text-[#848484]">
                Code: <span className="font-mono font-semibold text-[#080594]">{submittedCode}</span>
              </p>
            </div>

            {/* Error State */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-center gap-3"
              >
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <p className="text-red-600 text-[1.1rem] leading-[1.5rem] tab:text-[1.3rem] tab:leading-[2.1rem] mac:text-[1.2rem] mac:leading-[1.7rem] md:leading-[1.7rem] md:text-[1.1rem] opensans-regular">Something went wrong: {error}</p>
              </motion.div>
            )}

            {/* Loading State */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center justify-center"
              >
                <div className="spinner mb-4" style={{ width: 32, height: 32, borderWidth: 4 }} />
                <p className="text-[#848484] text-[1.1rem] leading-[1.5rem] tab:text-[1.3rem] tab:leading-[2.1rem] mac:text-[1.2rem] mac:leading-[1.7rem] md:leading-[1.7rem] md:text-[1.1rem] opensans-regular">Loading your responses...</p>
              </motion.div>
            )}

            {/* No Results — illustration with faded opacity for a warmer feel */}
            {!isLoading && !error && responses.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-lg p-8 text-center"
              >
                <img src={AuthImg} alt="" className="w-32 mx-auto mb-6 opacity-60" loading="lazy" />
                <p className="text-[#2C2C2C] text-[1.1rem] leading-[1.5rem] tab:text-[1.3rem] tab:leading-[2.1rem] mac:text-[1.2rem] mac:leading-[1.7rem] md:leading-[1.7rem] md:text-[1.1rem] font-bold arca mb-1">No responses found</p>
                <p className="text-[#848484] text-[1.1rem] leading-[1.5rem] tab:text-[1.3rem] tab:leading-[2.1rem] mac:text-[1.2rem] mac:leading-[1.7rem] md:leading-[1.7rem] md:text-[1.1rem] opensans-regular">
                  No forms were found for this code. Please check and try again.
                </p>
              </motion.div>
            )}

            {/* Results List — staggered card animations */}
            {!isLoading && responses.length > 0 && (
              <div>
                <p className="text-[#2C2C2C] text-[1.1rem] leading-[1.5rem] tab:text-[1.3rem] tab:leading-[2.1rem] mac:text-[1.2rem] mac:leading-[1.7rem] md:leading-[1.7rem] md:text-[1.1rem] opensans-regular mb-4">
                  You've filled <strong className="text-[#080594]">{responses.length}</strong> form{responses.length !== 1 ? "s" : ""}:
                </p>

                <div className="space-y-4">
                  {responses.map((resp, index) => {
                    const progress = resp.total_sections > 0
                      ? Math.round((resp.completed_sections / resp.total_sections) * 100)
                      : 0;
                    const isFullyComplete = progress === 100;

                    return (
                      <motion.div
                        key={resp.form_code}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.08 }}
                        whileHover={{ y: -2 }}
                        className={`bg-white rounded-2xl border border-gray-100 border-l-4 p-5 shadow-[0_2px_12px_rgba(8,5,148,0.06)] hover:shadow-[0_6px_20px_rgba(8,5,148,0.1)] transition-shadow ${
                          resp.has_report
                            ? "border-l-[#080594]"
                            : resp.form_completed
                              ? "border-l-green-400"
                              : "border-l-yellow-400"
                        }`}
                      >
                        {/* Form Name */}
                        <h3 className="text-[#2C2C2C] text-[1.1rem] leading-[1.5rem] tab:text-[1.3rem] tab:leading-[2.1rem] mac:text-[1.2rem] mac:leading-[1.7rem] md:leading-[1.7rem] md:text-[1.1rem] xxl:text-[1.3rem] font-bold arca mb-1">
                          {resp.form_name}
                        </h3>

                        {/* Org Name, Last Modified + Coins Row */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[#848484] text-sm opensans-semibold">
                            {resp.org_name && <>{resp.org_name}</>}
                            {resp.org_name && resp.last_updated && <span className="mx-1.5">·</span>}
                            {resp.last_updated && <>Last modified {formatDate(resp.last_updated)}</>}
                          </span>
                          {resp.coins > 0 && (
                            <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#080594]">
                              <img src="/assets/point.svg" alt="coins" className="w-4 h-4" />
                              {resp.coins} coins
                            </span>
                          )}
                        </div>

                        {/* Progress Bar — hidden when form is fully complete */}
                        {resp.total_sections > 0 && !isFullyComplete && !resp.form_completed && !resp.has_report && (
                          <div className="mb-3">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm text-[#848484] opensans-semibold">
                                {resp.completed_sections} / {resp.total_sections} sections
                              </span>
                              <span className="text-sm text-[#848484] opensans-semibold">
                                {progress}%
                              </span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.6, delay: index * 0.08 + 0.2 }}
                                className="h-full rounded-full"
                                style={{
                                  background: isFullyComplete
                                    ? "#10b981"
                                    : "linear-gradient(90deg, #080594, #08b7f6)"
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Status Badge — only shown when report is NOT ready */}
                        {!resp.has_report && (
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${
                              resp.form_completed
                                ? "bg-green-50 border border-green-200 text-green-700"
                                : "bg-yellow-50 border border-yellow-200 text-yellow-700"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                resp.form_completed ? "bg-green-500" : "bg-yellow-500"
                              }`}
                            />
                            {resp.form_completed ? "Completed" : "In Progress"}
                          </span>
                        )}

                        {/* Report Status — only rendered when report is available */}
                        {resp.has_report && (
                          <div className="mt-3 flex items-center justify-between">
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-blue-50 border border-blue-200 text-blue-700">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Report Ready
                            </span>
                            <motion.button
                              onClick={() => window.open(getReportUrl(resp), "_blank")}
                              whileHover={{ scale: 1.04 }}
                              whileTap={{ scale: 0.97 }}
                              className="text-[15px] px-8 py-3 opensans-bold rounded-full uppercase bg-[#080594] border-[3px] border-[#080594] text-white hover:bg-[#060480] transition-all cursor-pointer"
                            >
                              View Report
                            </motion.button>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
