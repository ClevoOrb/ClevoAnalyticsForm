/**
 * MyResponses.jsx
 *
 * A user-facing page where anyone can enter their code (Clevo code or
 * direct access code) and see all the forms they've filled.
 *
 * Two states:
 *   A) Code entry form — user types their code and clicks "View Responses"
 *   B) Results view — shows a list of all forms filled by that code
 *
 * No authentication guard needed — this page is open to anyone with a code.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import usePersonResponses from "../../../hooks/usePersonResponses";

export default function MyResponses() {
  // The code the user types into the input field
  const [code, setCode] = useState("");
  // The code that was actually submitted (used to display in results header)
  const [submittedCode, setSubmittedCode] = useState("");
  // Whether we're showing results (State B) or the entry form (State A)
  const [showResults, setShowResults] = useState(false);

  const navigate = useNavigate();
  const { getPersonResponses, responses, isLoading, error } = usePersonResponses();

  /**
   * When the user clicks "View Responses", fetch all their form data
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;

    setSubmittedCode(code.trim());
    await getPersonResponses(code.trim());
    setShowResults(true);
  };

  /**
   * Go back to the code entry screen (State A)
   */
  const handleBack = () => {
    setShowResults(false);
    setSubmittedCode("");
    setCode("");
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* ========== STATE A: Code Entry Form ========== */}
        {!showResults && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            {/* Icon */}
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-[#080594]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-[#080594] mb-2">
              View Your Responses
            </h1>
            <p className="text-gray-500 text-sm mb-8">
              Enter your code to see all the forms you've filled.
            </p>

            <form onSubmit={handleSubmit}>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter your code..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center text-lg tracking-wider focus:outline-none focus:ring-2 focus:ring-[#08b7f6] focus:border-transparent transition-all mb-4"
                autoFocus
              />
              <button
                type="submit"
                disabled={!code.trim() || isLoading}
                className={`w-full py-3 font-semibold rounded-full transition-colors ${
                  code.trim() && !isLoading
                    ? "bg-[#080594] text-white hover:bg-[#060480]"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                {isLoading ? "Loading..." : "View Responses"}
              </button>
            </form>
          </div>
        )}

        {/* ========== STATE B: Results View ========== */}
        {showResults && (
          <div>
            {/* Header */}
            <div className="mb-6">
              <button
                onClick={handleBack}
                className="text-[#08b7f6] hover:text-[#069DE8] text-sm font-medium flex items-center gap-1 mb-4"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Enter Different Code
              </button>
              <h1 className="text-2xl font-bold text-[#080594]">
                Your Responses
              </h1>
              <p className="text-gray-500 text-sm">
                Code: <span className="font-mono font-semibold">{submittedCode}</span>
              </p>
            </div>

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <p className="text-red-600 text-sm">Something went wrong: {error}</p>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                <p className="text-gray-500">Loading your responses...</p>
              </div>
            )}

            {/* No Results */}
            {!isLoading && !error && responses.length === 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-gray-600 font-medium mb-1">No responses found</p>
                <p className="text-gray-400 text-sm">
                  No forms were found for this code. Please check and try again.
                </p>
              </div>
            )}

            {/* Results List */}
            {!isLoading && responses.length > 0 && (
              <div>
                <p className="text-gray-500 text-sm mb-4">
                  You've filled <strong>{responses.length}</strong> form{responses.length !== 1 ? "s" : ""}:
                </p>

                <div className="space-y-4">
                  {responses.map((resp) => (
                    <div
                      key={resp.form_code}
                      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
                    >
                      {/* Form Name */}
                      <h3 className="font-bold text-[#080594] text-lg mb-3">
                        {resp.form_name}
                      </h3>

                      {/* Status Badge */}
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            resp.form_completed
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {resp.form_completed ? "Completed" : "In Progress"}
                        </span>

                        {/* Last Updated */}
                        <span className="text-gray-400 ml-auto">
                          {formatDate(resp.last_updated)}
                        </span>
                      </div>

                      {/* Report Status */}
                      <div className="mt-3 flex items-center justify-between">
                        {resp.has_report ? (
                          <>
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Report Ready
                            </span>
                            <button
                              onClick={() => navigate(getReportUrl(resp))}
                              className="inline-flex items-center gap-1 px-4 py-1.5 bg-[#080594] text-white text-xs font-semibold rounded-full hover:bg-[#060480] transition-colors"
                            >
                              View Report
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Report Pending
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
