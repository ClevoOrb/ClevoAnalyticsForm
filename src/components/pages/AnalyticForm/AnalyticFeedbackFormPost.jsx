/**
 * AnalyticFeedbackFormPost.jsx
 *
 * This component renders individual form sections with questions.
 * It works exactly like FeedbackFormPost but loads questions dynamically
 * from Supabase based on the formId (form_code) parameter.
 *
 * Key differences from the original:
 * - Questions are loaded from Supabase instead of static JSON
 * - Storage keys include formId to separate data between forms
 * - Uses analytic-specific cookies and localStorage keys for session data
 */

import React, { useEffect, useState, useRef } from "react";
import { flushSync } from "react-dom";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import SingleQuestion from "../Form/SingleQuestion";
import ConfirmationModal from "../Form/ConfimationModal";
import Cookies from "js-cookie";
import LoadingScreen from "../Form/LoadingScreen";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import useAnalyticSimpleFormStorage from "../../../hooks/useAnalyticSimpleFormStorage";
import RewardsRulesModal from "../Form/RewardsRulesModal";
import BadgeEarnedModal from "../Form/BadgeEarnedModal";
import AnalyticFormNavbar from "./AnalyticFormNavbar";
import BackButton from "../../common/BackButton";
import useAnalyticForms from "../../../hooks/useAnalyticForms";
import useAnalyticResponses from "../../../hooks/useAnalyticResponses";

// Use URL references instead of imports to avoid bundling large SVG files
const Points = "/assets/point.svg";
const Streaks = "/assets/streak.svg";
const Badge = "/assets/sectionBadge.svg";

export default function AnalyticFeedbackFormPost() {
  const { formId, id, index } = useParams();
  const [questionDone, setQuestionDone] = useState(0);
  const [isLoaded, setLoaded] = useState(true);
  const [modal, setModal] = useState(false);
  const [spclq, setSplcQ] = useState(false);
  const [subQDone, setSubQDone] = useState(false);
  const [data, setData] = useState({});
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [canAutoSave, setCanAutoSave] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [badgeModalData, setBadgeModalData] = useState({ sectionName: "", coins: 0, streaks: 0 });

  // Form configuration and questions
  const [formConfig, setFormConfig] = useState(null);
  const [jsonData, setJsonData] = useState([]);
  const [currentQuestions, setCurrentQuestions] = useState([]);
  const [filledIndexDict, setFilledIndexDict] = useState({});

  // Simple rewards state
  const [sectionCoins, setSectionCoins] = useState(0);
  const [streakCount, setStreakCount] = useState(0);
  const [lastAnswerTime, setLastAnswerTime] = useState(null);
  const [answeredQuestions, setAnsweredQuestions] = useState(new Set());

  // Navbar hide/show on scroll
  const [navbarVisible, setNavbarVisible] = useState(true);
  const lastScrollY = useRef(0);

  // Track if this is a fresh section start
  const [isFreshSectionStart, setIsFreshSectionStart] = useState(false);
  const [isCoinFlipping, setIsCoinFlipping] = useState(false);
  const [showBonusAnimation, setShowBonusAnimation] = useState(false);
  const [streakCelebration, setStreakCelebration] = useState(false);

  // Simple timer states
  const [showStreakWarning, setShowStreakWarning] = useState(false);
  const [warningCountdown, setWarningCountdown] = useState(10);
  const streakTimeoutRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  const navigate = useNavigate();

  // Supabase hook for fetching forms
  const { getForm } = useAnalyticForms();

  // Initialize simple storage hook
  const [clevoCode, setClevoCode] = useState(Cookies.get("analytic_clevo_code") || "");
  const { saveData, loadData, clearData, syncToSupabase } = useAnalyticSimpleFormStorage(id, clevoCode, formId);

  // Supabase hook for saving responses
  const {
    saveSectionData,
    markSectionSubmitted,
    updateRewards: updateSupabaseRewards,
    getResponse: getSupabaseResponse
  } = useAnalyticResponses(formId, clevoCode);

  // Main question for tracking submission and indicator
  const [mainq, setmainQ] = useState({});
  const [mandateSubQ, setSubQ] = useState([]);

  // Simple rewards constants
  const COINS_PER_QUESTION = 100;
  const BONUS_FOR_5_STREAKS = 200;
  const STREAK_TIME_LIMIT = 3 * 60 * 1000; // 3 minutes
  const WARNING_TIME = (2 * 60 + 50) * 1000; // 2 minutes 50 seconds

  // TTL constants
  const SECTION_DATA_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  // Load form configuration from Supabase
  useEffect(() => {
    const loadFormConfig = async () => {
      if (!formId) return;

      try {
        console.log('AnalyticFeedbackFormPost: Loading form with code:', formId);
        const config = await getForm(formId);

        if (config) {
          console.log('AnalyticFeedbackFormPost: Form loaded:', config);
          setFormConfig(config);
          setJsonData(config.questions || []);

          // Build FilledIndexDict
          const dict = { "No Report Found": 0 };
          config.sections?.forEach((sectionName, idx) => {
            dict[sectionName] = idx + 1;
          });
          dict["All Done"] = (config.sections?.length || 0) + 1;
          setFilledIndexDict(dict);

          // Get current questions
          const sectionIndex = parseInt(index);
          if (config.questions[sectionIndex]) {
            const questions = config.questions[sectionIndex][id];
            setCurrentQuestions(questions || []);
          }
        } else {
          console.error('AnalyticFeedbackFormPost: Form not found');
          navigate("/analytic-form-upload");
        }
      } catch (e) {
        console.error("Error loading form config from Supabase:", e);
        navigate("/analytic-form-upload");
      }
    };

    loadFormConfig();
  }, [formId, id, index, navigate, getForm]);

  // Streak timer functions
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
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      countdownIntervalRef.current = setInterval(() => {
        if (countdownIntervalRef.current === null) return; // Guard against stale callbacks
        countdown--;
        console.log(`Countdown: ${countdown}`);
        setWarningCountdown(countdown);

        if (countdown <= 0) {
          console.log("Timer expired - resetting streak to 0");

          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }

          flushSync(() => {
            setStreakCount(0);
            setShowStreakWarning(false);
          });

          console.log("Timer expired - setting lastAnswerTime to null");
          setLastAnswerTime(null);

          const clevoCode = Cookies.get("analytic_clevo_code");
          if (clevoCode) {
            const globalRewardsKey = `analytic_rewards_${formId}_${clevoCode}`;
            const globalData = localStorage.getItem(globalRewardsKey);
            if (globalData) {
              try {
                const parsed = JSON.parse(globalData);
                parsed.streaks = 0;
                delete parsed.lastUpdated;
                localStorage.setItem(globalRewardsKey, JSON.stringify(parsed));
                console.log("Global streak cleared from localStorage");
              } catch (e) {
                console.error("Error updating global rewards:", e);
              }
            }
          }

          window.dispatchEvent(new CustomEvent("analyticCoinsUpdated"));
          console.log("Streak reset complete - lastAnswerTime should now be null");
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

  const triggerCoinFlip = () => {
    setIsCoinFlipping(true);
    setTimeout(() => {
      setIsCoinFlipping(false);
    }, 1000);
  };

  // Cleanup expired section data
  const cleanupExpiredSectionData = (clevoCode) => {
    const now = Date.now();
    const keysToRemove = [];

    console.log("Running section data cleanup...");

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      if (
        key.includes(`_${formId}_${clevoCode}_`) &&
        (key.includes("analytic_form_data_") ||
          key.includes("analytic_simple_") ||
          key.includes("analytic_section_rewards_") ||
          key.startsWith("analytic_answered_"))
      ) {
        try {
          const data = localStorage.getItem(key);
          let shouldRemove = false;

          if (key.includes("analytic_section_rewards_")) {
            const parsed = JSON.parse(data);
            if (parsed.ttl && parsed.completed === false && now - parsed.ttl > SECTION_DATA_TTL) {
              console.log(`Removing expired section rewards: ${key}`);
              shouldRemove = true;
            }
          } else if (key.includes("analytic_form_data_") || key.includes("analytic_simple_")) {
            const parsed = JSON.parse(data);
            if (parsed.ttl && now - parsed.ttl > SECTION_DATA_TTL) {
              console.log(`Removing expired form data: ${key}`);
              shouldRemove = true;
            }
          }

          if (shouldRemove) {
            keysToRemove.push(key);
          }
        } catch (e) {
          console.warn(`Error checking TTL for key: ${key}`, e);
        }
      }
    }

    keysToRemove.forEach((key) => {
      try {
        localStorage.removeItem(key);
        console.log(`Removed expired data: ${key}`);
      } catch (e) {
        console.error(`Error removing expired key: ${key}`, e);
      }
    });

    if (keysToRemove.length > 0) {
      console.log(`Cleanup complete: removed ${keysToRemove.length} expired items`);
    } else {
      console.log("Cleanup complete: no expired data found");
    }
  };

  const checkLastFilled = async () => {
    try {
      // Check Supabase for submitted sections
      const supabaseResponse = await getSupabaseResponse();
      console.log("AnalyticFeedbackFormPost: Supabase response:", supabaseResponse);

      // Check if form is already submitted (is_form_submitted flag)
      if (supabaseResponse?.is_form_submitted === true) {
        console.log("Form already submitted - redirecting to main form page");
        navigate(`/analytic-form/${formId}`, { replace: true });
        return;
      }

      if (supabaseResponse && supabaseResponse.sections) {
        // Get all section names from the form config
        const sections = formConfig?.sections || [];

        // Find the last submitted section index
        let lastSubmittedIndex = -1;
        sections.forEach((sectionName, idx) => {
          if (supabaseResponse.sections[sectionName]?.is_submitted) {
            lastSubmittedIndex = idx;
          }
        });

        // The next section to fill is lastSubmittedIndex + 1
        const nextSectionIndex = lastSubmittedIndex + 1;

        console.log("Last submitted index:", lastSubmittedIndex, "Next section:", nextSectionIndex, "Current index:", index);

        // User can only access the next section to fill
        if (parseInt(index) !== nextSectionIndex) {
          console.log("Redirecting - user tried to access wrong section");
          navigate(`/analytic-form/${formId}`, { replace: true });
        }
      } else {
        // No response - user can only access section 0
        if (parseInt(index) !== 0) {
          console.log("Redirecting - no response and not first section");
          navigate(`/analytic-form/${formId}`, { replace: true });
        }
      }
    } catch (error) {
      console.error("Error checking last filled from Supabase:", error);
    }
    setLoaded(true);
  };

  // Scroll event handler for navbar
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const screenWidth = window.innerWidth;

      if (screenWidth < 1200) {
        setNavbarVisible(true);
      } else {
        if (currentScrollY > lastScrollY.current && currentScrollY > 80) {
          setNavbarVisible(false);
        } else {
          setNavbarVisible(true);
        }
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Timer cleanup
  useEffect(() => {
    return () => {
      clearStreakTimer();
    };
  }, []);

  // Sync to Supabase before page unload (backup data to cloud)
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Sync current form data to Supabase before leaving
      if (syncToSupabase) {
        syncToSupabase();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Also sync when component unmounts (navigation)
      if (syncToSupabase) {
        syncToSupabase();
      }
    };
  }, [syncToSupabase]);

  // Initialize component and check authentication
  useEffect(() => {
    if (currentQuestions.length === 0 || Object.keys(filledIndexDict).length === 0) return;

    const initializeComponent = async () => {
      console.log("INITIALIZATION STARTING for section:", id, "clevoCode:", clevoCode);
      setLoaded(false);

      window.scrollTo(0, 0);

      const cookieClevoCode = Cookies.get("analytic_clevo_code");
      if (!cookieClevoCode) {
        navigate(`/analytic-form-login/${formId}`, { replace: true });
        return;
      }

      setClevoCode(cookieClevoCode);

      const isComingFromPreviousSection = sessionStorage.getItem("analyticNavigatedFromSubmission") === "true";

      // Restore streak and timer from localStorage
      const globalRewardsKey = `analytic_rewards_${formId}_${cookieClevoCode}`;
      const globalData = localStorage.getItem(globalRewardsKey);

      if (globalData) {
        try {
          const parsed = JSON.parse(globalData);
          const hasStreak = parsed.streaks > 0;
          const hasLastUpdated = !!parsed.lastUpdated;

          console.log(`Streak restoration check: streaks=${parsed.streaks}, lastUpdated=${parsed.lastUpdated ? new Date(parsed.lastUpdated).toLocaleTimeString() : 'none'}`);

          if (hasStreak && hasLastUpdated) {
            const timeSinceLastUpdate = Date.now() - parsed.lastUpdated;
            const timeRemaining = STREAK_TIME_LIMIT - timeSinceLastUpdate;

            if (timeRemaining > 0) {
              // Timer still valid - restore streak and lastAnswerTime
              console.log(`Timer still valid: ${Math.round(timeRemaining / 1000)}s remaining`);
              setStreakCount(parsed.streaks);
              setLastAnswerTime(parsed.lastUpdated);
              console.log(`Restored streak: ${parsed.streaks}, lastAnswerTime: ${new Date(parsed.lastUpdated).toLocaleTimeString()}`);

              // Set up the warning timer
              const timeUntilWarning = WARNING_TIME - timeSinceLastUpdate;

              if (timeUntilWarning <= 0) {
                // Already in warning period
                const secondsLeft = Math.ceil(timeRemaining / 1000);
                console.log(`Already in warning period - ${secondsLeft}s left`);
                setShowStreakWarning(true);
                setWarningCountdown(Math.min(secondsLeft, 10));

                let countdown = Math.min(secondsLeft, 10);
                if (countdownIntervalRef.current) {
                  clearInterval(countdownIntervalRef.current);
                }
                countdownIntervalRef.current = setInterval(() => {
                  if (countdownIntervalRef.current === null) return; // Guard against stale callbacks
                  countdown--;
                  setWarningCountdown(countdown);

                  if (countdown <= 0) {
                    if (countdownIntervalRef.current) {
                      clearInterval(countdownIntervalRef.current);
                      countdownIntervalRef.current = null;
                    }
                    setStreakCount(0);
                    setShowStreakWarning(false);
                    setLastAnswerTime(null);

                    const updated = { ...parsed, streaks: 0 };
                    delete updated.lastUpdated;
                    localStorage.setItem(globalRewardsKey, JSON.stringify(updated));
                    window.dispatchEvent(new CustomEvent("analyticCoinsUpdated"));
                    console.log("Warning countdown expired - streak reset to 0");
                  }
                }, 1000);
              } else {
                // Set timer to show warning at 2:50
                console.log(`Setting warning timer for ${Math.round(timeUntilWarning / 1000)}s`);
                streakTimeoutRef.current = setTimeout(() => {
                  console.log("Warning timer triggered");
                  setShowStreakWarning(true);
                  setWarningCountdown(10);

                  let countdown = 10;
                  if (countdownIntervalRef.current) {
                    clearInterval(countdownIntervalRef.current);
                  }
                  countdownIntervalRef.current = setInterval(() => {
                    if (countdownIntervalRef.current === null) return; // Guard against stale callbacks
                    countdown--;
                    setWarningCountdown(countdown);

                    if (countdown <= 0) {
                      if (countdownIntervalRef.current) {
                        clearInterval(countdownIntervalRef.current);
                        countdownIntervalRef.current = null;
                      }
                      setStreakCount(0);
                      setShowStreakWarning(false);
                      setLastAnswerTime(null);

                      const currentGlobalData = localStorage.getItem(globalRewardsKey);
                      if (currentGlobalData) {
                        const currentParsed = JSON.parse(currentGlobalData);
                        currentParsed.streaks = 0;
                        delete currentParsed.lastUpdated;
                        localStorage.setItem(globalRewardsKey, JSON.stringify(currentParsed));
                      }
                      window.dispatchEvent(new CustomEvent("analyticCoinsUpdated"));
                      console.log("Warning countdown expired - streak reset to 0");
                    }
                  }, 1000);
                }, timeUntilWarning);
              }
            } else {
              // Timer expired - reset streak
              console.log("Timer expired - resetting streak to 0");
              setStreakCount(0);
              setLastAnswerTime(null);

              const updated = { ...parsed, streaks: 0 };
              delete updated.lastUpdated;
              localStorage.setItem(globalRewardsKey, JSON.stringify(updated));
            }
          } else if (hasStreak && !hasLastUpdated) {
            // Has streak but no timer - just restore streak count
            console.log(`Restoring streak without timer: ${parsed.streaks}`);
            setStreakCount(parsed.streaks);
          } else {
            // No streak in localStorage - don't reset, leave current state
            console.log("No streak in localStorage");
          }
        } catch (e) {
          console.error("Error restoring streak state:", e);
        }
      }

      // Clear warning state for fresh starts
      if (isComingFromPreviousSection) {
        setShowStreakWarning(false);
        setWarningCountdown(10);
        console.log("Section change - cleared warning state");
      }

      cleanupExpiredSectionData(cookieClevoCode);

      await checkLastFilled();

      const isFromPreviousSection = sessionStorage.getItem("analyticNavigatedFromSubmission") === "true";
      setIsFreshSectionStart(isFromPreviousSection);

      if (isFromPreviousSection) {
        const allSections = formConfig?.sections || [];

        allSections.forEach((sectionName) => {
          if (sectionName !== id) {
            const keysToRemove = [
              `analytic_form_data_${formId}_${cookieClevoCode}_${sectionName}`,
              `analytic_simple_${formId}_${cookieClevoCode}_${sectionName}`,
            ];

            keysToRemove.forEach((key) => {
              localStorage.removeItem(key);
            });

            const answeredKeysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.startsWith(`analytic_answered_${formId}_${cookieClevoCode}_${sectionName}_`)) {
                answeredKeysToRemove.push(key);
              }
            }
            answeredKeysToRemove.forEach((key) => localStorage.removeItem(key));

            console.log(`Cleared form data for OTHER section: ${sectionName}`);
          }
        });
      }

      // Initialize empty questions state
      var temp = {};
      currentQuestions.forEach((quest) => {
        temp[quest["index"]] = "";
      });

      // Check if section is submitted - first check Supabase, fallback to localStorage
      let isSubmitted = false;
      const supabaseData = await getSupabaseResponse();
      if (supabaseData && supabaseData.sections && supabaseData.sections[id]) {
        isSubmitted = supabaseData.sections[id].is_submitted || false;
      } else {
        // Fallback to localStorage for backwards compatibility
        isSubmitted = localStorage.getItem(`analytic_submitted_${formId}_${cookieClevoCode}_${id}`) === "true";
      }

      console.log(`Section initialization: ${id}, submitted: ${isSubmitted}, fromPrevious: ${isFromPreviousSection}`);

      if (isFromPreviousSection) {
        const currentSectionKeysToRemove = [
          `analytic_form_data_${formId}_${cookieClevoCode}_${id}`,
          `analytic_simple_${formId}_${cookieClevoCode}_${id}`,
        ];

        currentSectionKeysToRemove.forEach((key) => {
          localStorage.removeItem(key);
          console.log(`Cleared current section data for fresh start: ${key}`);
        });

        const answeredKeysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(`analytic_answered_${formId}_${cookieClevoCode}_${id}_`)) {
            answeredKeysToRemove.push(key);
          }
        }
        answeredKeysToRemove.forEach((key) => {
          localStorage.removeItem(key);
          console.log(`Cleared answered flag for fresh start: ${key}`);
        });

        console.log(`Section ${id} - cleared for fresh start`);
      } else {
        console.log(`Section ${id} - preserving existing data`);
      }

      // Load saved section rewards if available
      const sectionRewardsKey = `analytic_section_rewards_${formId}_${cookieClevoCode}_${id}`;
      const savedSectionRewards = localStorage.getItem(sectionRewardsKey);

      if (savedSectionRewards && !isFromPreviousSection) {
        try {
          const savedData = JSON.parse(savedSectionRewards);
          console.log("Loading saved section rewards:", savedData);

          setSectionCoins(savedData.coins || 0);
          setAnsweredQuestions(new Set(savedData.answeredQs || []));

          // Note: Streak is already restored at the top of initializeComponent
          // Don't override it here to avoid race conditions

          console.log(`Section ${id} loaded - coins: ${savedData.coins || 0}`);

          if (savedData.answeredQs) {
            savedData.answeredQs.forEach((qIndex) => {
              const answeredKey = `analytic_answered_${formId}_${cookieClevoCode}_${id}_${qIndex}`;
              localStorage.setItem(answeredKey, "true");
            });
          }
        } catch (e) {
          console.error("Error loading section rewards:", e);
          setSectionCoins(0);
          // Don't reset streak here - it's managed by the streak initialization block
          setAnsweredQuestions(new Set());
        }
      } else {
        console.log("No saved section rewards or fresh start - initializing empty");
        setSectionCoins(0);
        setAnsweredQuestions(new Set());

        // Note: Streak is already restored at the top of initializeComponent
        // Don't override it here to avoid race conditions

        console.log("Initialized sectionCoins to 0 for fresh start");

        if (isFromPreviousSection) {
          const keysToRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(`analytic_answered_${formId}_${cookieClevoCode}_${id}_`)) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach((key) => localStorage.removeItem(key));
        }
      }

      if (isFromPreviousSection) {
        sessionStorage.removeItem("analyticNavigatedFromSubmission");

        console.log(`Fresh section start for ${id} - starting completely fresh`);

        console.log("FRESH SECTION - Setting empty state for:", id);
        setmainQ(temp);
        setData({});
        setSubQ([]);

        setSectionCoins(0);
        setAnsweredQuestions(new Set());

        // Note: Streak is already restored at the top of initializeComponent
        // Don't override it here to avoid race conditions

        console.log(`Fresh section ${id} - starting fresh`);
      } else if (isSubmitted) {
        setmainQ(temp);
        setData({});
        setSubQ([]);

        const finalSectionRewards = localStorage.getItem(`analytic_section_rewards_${formId}_${cookieClevoCode}_${id}`);
        if (!finalSectionRewards) {
          setSectionCoins(0);
          // Note: Don't reset streak here - it's managed at the top
        }
      } else {
        console.log("Normal navigation to section:", id);

        // loadData is async - must await it
        const savedData = await loadData();

        if (savedData) {
          console.log("Found saved data in normal navigation:", savedData);
          if (savedData.formData) {
            console.log("NORMAL NAVIGATION - Restoring saved data for:", id, savedData.formData);
            setData(savedData.formData);
            console.log("Restored form data in normal navigation:", savedData.formData);
          } else {
            console.log("NORMAL NAVIGATION - No form data, setting empty for:", id);
            setData({});
          }

          setmainQ(temp);

          if (savedData.subQuestions) {
            setSubQ(savedData.subQuestions);
            console.log("Restored sub questions in normal navigation:", savedData.subQuestions);
          } else {
            setSubQ([]);
          }
        } else {
          console.log("No saved data found in normal navigation, initializing empty");
          setmainQ(temp);
          setData({});
          setSubQ([]);
        }
      }

      setIsDataLoaded(true);

      console.log("FINAL DATA STATE before rendering:", data);
      console.log("FINAL MAINQ STATE before rendering:", mainq);

      if (isFromPreviousSection) {
        setTimeout(() => {
          console.log("Resetting fresh section flag after initial render");
          setIsFreshSectionStart(false);
        }, 100);
      }

      setTimeout(() => {
        setLoaded(true);
        setTimeout(() => {
          setCanAutoSave(true);
        }, 300);
      }, 100);
    };

    initializeComponent();
  }, [id, clevoCode, currentQuestions, filledIndexDict, formId]);

  const mainqUpdater = (ind, val) => {
    setmainQ((prevMainQ) => {
      const updatedMainQ = { ...prevMainQ, [ind]: val };

      if (canAutoSave) {
        saveData(data, mainq, mandateSubQ);
      }

      return updatedMainQ;
    });
  };

  const subQupdater = (val, operation) => {
    const updatedSubQ = [...mandateSubQ];

    if (operation === "add") {
      if (!updatedSubQ.includes(val)) {
        updatedSubQ.push(val);
      }
    } else if (operation === "delete") {
      const index = updatedSubQ.indexOf(val);
      if (index !== -1) {
        updatedSubQ.splice(index, 1);
      }
    }

    setSubQ(updatedSubQ);

    if (canAutoSave) {
      saveData(data, mainq, updatedSubQ);
    }
  };

  useEffect(() => {
    if (!isDataLoaded || currentQuestions.length === 0) return;

    if (id === "MEDICAL HISTORY" && data[1] && data[1][0] === "Yes") {
      setSplcQ(true);
    } else {
      setSplcQ(false);
    }

    let count = 0;

    currentQuestions.forEach((question) => {
      const questionIndex = question["index"];
      if (data[questionIndex] && data[questionIndex][0] && data[questionIndex][0] !== "") {
        count++;
      }
    });
    setQuestionDone(count);

    const newMainQ = {};
    currentQuestions.forEach((question) => {
      const questionIndex = question["index"];
      newMainQ[questionIndex] = (data[questionIndex] && data[questionIndex][0]) || "";
    });

    if (JSON.stringify(newMainQ) !== JSON.stringify(mainq)) {
      setmainQ(newMainQ);
    }

    let flag = true;
    for (let i = 0; i < mandateSubQ.length; i++) {
      if (!data[mandateSubQ[i]] || data[mandateSubQ[i]][1] === "") {
        flag = false;
        break;
      }
    }
    setSubQDone(flag);
  }, [data, mainq, mandateSubQ, isDataLoaded, id, currentQuestions]);

  const updateData = (newData) => {
    console.log("updateData called with:", newData);

    setData((prevData) => {
      console.log("setData callback running, prevData:", prevData);
      const updatedData = {
        ...prevData,
        ...newData,
      };

      const newQuestionIndex = Object.keys(newData)[0];
      if (newQuestionIndex) {
        const hasAnswer = newData[newQuestionIndex] && newData[newQuestionIndex][0];
        const wasAnswered = prevData[newQuestionIndex] && prevData[newQuestionIndex][0];
        const questionKey = `${id}_${newQuestionIndex}`;
        const answeredKey = `analytic_answered_${formId}_${Cookies.get("analytic_clevo_code")}_${questionKey}`;
        const alreadyAwarded = localStorage.getItem(answeredKey);

        if (hasAnswer && !wasAnswered && !alreadyAwarded) {
          console.log(`Question ${newQuestionIndex} newly answered, will award coins`);

          localStorage.setItem(answeredKey, "true");

          triggerCoinFlip();
          window.dispatchEvent(new CustomEvent("analyticCoinsUpdated"));

          clearStreakTimer();
          console.log("Timer cleared - user answered question!");

          const now = Date.now();

          setSectionCoins((prevCoins) => {
            const newCoins = prevCoins + COINS_PER_QUESTION;
            console.log(`Coins: ${prevCoins} -> ${newCoins}`);
            return newCoins;
          });

          setLastAnswerTime((prevTime) => {
            console.log(`setLastAnswerTime called - prevTime: ${prevTime}, now: ${now}`);
            if (prevTime === null) {
              // First question - just set baseline time, no streak increment
              console.log("First question answered - setting baseline, streak stays at 0");
              return now;
            } else {
              const timeGap = now - prevTime;
              const timeGapSeconds = Math.round(timeGap / 1000);
              const timeLimitSeconds = STREAK_TIME_LIMIT / 1000;

              console.log(`Gap measurement: ${timeGap}ms (${timeGapSeconds}s) vs limit ${STREAK_TIME_LIMIT}ms`);

              if (timeGap <= STREAK_TIME_LIMIT) {
                setStreakCount((prevStreak) => {
                  let currentStreak = prevStreak;

                  if (typeof currentStreak !== "number" || isNaN(currentStreak) || currentStreak < 0) {
                    console.warn(`FIXING INVALID STREAK: was ${currentStreak}, forcing to 0`);
                    currentStreak = 0;
                  }

                  const newStreak = currentStreak + 1;
                  console.log(`FAST GAP: ${timeGapSeconds}s <= ${timeLimitSeconds}s -> Streak: ${currentStreak} -> ${newStreak}`);

                  if (newStreak % 5 === 0 && newStreak > 0) {
                    console.log(`${newStreak} consecutive fast gaps! Adding bonus coins`);
                    setSectionCoins((c) => c + BONUS_FOR_5_STREAKS);
                    setShowBonusAnimation(true);
                    setStreakCelebration(true);
                    setTimeout(() => setStreakCelebration(false), 2000);
                    window.dispatchEvent(new CustomEvent("analyticStreakMilestone"));
                  }

                  return newStreak;
                });

                return now;
              } else {
                console.log(`SLOW GAP: ${timeGapSeconds}s > ${timeLimitSeconds}s -> Streak broken`);

                // Reset streak to 0, this answer becomes the new baseline
                setStreakCount(0);
                clearStreakTimer();

                const clevoCode = Cookies.get("analytic_clevo_code");
                if (clevoCode) {
                  const globalRewardsKey = `analytic_rewards_${formId}_${clevoCode}`;
                  const globalData = localStorage.getItem(globalRewardsKey);
                  if (globalData) {
                    try {
                      const parsed = JSON.parse(globalData);
                      parsed.streaks = 0;
                      parsed.lastUpdated = now;
                      localStorage.setItem(globalRewardsKey, JSON.stringify(parsed));
                      console.log("Streak reset to 0 - new baseline set");
                    } catch (e) {
                      console.error("Error updating global rewards:", e);
                    }
                  }
                }

                console.log("Streak reset complete - this answer is new baseline");
                return now;
              }
            }
          });

          console.log(`RESTARTING TIMER: Reset to 0:00 at ${new Date().toLocaleTimeString()}`);
          startStreakTimer();

          setAnsweredQuestions((prev) => new Set([...prev, parseInt(newQuestionIndex)]));

          const currentCoins = sectionCoins + COINS_PER_QUESTION;
          const currentAnswered = new Set([...answeredQuestions, parseInt(newQuestionIndex)]);

          let bonusCoins = 0;

          setTimeout(() => {
            setStreakCount((currentStreak) => {
              bonusCoins = currentStreak % 5 === 0 && currentStreak > 0 ? BONUS_FOR_5_STREAKS : 0;

              const globalRewardsKey = `analytic_rewards_${formId}_${Cookies.get("analytic_clevo_code")}`;
              const existingGlobalRewards = localStorage.getItem(globalRewardsKey);
              const currentGlobal = existingGlobalRewards
                ? JSON.parse(existingGlobalRewards)
                : { coins: 0, badges: 0, streaks: 0 };

              const updatedGlobalRewards = {
                coins: currentGlobal.coins + COINS_PER_QUESTION + bonusCoins,
                badges: currentGlobal.badges,
                streaks: currentStreak,
                lastUpdated: now,
              };

              localStorage.setItem(globalRewardsKey, JSON.stringify(updatedGlobalRewards));
              console.log("Updated global rewards:", updatedGlobalRewards);

              const sectionRewardsKey = `analytic_section_rewards_${formId}_${Cookies.get("analytic_clevo_code")}_${id}`;
              const rewardsData = {
                coins: currentCoins + bonusCoins,
                answeredQs: Array.from(currentAnswered),
                completed: false,
                ttl: Date.now(),
              };
              localStorage.setItem(sectionRewardsKey, JSON.stringify(rewardsData));
              console.log("Saved section rewards with TTL:", rewardsData);

              return currentStreak;
            });
          }, 0);
        } else if (alreadyAwarded) {
          console.log(`Question ${newQuestionIndex} already awarded - skipping`);
        }
      }

      if (canAutoSave) {
        saveData(updatedData, mainq, mandateSubQ);
      }

      return updatedData;
    });
  };

  const finalSubmit = async (val) => {
    var temp = data;
    var finalData = {
      clevo_code: Cookies.get("analytic_clevo_code"),
      data: {
        heading: id,
        data: {
          0: ["", ""],
        },
      },
    };
    if (val === "no") setModal(false);
    else {
      setModal(false);
      setLoaded(false);

      const isLastSection =
        id === "All Done" ||
        id === "LIFESTYLE MODIFICATION INTENT" ||
        id.toUpperCase() === "ALL DONE" ||
        parseInt(index) === jsonData.length - 1;


      const saved = localStorage.getItem(`analytic_rewards_${formId}_${Cookies.get("analytic_clevo_code")}`);
      const current = saved ? JSON.parse(saved) : { coins: 0, badges: 0, streaks: 0 };

      const maxSections = jsonData.length;
      const newBadgeCount = Math.min(current.badges + 1, maxSections);

      localStorage.setItem(
        `analytic_rewards_${formId}_${Cookies.get("analytic_clevo_code")}`,
        JSON.stringify({
          coins: current.coins,
          streaks: current.streaks,
          badges: newBadgeCount,
          lastUpdated: current.lastUpdated || Date.now(),
        })
      );

      window.dispatchEvent(new CustomEvent("analyticCoinsUpdated"));

      const nextSectionName = getNextSectionName(index);
      if (nextSectionName) {
        const clevoCode = Cookies.get("analytic_clevo_code");

        const keysToRemove = [
          `analytic_simple_${formId}_${clevoCode}_${nextSectionName}`,
          `analytic_form_data_${formId}_${clevoCode}_${nextSectionName}`,
          `analytic_submitted_${formId}_${clevoCode}_${nextSectionName}`,
        ];

        keysToRemove.forEach((key) => {
          try {
            localStorage.removeItem(key);
            console.log(`Pre-cleared localStorage key: ${key}`);
          } catch (error) {
            console.error(`Error pre-clearing key ${key}:`, error);
          }
        });

        const answeredKeysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(`analytic_answered_${formId}_${clevoCode}_${nextSectionName}_`)) {
            answeredKeysToRemove.push(key);
          }
        }
        answeredKeysToRemove.forEach((key) => {
          localStorage.removeItem(key);
          console.log(`Pre-cleared answered key: ${key}`);
        });

        sessionStorage.setItem("analyticNavigatedFromSubmission", "true");
        console.log(`Pre-cleared all data for next section: ${nextSectionName}`);
      }

      // Handle specific sections
      if (id === "DEMOGRAPHIC") {
        temp[1] = ["", ""];
        if (temp[2][0] === "FEMALE") temp[3] = ["YES", ""];
        else temp[3] = ["NO", ""];
        if (temp[2][0] === "OTHERS") temp[4] = ["YES", ""];
        else temp[4] = ["NO", ""];
        if (temp[2][0] === "MALE") temp[2] = ["YES", ""];
        else temp[2] = ["NO", ""];
      }

      if (id === "Signs and Symptoms".toUpperCase()) {
        temp[0] = ["", ""];
      }

      finalData["data"]["data"] = temp;

      try {
        // Save response to Supabase (primary storage)
        // IMPORTANT: Wait for all Supabase operations to complete before navigating
        console.log("Saving section data to Supabase...");
        const saveResult = await saveSectionData(id, {
          formData: temp,
          mainQuestions: mainq,
          subQuestions: mandateSubQ
        }, true); // true = mark as submitted
        console.log("saveSectionData result:", saveResult);

        // Also mark section as submitted explicitly (redundant but ensures consistency)
        console.log("Marking section as submitted...");
        const markResult = await markSectionSubmitted(id);
        console.log("markSectionSubmitted result:", markResult);

        // Update rewards in Supabase
        console.log("Updating rewards in Supabase...");
        const rewardsResult = await updateSupabaseRewards({
          coins: current.coins,
          streaks: current.streaks,
          badges: newBadgeCount
        });
        console.log("updateSupabaseRewards result:", rewardsResult);

        // Also send to original API for backwards compatibility (optional)
        try {
          await axios.post(`https://api.theorb.bio/api/v1/reports/`, finalData);
        } catch (apiError) {
          // Original API submission failed (non-critical)
        }

        // Keep localStorage as cache for quick UI updates
        const submittedKey = `analytic_submitted_${formId}_${Cookies.get("analytic_clevo_code")}_${id}`;
        localStorage.setItem(submittedKey, "true");

        const currentSectionKeys = [
          `analytic_form_data_${formId}_${Cookies.get("analytic_clevo_code")}_${id}`,
          `analytic_simple_${formId}_${Cookies.get("analytic_clevo_code")}_${id}`,
        ];

        currentSectionKeys.forEach((key) => {
          localStorage.removeItem(key);
        });

        const sectionRewardsKey = `analytic_section_rewards_${formId}_${Cookies.get("analytic_clevo_code")}_${id}`;
        const existingSectionRewards = localStorage.getItem(sectionRewardsKey);
        if (existingSectionRewards) {
          try {
            const parsed = JSON.parse(existingSectionRewards);
            const completedRewards = {
              ...parsed,
              completed: true,
              completedAt: Date.now(),
              ttl: undefined,
            };
            localStorage.setItem(sectionRewardsKey, JSON.stringify(completedRewards));
          } catch (e) {
            // Error updating section rewards completion status
          }
        }

        clearData();

        // Hide loader before navigation
        setLoaded(true);

        // Small delay to ensure Supabase has propagated the changes
        await new Promise(resolve => setTimeout(resolve, 100));

        if (isLastSection) {
          sessionStorage.removeItem("analyticNavigatedFromSubmission");
          navigate(`/analytic-form/${formId}`, { replace: true });
        } else {
          // Go straight to the next section
          const nextSectionName = getNextSectionName(index);
          const nextIndex = parseInt(index) + 1;

          if (nextSectionName && nextSectionName !== "All Done") {
            sessionStorage.setItem("analyticNavigatedFromSubmission", "true");
            console.log(`Navigating to next section: /analytic-form/${formId}/${nextIndex}/${nextSectionName}`);
            navigate(`/analytic-form/${formId}/${nextIndex}/${nextSectionName}`, { replace: true });
          } else if (formConfig?.sections && nextIndex < formConfig.sections.length) {
            // Fallback: use formConfig.sections if jsonData isn't populated
            const fallbackSectionName = formConfig.sections[nextIndex];
            sessionStorage.setItem("analyticNavigatedFromSubmission", "true");
            console.log(`Navigating to next section (fallback): /analytic-form/${formId}/${nextIndex}/${fallbackSectionName}`);
            navigate(`/analytic-form/${formId}/${nextIndex}/${fallbackSectionName}`, { replace: true });
          } else {
            navigate(`/analytic-form/${formId}`, { replace: true });
          }
        }
      } catch (error) {
        console.error("Error during section submission:", error);
        setLoaded(true);
        if (isLastSection) {
          navigate(`/analytic-form/${formId}`, { replace: true });
        }
      }
    }
  };

  const getNextSectionName = (currentIndex) => {
    const nextIndex = parseInt(currentIndex) + 1;
    if (nextIndex < jsonData.length) {
      return Object.keys(jsonData[nextIndex])[0];
    }
    return null;
  };

  return (
    <>
      {!isLoaded && <LoadingScreen />}
      <ConfirmationModal modalopen={modal} fun={finalSubmit} />
      <BadgeEarnedModal
        isOpen={showBadgeModal}
        onClose={() => {
          setShowBadgeModal(false);

          const sectionRewardsKey = `analytic_section_rewards_${formId}_${Cookies.get("analytic_clevo_code")}_${id}`;
          const rewardsData = {
            coins: sectionCoins,
            answeredQs: Array.from(answeredQuestions),
            completed: true,
          };
          localStorage.setItem(sectionRewardsKey, JSON.stringify(rewardsData));
          console.log("Section completed, final rewards saved:", rewardsData);
        }}
        sectionName={badgeModalData.sectionName}
        sectionCoins={badgeModalData.coins}
        sectionStreaks={badgeModalData.streaks}
      />
      <RewardsRulesModal isOpen={showRulesModal} onClose={() => setShowRulesModal(false)} />
      <AnalyticFormNavbar
        fixed={true}
        navbarVisible={navbarVisible}
        onRulesClick={() => setShowRulesModal(true)}
        showStreakWarning={showStreakWarning}
        warningCountdown={warningCountdown}
        formId={formId}
        formName={formConfig?.name || "Analytics Form"}
        sectionsCount={formConfig?.sections?.length || 13}
      />

      <div className="pt-[7rem] tab:pt-[6rem] mac:pt-[4rem] w-[90%] tab:w-[94%] mac:w-[94%] mx-auto">
        <div className="flex justify-between items-center">
          <div className="text-[1.5rem] leading-[2.25rem] tab:text-[2rem] tab:leading-[3.5rem] mac:text-[1.7rem] arca text-[#2C2C2C] font-extrabold mt-12">
            {id.charAt(0) + id.slice(1).toLowerCase()}
          </div>
        </div>
        <div className="h-[0.8rem] bg-white border-[2px] mt-4 rounded-md">
          <div
            className="h-full bg-[#08B7F6] rounded-l-md rounded-r-md"
            style={{
              width: `${currentQuestions.length > 0 ? (questionDone / currentQuestions.length) * 100 : 0}%`,
            }}
          ></div>
        </div>
      </div>
      <div className="pb-40">
        <div className="w-[90%] tab:w-[94%] mx-auto min-h-[400px]">
          {isDataLoaded ? (
            <form onSubmit={finalSubmit}>
              {currentQuestions.map((question) => {
                const questionInitialData = isFreshSectionStart
                  ? ["", ""]
                  : data[question["index"]] || ["", ""];

                return (
                  <SingleQuestion
                    key={isFreshSectionStart ? `fresh_${id}_${question["index"]}` : question["index"]}
                    question={question}
                    index={question["index"]}
                    fun={updateData}
                    spclq={spclq}
                    mainq={mainqUpdater}
                    subQ={subQupdater}
                    initialData={questionInitialData}
                  />
                );
              })}
            </form>
          ) : (
            <div className="flex justify-center items-center min-h-[200px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#080594]"></div>
            </div>
          )}
        </div>
      </div>
      <div className="z-20 fixed bottom-0 bg-white w-full py-4">
        <div className="w-[90%] tab:w-[94%] mx-auto flex justify-between">
          <div>
            <BackButton
              className="text-[15px] px-8 rounded-full py-4 opensans-bold border-[3px] hover:bg-[#080594] hover:text-white border-[#080594] uppercase text-[#080594] transition-all"
              fallbackPath={`/analytic-form/${formId}`}
            >
              Go Back
            </BackButton>
          </div>
          {subQDone && questionDone === currentQuestions.length ? (
            <button
              onClick={() => setModal(true)}
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
      </div>
    </>
  );
}
