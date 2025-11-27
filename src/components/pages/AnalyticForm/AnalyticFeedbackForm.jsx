/**
 * AnalyticFeedbackForm.jsx
 *
 * This is the main form page that displays all sections of the analytics questionnaire.
 * It works exactly like the original FeedbackForm but loads questions dynamically
 * from Supabase based on the formId (form_code) parameter.
 *
 * Key differences from the original:
 * - Questions are loaded from Supabase instead of a static JSON import
 * - Uses form_code to identify which questionnaire configuration to use
 * - All responses are stored in Supabase analytic_responses table
 */

import { useEffect, useState, useRef } from "react";
import { flushSync } from "react-dom";
import { Link, useNavigate, useParams } from "react-router-dom";
import Cookies from "js-cookie";
import LoadingScreen from "../Form/LoadingScreen";
import axios from "axios";
import AnalyticSuccessModal from "./AnalyticSuccessModal";
import RewardsRulesModal from "../Form/RewardsRulesModal";
import AnalyticFormNavbar from "./AnalyticFormNavbar";
import useAnalyticForms from "../../../hooks/useAnalyticForms";
import useAnalyticResponses from "../../../hooks/useAnalyticResponses";

// Use URL references instead of imports to avoid bundling large SVG files
const lockedIcon = "/assets/lockedBadge.svg";
const unlockedIcon = "/assets/unlockBadge.svg";
const completeBadge = "/assets/starBadge.svg";

export default function AnalyticFeedbackForm() {
  const { formId } = useParams();
  const [isLoaded, setLoaded] = useState(false);
  const [lastFilled, setLastFilled] = useState(-1);
  const [modalOpen, setModal] = useState(false);
  // Initialize clevoCode from cookies immediately so Supabase hooks work
  const [clevoCode, setClevoCode] = useState(() => Cookies.get("analytic_clevo_code") || "");
  const [formConfig, setFormConfig] = useState(null);
  const [jsonData, setJsonData] = useState([]);
  const [filledIndexDict, setFilledIndexDict] = useState({});

  const navigate = useNavigate();
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Timer-related state for global countdown visibility
  const [showStreakWarning, setShowStreakWarning] = useState(false);
  const [warningCountdown, setWarningCountdown] = useState(10);

  // Timer constants and refs
  const STREAK_TIME_LIMIT = 3 * 60 * 1000; // 3 minutes
  const WARNING_TIME = (2 * 60 + 50) * 1000; // 2 minutes 50 seconds
  const streakTimeoutRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // Supabase hooks
  const { getForm } = useAnalyticForms();
  const {
    getResponse,
    getSectionData,
    getRewards,
    updateRewards,
    markFormSubmitted,
    isFormSubmitted,
    responseData
  } = useAnalyticResponses(formId, clevoCode);

  const handleModal = () => {
    setModal(false);
  };

  // Load form configuration and questions from Supabase
  useEffect(() => {
    const loadFormConfig = async () => {
      if (!formId) return;

      try {
        const config = await getForm(formId);

        if (config) {
          setFormConfig(config);
          setJsonData(config.questions || []);

          // Build the FilledIndexDict dynamically
          const dict = { "No Report Found": 0 };
          config.sections?.forEach((sectionName, idx) => {
            dict[sectionName] = idx + 1;
          });
          dict["All Done"] = (config.sections?.length || 0) + 1;
          setFilledIndexDict(dict);
        } else {
          console.error("Form not found in Supabase");
          navigate("/analytic-form-upload");
        }
      } catch (e) {
        console.error("Error loading form config from Supabase:", e);
        navigate("/analytic-form-upload");
      }
    };

    loadFormConfig();
  }, [formId, navigate, getForm]);

  // Store Supabase response locally for synchronous access in render
  const [supabaseResponseData, setSupabaseResponseData] = useState(null);

  const checkLastFilled = async () => {
    try {
      // Check Supabase for submitted sections
      const supabaseResponse = await getResponse();

      // Store response data locally for synchronous access
      setSupabaseResponseData(supabaseResponse);

      // Check if form is already submitted (is_form_submitted flag)
      if (supabaseResponse?.is_form_submitted === true) {
        const sections = formConfig?.sections || [];
        setLastFilled(sections.length);
        setModal(true);
        setLoaded(true);
        return;
      }

      if (supabaseResponse && supabaseResponse.sections) {
        // Get all section names from the form config
        const sections = formConfig?.sections || [];

        // Find the last submitted section index
        let lastSubmittedIndex = -1;
        sections.forEach((sectionName, idx) => {
          const sectionData = supabaseResponse.sections[sectionName];
          if (sectionData?.is_submitted === true) {
            lastSubmittedIndex = idx;
          }
        });

        // The next section to fill is lastSubmittedIndex + 1
        const newLastFilled = lastSubmittedIndex + 1;

        setLastFilled(newLastFilled);

        // Check if all sections are completed
        if (newLastFilled >= sections.length) {
          setModal(true);
        }
      } else {
        // No response data - user hasn't started yet
        setLastFilled(0);
      }
    } catch (error) {
      setLastFilled(0);
    }

    setLoaded(true);
  };

  useEffect(() => {
    // Wait for both filledIndexDict and formConfig to be loaded
    if (Object.keys(filledIndexDict).length === 0 || !formConfig) return;

    const cookieClevoCode = Cookies.get("analytic_clevo_code");
    if (Cookies.get("analytic_clevo_id") && cookieClevoCode) {
      setClevoCode(cookieClevoCode);
      checkLastFilled();

      // Check if first time user for rewards (from Supabase)
      const checkRulesSeen = async () => {
        const rewards = await getRewards();
        if (!rewards.rules_seen) {
          setIsFirstTimeUser(true);
          setShowRulesModal(true);
          // Mark rules as seen in Supabase
          await updateRewards({ rules_seen: true });
        }
      };
      checkRulesSeen();
    } else {
      navigate(`/analytic-form-login/${formId}`, { replace: true });
    }
  }, [filledIndexDict, formConfig, formId, getRewards, updateRewards]);

  // Simple and reliable streak timer
  const startStreakTimer = () => {
    console.log("Starting streak timer");
    clearStreakTimer();

    streakTimeoutRef.current = setTimeout(() => {
      console.log("Showing streak warning at 2:50");

      flushSync(() => {
        setShowStreakWarning(true);
        setWarningCountdown(10);
      });

      let countdown = 10;
      countdownIntervalRef.current = setInterval(async () => {
        countdown--;
        console.log(`Countdown: ${countdown}`);
        setWarningCountdown(countdown);

        if (countdown <= 0) {
          console.log("Timer expired - resetting streak to 0");

          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;

          flushSync(() => {
            setShowStreakWarning(false);
          });

          // Reset streak in Supabase
          await updateRewards({ streaks: 0, last_updated: null });
          console.log("Global streak cleared from Supabase (reset to 0)");

          window.dispatchEvent(new CustomEvent("analyticCoinsUpdated"));
          console.log("Streak reset complete");
        }
      }, 1000);
    }, WARNING_TIME);
  };

  const clearStreakTimer = () => {
    if (streakTimeoutRef.current) {
      clearTimeout(streakTimeoutRef.current);
      streakTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setShowStreakWarning(false);
    setWarningCountdown(10);
    console.log("Streak timer cleared");
  };

  // Start timer on page load if user has an active streak
  useEffect(() => {
    const checkAndResumeStreakTimer = async () => {
      const cookieClevoCode = Cookies.get("analytic_clevo_code");
      if (!cookieClevoCode || !formId) return;

      try {
        const rewards = await getRewards();
        const { streaks = 0, last_updated } = rewards;

        if (streaks > 0 && last_updated) {
          const timeSinceLastUpdate = Date.now() - last_updated;

          if (timeSinceLastUpdate < STREAK_TIME_LIMIT) {
            console.log("Resuming streak timer on main page");

            const remainingTime = STREAK_TIME_LIMIT - timeSinceLastUpdate;
            const timeUntilWarning = WARNING_TIME - timeSinceLastUpdate;

            if (timeUntilWarning > 0) {
              streakTimeoutRef.current = setTimeout(() => {
                console.log("Showing streak warning at 2:50 (main page)");

                flushSync(() => {
                  setShowStreakWarning(true);
                  setWarningCountdown(10);
                });

                let countdown = 10;
                countdownIntervalRef.current = setInterval(async () => {
                  countdown--;
                  setWarningCountdown(countdown);

                  if (countdown <= 0) {
                    clearInterval(countdownIntervalRef.current);
                    countdownIntervalRef.current = null;

                    flushSync(() => {
                      setShowStreakWarning(false);
                    });

                    // Reset streak in Supabase
                    await updateRewards({ streaks: 0, last_updated: null });
                    window.dispatchEvent(new CustomEvent("analyticCoinsUpdated"));
                  }
                }, 1000);
              }, timeUntilWarning);
            } else if (remainingTime > 0) {
              const secondsLeft = Math.ceil(remainingTime / 1000);

              flushSync(() => {
                setShowStreakWarning(true);
                setWarningCountdown(Math.min(secondsLeft, 10));
              });

              let countdown = Math.min(secondsLeft, 10);
              countdownIntervalRef.current = setInterval(async () => {
                countdown--;
                setWarningCountdown(countdown);

                if (countdown <= 0) {
                  clearInterval(countdownIntervalRef.current);
                  countdownIntervalRef.current = null;

                  flushSync(() => {
                    setShowStreakWarning(false);
                  });

                  // Reset streak in Supabase
                  await updateRewards({ streaks: 0, last_updated: null });
                  window.dispatchEvent(new CustomEvent("analyticCoinsUpdated"));
                }
              }, 1000);
            }
          }
        }
      } catch (e) {
        console.error("Error checking streak timer status:", e);
      }
    };

    checkAndResumeStreakTimer();
  }, [formId, getRewards, updateRewards]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearStreakTimer();
    };
  }, []);

  const handleLogout = () => {
    setLoaded(false);

    // Clear cookies
    Cookies.remove("analytic_clevo_id");
    Cookies.remove("analytic_clevo_code");
    Cookies.remove("analytic_form_id");

    setTimeout(() => {
      navigate(`/analytic-form-login/${formId}`, { replace: true });
    }, 1500);
  };

  // Helper function to check if section is submitted (from local Supabase data)
  const checkSectionSubmitted = (sectionName) => {
    // Use locally stored response data for synchronous access
    return supabaseResponseData?.sections?.[sectionName]?.is_submitted || false;
  };

  // Helper function to get section progress (from local Supabase data)
  const getSectionProgress = (sectionName) => {
    // Use locally stored response data for synchronous access
    if (!supabaseResponseData || !supabaseResponseData.sections || !supabaseResponseData.sections[sectionName]) {
      return { completed: false, progress: 0, hasData: false };
    }

    const section = supabaseResponseData.sections[sectionName];
    const sectionConfig = jsonData.find(item => Object.keys(item)[0] === sectionName);

    if (!sectionConfig) {
      return { completed: section.is_submitted, progress: section.is_submitted ? 100 : 0, hasData: true };
    }

    const questions = sectionConfig[sectionName];
    const totalQuestions = questions.length;
    const answers = section.answers || {};

    let filledCount = 0;
    questions.forEach((question) => {
      const questionIndex = question["index"];
      if (answers[questionIndex] && answers[questionIndex][0] && answers[questionIndex][0] !== "") {
        filledCount++;
      }
    });

    const progress = totalQuestions > 0 ? Math.round((filledCount / totalQuestions) * 100) : 0;

    return {
      completed: section.is_submitted,
      progress: section.is_submitted ? 100 : progress,
      hasData: filledCount > 0,
      filledCount,
      totalQuestions
    };
  };

  // Use formConfig.sections.length as it's loaded from Supabase before jsonData
  const maxSections = formConfig?.sections?.length || jsonData.length || 0;

  return (
    <>
      {!isLoaded ? <LoadingScreen /> : null}
      {<AnalyticSuccessModal modalOpen={modalOpen} fun={handleModal} formId={formId} maxSections={maxSections} />}
      <RewardsRulesModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
        isFirstTime={isFirstTimeUser}
      />
      <div className="flex-col gap-4 items-center justify-center h-full bg-gray-50 font-sans w-full pb-40">
        <AnalyticFormNavbar
          onRulesClick={() => setShowRulesModal(true)}
          navbarVisible={true}
          showStreakWarning={showStreakWarning}
          warningCountdown={warningCountdown}
          formId={formId}
          formName={formConfig?.name || "Analytics Form"}
          sectionsCount={formConfig?.sections?.length || 13}
        />

        <div className="relative h-[90%] w-[90%] tab:w-[94%] mac:w-[94%] mx-auto">
          <div className="mt-6 mb-2">
            <span className="font-sans text-[1.1rem] leading-[1.5rem] tab:text-[1.3rem] tab:leading-[2.1rem] mac:text-[1.2rem] mac:leading-[1.7rem] md:leading-[1.7rem] md:text-[1.1rem] opensans-regular text-[#2C2C2C]">
              Please fill in the details:
            </span>
          </div>

          {jsonData.map((item, index) => {
            const sectionName = Object.keys(item)[0];
            const isSubmitted = checkSectionSubmitted(sectionName);

            const isNextToFill = lastFilled === index;

            let sectionProgress = { completed: false, progress: 0, hasData: false };

            if (clevoCode) {
              if (!isSubmitted) {
                if (isNextToFill) {
                  const isJustNavigated = sessionStorage.getItem("analyticNavigatedFromSubmission") === "true";
                  if (isJustNavigated) {
                    sectionProgress = { completed: false, progress: 0, hasData: false };
                  } else {
                    sectionProgress = getSectionProgress(sectionName);
                  }
                } else if (index < lastFilled) {
                  sectionProgress = getSectionProgress(sectionName);
                }
              } else {
                sectionProgress = getSectionProgress(sectionName);
              }
            }

            const isActive = isNextToFill;
            const isDisabled = index > lastFilled;
            const isCompleted = index < lastFilled || isSubmitted;

            return (
              <div
                className={`font-sans flex flex-col ${isDisabled ? "opacity-50" : ""}`}
                key={index}
                style={{ minHeight: "80px" }}
              >
                <Link
                  to={isActive ? `/analytic-form/${formId}/${index}/${sectionName}` : "#"}
                  onClick={() => {
                    if (isActive) {
                      console.log(`Section ${sectionName} clicked`);
                    }
                  }}
                  className="flex-1"
                >
                  <div className="h-full flex items-center justify-between py-4">
                    <span
                      className={`text-[1.1rem] leading-[1.5rem] tab:text-[1.3rem] tab:leading-[2.1rem] mac:text-[1.2rem] mac:leading-[1.7rem] md:leading-[1.7rem] md:text-[1.1rem] xxl:text-[1.3rem] font-bold arca ease-in-out duration-200 ${isDisabled ? "text-gray-400" : "text-[#2C2C2C]"
                        }`}
                    >
                      {sectionName.charAt(0) + sectionName.slice(1).toLowerCase()}
                    </span>
                    <span className="flex items-center">
                      {isCompleted ? (
                        <img src={completeBadge} className="w-12 h-12" alt="Completed" />
                      ) : isActive ? (
                        <img src={unlockedIcon} className="w-12 h-12" alt="In Progress" />
                      ) : (
                        <img src={lockedIcon} className="w-12 h-12" alt="Locked" />
                      )}
                    </span>
                  </div>
                </Link>
                <div className="w-full bg-gray-200 rounded-full mt-auto overflow-hidden" style={{ height: "2px" }}>
                  <div
                    className="bg-[#08B7F6] transition-all duration-300"
                    style={{
                      height: "2px",
                      width: `${isCompleted ? 100 : sectionProgress.progress || 0}%`,
                    }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="z-20 fixed flex justify-between bottom-0 bg-white px-7 py-4 tab:p-6 md:px-12 md:py-8 w-full mx-auto">
        <div>
          <button
            onClick={handleLogout}
            className="text-[15px] px-8 rounded-full py-4 opensans-bold border-[3px] hover:bg-[#080594] hover:text-white hover border-[#080594] uppercase text-[#080594] transition-all"
          >
            Log Out
          </button>
        </div>
        {lastFilled === maxSections ? (
          <button
            onClick={async () => {
              // Mark form as finally submitted in Supabase
              const submitted = await markFormSubmitted();
              console.log("Form marked as submitted:", submitted);

              setModal(true);
              sessionStorage.removeItem("analyticNavigatedFromSubmission");
              sessionStorage.clear();
              console.log("Form completed - sessionStorage cleared");

              setTimeout(() => {
                navigate("/", { replace: true });
              }, 2000);
            }}
            className="text-[15px] px-10 py-4 opensans-bold bg-[#080594] rounded-full uppercase text-white hover:text-[#080594] hover:bg-white border-[3px] border-[#080594] transition-all"
          >
            done
          </button>
        ) : (
          <button
            disabled
            className="text-[15px] px-10 py-4 opensans-bold bg-[#8f8fae] rounded-full uppercase text-white transition-all cursor-not-allowed"
          >
            done
          </button>
        )}
      </div>
    </>
  );
}
