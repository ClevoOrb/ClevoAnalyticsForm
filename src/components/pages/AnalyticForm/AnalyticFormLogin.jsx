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
  const { formId } = useParams();

  // Supabase hook for fetching forms
  const { getForm } = useAnalyticForms();

  useEffect(() => {
    // Load form configuration from Supabase
    const loadFormConfig = async () => {
      if (!formId) return;

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
              navigate(`/analytic-form/${formId}`, { replace: true });
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
          navigate("/afu");
        }
      } catch (e) {
        console.error("Error loading form config from Supabase:", e);
        toast.error("Error loading form configuration");
        navigate("/afu");
      }
    };

    loadFormConfig();
  }, [formId, navigate, getForm]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoaded(false);

    try {
      // Use the same API endpoint as the original Clevo form
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

      // Check if is_form_submitted flag is true
      if (existingResponse?.response_data?.is_form_submitted === true) {
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

        // Redirect to form page which will detect is_form_submitted and show success modal
        navigate(`/analytic-form/${formId}`, { replace: true });
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

      navigate(`/analytic-form/${formId}`, { replace: true });
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
              </form>
            </div>
            <div className="hidden mac:flex">
              <img className="" src={AuthImg} alt="" loading="lazy" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
