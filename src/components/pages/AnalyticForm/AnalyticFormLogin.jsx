/**
 * AnalyticFormLogin.jsx
 *
 * This component provides authentication for the Analytics Form.
 * It uses the same Clevo code + mobile number authentication system
 * as the original Clevo form but works with dynamic form configurations.
 *
 * The formId parameter comes from the URL and identifies which
 * questionnaire configuration to use. Forms are loaded from Supabase.
 */

"use client";

import LoadingScreen from "../Form/LoadingScreen";
import axios from "axios";
import Cookies from "js-cookie";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import useAnalyticForms from "../../../hooks/useAnalyticForms";
import { supabase } from "../../../lib/supabase";
import { applyTheme } from "../../common/ThemeSelector";

export default function AnalyticFormLogin() {
  const AuthImg = "https://d2zcrs37ownl9k.cloudfront.net/asset/auth Image/Group 2.webp";
  const [clevoCode, setClevoCode] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [isLoaded, setLoaded] = useState(false);
  const [formConfig, setFormConfig] = useState(null);
  const navigate = useNavigate();
  const { orgName, formName } = useParams();

  // Construct formId from URL params: orgName/formName
  const formId = `${orgName}/${formName}`;

  // Direct Access state
  const [showDirectAccess, setShowDirectAccess] = useState(false);
  const [directName, setDirectName] = useState("");
  const [directMobile, setDirectMobile] = useState("");
  const [directEmail, setDirectEmail] = useState("");
  // State for showing the "Your access code" modal after direct access login
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");

  // Supabase hook for fetching forms
  const { getForm } = useAnalyticForms();

  useEffect(() => {
    // Load form configuration from Supabase
    const loadFormConfig = async () => {
      if (!orgName || !formName) return;

      try {
        console.log('AnalyticFormLogin: Loading form with code:', formId);
        const config = await getForm(formId);

        if (config) {
          console.log('AnalyticFormLogin: Form loaded:', config);
          setFormConfig(config);

          // Apply the theme from form config
          const themeId = config.theme_color || "default";
          applyTheme(themeId);
          console.log("Applied theme:", themeId);

          // Check if already logged in
          if (Cookies.get("analytic_clevo_id") && Cookies.get("analytic_clevo_code")) {
            const currentFormId = Cookies.get("analytic_form_id");
            if (currentFormId === formId) {
              navigate(`/${orgName}/${formName}`, { replace: true });
            } else {
              // Different form - clear old cookies and stay on login
              Cookies.remove("analytic_clevo_id");
              Cookies.remove("analytic_clevo_code");
              Cookies.remove("analytic_form_id");
              setLoaded(true);
            }
          } else {
            setLoaded(true);
          }
        } else {
          console.error('AnalyticFormLogin: Form not found');
          toast.error("Form not found. Please check the link or upload a new form.");
          navigate("/analytic-form-upload");
        }
      } catch (e) {
        console.error("Error loading form config from Supabase:", e);
        toast.error("Error loading form configuration");
        navigate("/analytic-form-upload");
      }
    };

    loadFormConfig();
  }, [orgName, formName, formId, navigate, getForm]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoaded(false);

    try {
      // First, check if this code is a direct access code in Supabase.
      // Direct access codes are stored separately from Clevo codes, so we need
      // to check the direct_access table before calling the external API.
      const { data: directAccessRecord } = await supabase
        .from('direct_access')
        .select('direct_access_id, mobile_number')
        .eq('direct_access_id', clevoCode)
        .maybeSingle();

      if (directAccessRecord) {
        // This is a direct access code — validate mobile number against our database
        if (directAccessRecord.mobile_number !== mobileNumber) {
          toast.error("Invalid mobile number for this access code. Please use the same number you registered with.", {
            duration: 4000,
            id: "direct-access-invalid-mobile",
          });
          setLoaded(true);
          return;
        }

        // Mobile matches — check if form already submitted
        const { data: existingResponse } = await supabase
          .from('analytic_responses')
          .select('response_data')
          .eq('form_code', formId)
          .eq('clevo_code', clevoCode)
          .single();

        if (existingResponse?.response_data?.form_completed === "yes") {
          toast.info("You have already submitted this form!", {
            duration: 4000,
            id: "form-already-submitted"
          });
        }

        // Set cookies (using the direct access code as both clevo_code and clevo_id)
        Cookies.set("analytic_clevo_code", clevoCode, { expires: 365 });
        Cookies.set("analytic_clevo_id", clevoCode, { expires: 365 });
        Cookies.set("analytic_form_id", formId, { expires: 365 });
        Cookies.set("analytic_direct_access", "true", { expires: 365 });
        Cookies.set("clevo_code", clevoCode, { expires: 365 });
        Cookies.set("clevo_id", clevoCode, { expires: 365 });

        localStorage.setItem(`analytic_last_clevo_code_${formId}`, clevoCode);
        navigate(`/${orgName}/${formName}`, { replace: true });
        return;
      }

      // Not a direct access code — use the external API for Clevo code validation
      const response = await axios.get(
        `https://api.theorb.bio/api/v1/reports/get_clevo_id?clevo_code=${clevoCode}&mob=${mobileNumber}`
      );

      // Check if this form_code + clevo_code combo has already submitted the form
      const { data: existingResponse } = await supabase
        .from('analytic_responses')
        .select('response_data')
        .eq('form_code', formId)
        .eq('clevo_code', clevoCode)
        .single();

      // Check if form_completed flag is "yes"
      if (existingResponse?.response_data?.form_completed === "yes") {
        // Form already submitted - show toast and redirect to form page (which will show success modal)
        toast.info("You have already submitted this form!", {
          duration: 4000,
          id: "form-already-submitted"
        });

        // Set cookies so the form page can load and show success modal
        Cookies.set("analytic_clevo_code", clevoCode, { expires: 365 });
        Cookies.set("analytic_clevo_id", response.data["clevo_id"], { expires: 365 });
        Cookies.set("analytic_form_id", formId, { expires: 365 });
        Cookies.set("clevo_code", clevoCode, { expires: 365 });
        Cookies.set("clevo_id", response.data["clevo_id"], { expires: 365 });

        // Redirect to form page which will detect form_completed and show success modal
        navigate(`/${orgName}/${formName}`, { replace: true });
        return;
      }

      // Form not yet completed - proceed with normal login
      Cookies.set("analytic_clevo_code", clevoCode, { expires: 365 });
      Cookies.set("analytic_clevo_id", response.data["clevo_id"], { expires: 365 });
      Cookies.set("analytic_form_id", formId, { expires: 365 });

      // Also set standard clevo cookies for API compatibility
      Cookies.set("clevo_code", clevoCode, { expires: 365 });
      Cookies.set("clevo_id", response.data["clevo_id"], { expires: 365 });

      // Check if returning user
      const lastClevoCode = localStorage.getItem(`analytic_last_clevo_code_${formId}`);
      if (lastClevoCode && lastClevoCode === clevoCode) {
        console.log("Welcome back! Your rewards have been preserved.");
      }

      localStorage.setItem(`analytic_last_clevo_code_${formId}`, clevoCode);

      navigate(`/${orgName}/${formName}`, { replace: true });
    } catch (error) {
        if (error.response) {
          const contentType = error.response.headers["content-type"];
          const isHtmlResponse = contentType && contentType.includes("text/html");

          let errorMessage = null;

          if (isHtmlResponse) {
            const htmlString = error.response.data;

            if (typeof htmlString === "string") {
              if (htmlString.includes("DoesNotExist")) {
                errorMessage = "Invalid Clevo code or mobile number. Please check your credentials.";
              } else if (htmlString.includes("ValidationError")) {
                errorMessage = "Invalid input format. Please check your Clevo code and mobile number.";
              } else {
                errorMessage = "Invalid credentials. Please verify your Clevo code and mobile number.";
              }
            }
          } else {
            errorMessage =
              error.response.data?.message ||
              error.response.data?.error ||
              error.response.data?.detail ||
              (typeof error.response.data === "string" ? error.response.data : null);
          }

          if (errorMessage) {
            toast.error(errorMessage, {
              duration: 4000,
              id: errorMessage.replace(/\s+/g, "-").substring(0, 50),
            });
          } else {
            toast.error("Invalid credentials. Please check your Clevo code and mobile number.", {
              duration: 4000,
              id: "invalid-credentials",
            });
          }

          setLoaded(true);
        } else if (error.request) {
          toast.error("Network error. Please check your connection.", {
            duration: 4000,
            id: "network-error",
          });
          setLoaded(true);
        } else {
          toast.error("An error occurred. Please try again.", {
            duration: 4000,
            id: "general-error",
          });
          setLoaded(true);
        }
    }
  };

  /**
   * Generate a unique 6-digit numeric code (100000–999999).
   * Checks both `direct_access` and `analytic_responses` tables to avoid collisions
   * with existing direct access IDs AND Clevo codes from the external API.
   * Retries up to 10 times if a collision is found.
   */
  const generateUnique6DigitCode = async () => {
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = String(Math.floor(100000 + Math.random() * 900000));

      // Check if this code already exists in the direct_access table
      const { data: daMatch } = await supabase
        .from('direct_access')
        .select('direct_access_id')
        .eq('direct_access_id', code)
        .maybeSingle();

      if (daMatch) continue; // collision — try again

      // Check if this code already exists in analytic_responses as a clevo_code
      const { data: respMatch } = await supabase
        .from('analytic_responses')
        .select('clevo_code')
        .eq('clevo_code', code)
        .limit(1);

      if (respMatch && respMatch.length > 0) continue; // collision — try again

      return code; // No collision — safe to use
    }
    // Extremely unlikely fallback: if all 10 attempts collided, use timestamp-based ID
    return `DA_${Date.now()}`;
  };

  /**
   * Handle Direct Access form submission
   * Checks if name + mobile combo exists, if so uses existing ID
   * Otherwise creates new entry with a unique 6-digit numeric code
   */
  const handleDirectAccessSubmit = async (event) => {
    event.preventDefault();
    setLoaded(false);

    try {
      const trimmedName = directName.trim();
      const trimmedMobile = directMobile.trim();

      // First, check if this name + mobile number combination already exists
      // Using ilike for case-insensitive name matching (Sanchi = sanchi = SANCHI)
      const { data: existingRecord, error: fetchError } = await supabase
        .from('direct_access')
        .select('direct_access_id')
        .ilike('name', trimmedName)
        .eq('mobile_number', trimmedMobile)
        .single();

      let directAccessId;
      let isNewUser = false;

      if (existingRecord && !fetchError) {
        // Use existing direct_access_id for this name + mobile combo
        directAccessId = existingRecord.direct_access_id;
        console.log('Found existing direct access record:', directAccessId);
      } else {
        // No existing record — generate a unique 6-digit code
        isNewUser = true;
        directAccessId = await generateUnique6DigitCode();

        const { error: insertError } = await supabase
          .from('direct_access')
          .insert({
            name: trimmedName,
            mobile_number: trimmedMobile,
            email: directEmail.trim() || null,
            direct_access_id: directAccessId,
            created_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Error saving direct access:', insertError);
          toast.error("Error processing request. Please try again.", {
            duration: 4000,
          });
          setLoaded(true);
          return;
        }
        console.log('Created new direct access record:', directAccessId);
      }

      // Set cookies for form access (using direct access ID as clevo_code)
      Cookies.set("analytic_clevo_code", directAccessId, { expires: 365 });
      Cookies.set("analytic_clevo_id", directAccessId, { expires: 365 });
      Cookies.set("analytic_form_id", formId, { expires: 365 });
      Cookies.set("analytic_direct_access", "true", { expires: 365 });

      // Also set standard cookies for compatibility
      Cookies.set("clevo_code", directAccessId, { expires: 365 });
      Cookies.set("clevo_id", directAccessId, { expires: 365 });

      // Close the direct access modal
      setShowDirectAccess(false);

      // Show the "Your access code" modal so the user can note it down
      setGeneratedCode(directAccessId);
      setShowCodeModal(true);
      setLoaded(true);
    } catch (error) {
      console.error("Direct access error:", error);
      toast.error("An error occurred. Please try again.", {
        duration: 4000,
      });
      setLoaded(true);
    }
  };

  return (
    <>
      {!isLoaded && <LoadingScreen />}
      <div className="tab:px-4 overflow-hidden py-10 mx-auto tab:overflow-auto max-w-full h-screen flex justify-center items-center">
        <div className="mac:bg-[#F2F4F7] rounded-[30px] md:w-[75%] mac:w-[80%] mac:h-[70%] md:h-[80%] mac:flex mac:items-center mac:justify-center">
          <div className="grid mac:grid-cols-2 items-center gap-6 mac:gap-12 w-[70%] tab:w-[80%] mx-auto">
            <div className="mac:hidden flex justify-center items-center">
              <img className="w-[70%] tab:w-[90%]" src={AuthImg} alt="" loading="lazy" />
            </div>

            <div className="mac:pr-24 mac:h-full">
              <h2 className="text-[1.8rem] leading-[3rem] tab:text-[2.75rem] mac:text-[2.5rem] mac:leading-[4rem] tab:leading-[3.5rem] mb-2 flex justify-center tab:justify-start">
                Sign In
              </h2>

              {/* Form Name Display */}
              {formConfig && (
                <div className="mb-6 text-center tab:text-left">
                  <span className="text-[#08b7f6] font-semibold text-lg">
                    {formConfig.name}
                  </span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="flex-col">
                  <div className="mb-1 w-full">
                    <label
                      htmlFor="name"
                      className="inline-block mb-1 text-[#848484] text-[1rem] leading-[1.5rem] tab:text-[1.3rem] tab:leading-[2.1rem] mac:text-[1.2rem] mac:leading-[1.7rem] md:leading-[1.7rem] md:text-[1.1rem] opensans-semibold"
                    >
                      Clevo Code
                    </label>
                  </div>
                  <div>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      pattern="[0-9]{6}"
                      onInput={(e) => {
                        e.target.value = e.target.value.replace(/\D/g, "").slice(0, 6);
                        setClevoCode(e.target.value);
                      }}
                      onChange={(e) => {
                        e.target.value = e.target.value.replace(/\D/g, "").slice(0, 6);
                        setClevoCode(e.target.value);
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
                        const newValue = pasteData.slice(0, 6);
                        e.target.value = newValue;
                        setClevoCode(newValue);
                      }}
                      className="flex-grow w-full py-1 mb-3 text-black transition duration-200 mac:bg-[#F2F4F7] border-b border-[#7c7c7c9b] focus:border-[#080594] focus:outline-none focus:shadow-outline placeholder:text-[1rem] leading-[1.5rem] tab:text-[1.3rem] tab:leading-[2.1rem] mac:text-[1.2rem] mac:leading-[1.7rem] md:leading-[1.7rem] md:text-[1.1rem] placeholder:font-[500] placeholder:text-black"
                      required
                    />
                  </div>
                </div>

                <div className="flex-col mt-4">
                  <div className="">
                    <label className="inline-block mb-1 text-[#848484] whitespace-nowrap text-[1rem] leading-[1.5rem] tab:text-[1.3rem] tab:leading-[2.1rem] mac:text-[1.2rem] mac:leading-[1.7rem] md:leading-[1.7rem] md:text-[1.1rem] opensans-semibold">
                      Mobile Number
                    </label>
                  </div>
                  <div className="flex">
                    <input
                      type="text"
                      disabled
                      placeholder="+91"
                      pattern="^[0-9]{10}$"
                      maxLength={10}
                      className="flex-grow w-10 py-1 mb-3 transition duration-200 mac:bg-[#F2F4F7] border-b border-[#7c7c7c9b] focus:border-[#080594] focus:outline-none focus:shadow-outline placeholder:text-[16px] placeholder:font-[500] placeholder:text-black"
                      id="Cnumber"
                      name="Cnumber"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      pattern="[0-9]{10}"
                      maxLength={10}
                      onInput={(e) => {
                        e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setMobileNumber(e.target.value);
                      }}
                      onChange={(e) => {
                        e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setMobileNumber(e.target.value);
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
                        const newValue = pasteData.slice(0, 10);
                        e.target.value = newValue;
                        setMobileNumber(newValue);
                      }}
                      onWheel={(e) => e.target.blur()}
                      className="flex-grow w-full text-black text-lg py-1 mb-3 transition duration-200 mac:bg-[#F2F4F7] border-b border-[#7c7c7c9b] focus:border-[#080594] ml-2 focus:outline-none focus:shadow-outline relative"
                    />
                  </div>
                </div>
                <div className="w-full flex justify-center mac:block">
                  <input
                    type="submit"
                    className="uppercase bg-[#080594] text-white py-3 font-semibold rounded-full w-full mt-6 cursor-pointer text-[15px]"
                    value="Sign in"
                  ></input>
                </div>

                {/* OR Divider */}
                <div className="flex items-center my-6">
                  <div className="flex-1 border-t border-gray-300"></div>
                  <span className="px-4 text-gray-500 text-sm font-medium">OR</span>
                  <div className="flex-1 border-t border-gray-300"></div>
                </div>

                {/* Direct Access Button */}
                <button
                  type="button"
                  onClick={() => setShowDirectAccess(true)}
                  className="w-full py-3 font-semibold rounded-full border-2 border-[#08b7f6] text-[#08b7f6] hover:bg-[#08b7f6] hover:text-white transition-colors text-[15px]"
                >
                  Direct Access
                </button>
              </form>

              {/* Direct Access Form Modal */}
              {showDirectAccess && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold text-[#080594]">Direct Access</h3>
                      <button
                        onClick={() => {
                          setShowDirectAccess(false);
                          setDirectName("");
                          setDirectMobile("");
                          setDirectEmail("");
                        }}
                        className="text-gray-400 hover:text-gray-600 p-1"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <p className="text-gray-600 text-sm mb-6">
                      Enter your details to access the form directly.
                    </p>

                    <form onSubmit={handleDirectAccessSubmit}>
                      {/* Name Field (Required) */}
                      <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={directName}
                          onChange={(e) => setDirectName(e.target.value)}
                          placeholder="Enter your full name"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#08b7f6] focus:border-transparent transition-all"
                          required
                        />
                      </div>

                      {/* Mobile Number Field (Required) */}
                      <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          Mobile Number <span className="text-red-500">*</span>
                        </label>
                        <div className="flex">
                          <span className="inline-flex items-center px-3 py-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-xl text-gray-600 text-sm">
                            +91
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={directMobile}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                              setDirectMobile(value);
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
                            placeholder="10-digit mobile number"
                            pattern="[0-9]{10}"
                            maxLength={10}
                            className="flex-1 px-4 py-3 border border-gray-300 rounded-r-xl focus:outline-none focus:ring-2 focus:ring-[#08b7f6] focus:border-transparent transition-all"
                            required
                          />
                        </div>
                      </div>

                      {/* Email Field (Optional) */}
                      <div className="mb-6">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          Email <span className="text-gray-400 font-normal">(Optional)</span>
                        </label>
                        <input
                          type="email"
                          value={directEmail}
                          onChange={(e) => setDirectEmail(e.target.value)}
                          placeholder="Enter your email address"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#08b7f6] focus:border-transparent transition-all"
                        />
                      </div>

                      {/* Submit Buttons */}
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setShowDirectAccess(false);
                            setDirectName("");
                            setDirectMobile("");
                            setDirectEmail("");
                          }}
                          className="flex-1 py-3 font-semibold rounded-full border-2 border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={!directName.trim() || directMobile.length !== 10}
                          className={`flex-1 py-3 font-semibold rounded-full transition-colors ${
                            directName.trim() && directMobile.length === 10
                              ? "bg-[#08b7f6] text-white hover:bg-[#069DE8]"
                              : "bg-gray-200 text-gray-400 cursor-not-allowed"
                          }`}
                        >
                          Access Form
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
            <div className="hidden mac:flex">
              <img className="" src={AuthImg} alt="" loading="lazy" />
            </div>
          </div>
        </div>
      </div>

      {/* "Your Access Code" Modal — shown after direct access login */}
      {showCodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-[#080594] mb-2">Access Granted!</h3>
            <p className="text-gray-600 text-sm mb-4">
              Your access code is:
            </p>
            <div className="bg-gray-100 rounded-xl py-3 px-6 mb-4">
              <span className="text-3xl font-bold tracking-widest text-[#080594]">{generatedCode}</span>
            </div>
            <p className="text-gray-500 text-xs mb-6">
              Save this code! You can use it later at <strong>/my-responses</strong> to view all your filled forms.
            </p>
            <button
              onClick={() => {
                setShowCodeModal(false);
                navigate(`/${orgName}/${formName}`, { replace: true });
              }}
              className="w-full py-3 font-semibold rounded-full bg-[#080594] text-white hover:bg-[#060480] transition-colors"
            >
              Continue to Form
            </button>
          </div>
        </div>
      )}
    </>
  );
}
