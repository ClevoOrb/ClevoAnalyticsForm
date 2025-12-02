/**
 * AnalyticFormNavbar.jsx
 *
 * Navigation bar component for the Analytics Form.
 * Displays coins, streaks, badges/progress, and a help button.
 * Works with analytic-specific localStorage keys that include formId.
 */

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";

// Use URL references instead of imports to avoid bundling large SVG files
const Points = "/assets/point.svg";
const Streaks = "/assets/streak.svg";
const Badge = "/assets/sectionBadge.svg";

// CRITICAL: Must match STREAK_TIME_LIMIT in AnalyticFeedbackFormPost.jsx
const STREAK_TIME_LIMIT = 3 * 60 * 1000; // Exactly 3 minutes = 180,000 milliseconds

const AnalyticFormNavbar = ({
  className = "",
  fixed = false,
  navbarVisible = true,
  showRewardsIcons = true,
  onRulesClick,
  showStreakWarning = false,
  warningCountdown = 10,
  formId,
  formName = "Analytics Form",
  sectionsCount = 13, // Number of sections in the form (passed from parent)
  logoPC = null, // Custom logo for PC/Desktop (base64 string or URL)
  logoMobile = null, // Custom logo for Mobile (base64 string or URL)
}) => {
  const navigate = useNavigate();

  // Initialize state with values from localStorage immediately
  const [totalCoins, setTotalCoins] = useState(() => {
    const clevoCode = Cookies.get("analytic_clevo_code");
    if (clevoCode && formId) {
      const globalRewardsKey = `analytic_rewards_${formId}_${clevoCode}`;
      const existingGlobalRewards = localStorage.getItem(globalRewardsKey);
      if (existingGlobalRewards) {
        try {
          const { coins } = JSON.parse(existingGlobalRewards);
          return coins || 0;
        } catch (e) {
          console.error("Error parsing initial coins:", e);
        }
      }
    }
    return 0;
  });

  const [displayCoins, setDisplayCoins] = useState(totalCoins);
  const [isCountingUp, setIsCountingUp] = useState(false);

  const [totalStreaks, setTotalStreaks] = useState(() => {
    const clevoCode = Cookies.get("analytic_clevo_code");
    if (clevoCode && formId) {
      const globalRewardsKey = `analytic_rewards_${formId}_${clevoCode}`;
      const existingGlobalRewards = localStorage.getItem(globalRewardsKey);
      if (existingGlobalRewards) {
        try {
          const { streaks } = JSON.parse(existingGlobalRewards);
          return streaks || 0;
        } catch (e) {
          console.error("Error parsing initial streaks:", e);
        }
      }
    }
    return 0;
  });

  const [totalBadges, setTotalBadges] = useState(() => {
    const clevoCode = Cookies.get("analytic_clevo_code");
    if (clevoCode && formId) {
      const globalRewardsKey = `analytic_rewards_${formId}_${clevoCode}`;
      const existingGlobalRewards = localStorage.getItem(globalRewardsKey);
      if (existingGlobalRewards) {
        try {
          const { badges } = JSON.parse(existingGlobalRewards);
          return badges || 0;
        } catch (e) {
          console.error("Error parsing initial badges:", e);
        }
      }
    }
    return 0;
  });

  // Use sectionsCount prop directly instead of loading from localStorage
  const maxSections = sectionsCount;
  const [localCoinFlipping, setLocalCoinFlipping] = useState(false);
  const [streakCelebrating, setStreakCelebrating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Default logos
  const defaultLogoPC = "/assets/Logo1.svg";
  const defaultLogoMobile = "/assets/LogoMobile.svg";

  // Navigate to form home page
  const handleLogoClick = () => {
    navigate(`/analytic-form/${formId}`);
  };

  // Load overall rewards from localStorage
  const loadOverallRewards = useCallback(() => {
    const clevoCode = Cookies.get("analytic_clevo_code");
    if (clevoCode && formId) {
      const globalRewardsKey = `analytic_rewards_${formId}_${clevoCode}`;
      const existingGlobalRewards = localStorage.getItem(globalRewardsKey);

      if (existingGlobalRewards) {
        try {
          const { coins = 0, badges = 0, streaks = 0, lastUpdated } = JSON.parse(existingGlobalRewards);

          let currentActiveStreak = streaks;
          if (lastUpdated && streaks > 0) {
            const timeSinceLastUpdate = Date.now() - lastUpdated;
            if (timeSinceLastUpdate > STREAK_TIME_LIMIT) {
              currentActiveStreak = 0;

              localStorage.setItem(
                globalRewardsKey,
                JSON.stringify({
                  coins,
                  badges,
                  streaks: 0,
                  lastUpdated: Date.now(),
                })
              );
            }
          }

          setTotalCoins(coins);
          setTotalStreaks(currentActiveStreak);
          setTotalBadges(badges);

          if (displayCoins === 0 && coins > 0) {
            setDisplayCoins(coins);
          }
        } catch (e) {
          console.error("Error parsing global rewards:", e);
          setTotalCoins(0);
          setTotalStreaks(0);
          setTotalBadges(0);
        }
      } else {
        setTotalCoins(0);
        setTotalStreaks(0);
        setTotalBadges(0);
      }
    }
  }, [formId, displayCoins]);

  const triggerCoinFlip = useCallback(() => {
    setLocalCoinFlipping(true);
    setTimeout(() => {
      setLocalCoinFlipping(false);
    }, 1000);
  }, []);

  const triggerStreakCelebration = useCallback(() => {
    setStreakCelebrating(true);
    setTimeout(() => {
      setStreakCelebrating(false);
    }, 2000);
  }, []);

  // Smooth coin counting animation
  useEffect(() => {
    if (displayCoins !== totalCoins) {
      setIsCountingUp(true);
      const difference = totalCoins - displayCoins;
      const duration = Math.min(1000, Math.abs(difference) * 10);
      const steps = Math.min(20, Math.abs(difference));
      const increment = difference / steps;
      let currentStep = 0;

      const timer = setInterval(() => {
        currentStep++;
        if (currentStep >= steps) {
          setDisplayCoins(totalCoins);
          setIsCountingUp(false);
          clearInterval(timer);
        } else {
          setDisplayCoins((prev) => Math.round(prev + increment));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [totalCoins, displayCoins]);

  // Load rewards immediately on mount and when refreshKey changes
  useEffect(() => {
    loadOverallRewards();
  }, [loadOverallRewards, refreshKey]);

  // Load rewards immediately when component mounts
  useEffect(() => {
    const clevoCode = Cookies.get("analytic_clevo_code");
    if (clevoCode && formId) {
      loadOverallRewards();
    }
  }, [formId]);

  // Listen for updates and refresh periodically
  useEffect(() => {
    const handleCoinsUpdate = () => {
      triggerCoinFlip();
      setTimeout(() => {
        loadOverallRewards();
      }, 1000);
    };

    const handleStreakMilestone = () => {
      triggerStreakCelebration();
      loadOverallRewards();
    };

    const handleFocus = () => {
      setRefreshKey((prev) => prev + 1);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setRefreshKey((prev) => prev + 1);
      }
    };

    window.addEventListener("analyticCoinsUpdated", handleCoinsUpdate);
    window.addEventListener("analyticStreakMilestone", handleStreakMilestone);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const interval = setInterval(() => {
      setRefreshKey((prev) => prev + 1);
    }, 30000);

    return () => {
      window.removeEventListener("analyticCoinsUpdated", handleCoinsUpdate);
      window.removeEventListener("analyticStreakMilestone", handleStreakMilestone);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(interval);
    };
  }, [loadOverallRewards, triggerCoinFlip, triggerStreakCelebration]);

  const shouldFlip = localCoinFlipping;
  const cappedBadges = Math.min(totalBadges, maxSections);
  const badgesToShow = `${cappedBadges}/${maxSections}`;

  const baseClasses = `w-full tab:h-[8.5rem] mac:h-[4rem] flex items-center ${className}`;
  const navbarClasses = fixed
    ? `${baseClasses} fixed top-0 left-0 z-40 transition-transform duration-300 ${navbarVisible ? "translate-y-0" : "-translate-y-full"
    }`
    : `${baseClasses} z-10`;

  return (
    <>
      <div className={`${navbarClasses} bg-[var(--color-dark)]`}>
        <div className="w-[90%] tab:w-[94%] mac:w-[95%] mx-auto h-full">
          {/* Desktop Layout (tab and above) - Logo and Title Only */}
          <div className="hidden mac:flex items-center h-full">
            <div className="flex items-center justify-center gap-4 w-full relative">
              <button
                onClick={handleLogoClick}
                className="w-fit hover:opacity-80 transition-opacity duration-200 absolute left-0 h-full flex items-center justify-end gap-x-4"
                title="Go to Form Home"
              >
                {/* Default Logo - PC */}
                <img
                  src={defaultLogoPC}
                  className="h-[2.5rem] w-auto max-w-[150px] object-contain"
                  alt="Default Logo"
                />
                {/* Show X icon and Custom PC Logo if provided */}
                {logoPC && (
                  <div className="flex items-center gap-x-3">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    <img
                      src={logoPC}
                      className="h-[2.5rem] w-auto max-w-[150px] object-contain"
                      alt="Custom Logo"
                    />
                  </div>
                )}
              </button>
              <div className="text-[1rem] leading-[1.5rem] tab:text-[1.3rem] tab:leading-[2.1rem] mac:text-[1.2rem] mac:leading-[1.7rem] md:leading-[1.7rem] md:text-[1.1rem] xxl:text-[1.3rem] text-white arca">
                {formName.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Mobile Layout (below mac breakpoint) */}
          <div className="flex flex-col mac:hidden h-full justify-center py-4 tab:py-6">
            <div className="flex items-center w-full mb-3 relative">
              <button
                onClick={handleLogoClick}
                className="w-fit hover:opacity-80 transition-opacity duration-200 flex items-center gap-2"
                title="Go to Form Home"
              >
                {/* Default Logo - Mobile */}
                <img
                  src={defaultLogoMobile}
                  className="h-8 tab:h-10 w-auto max-w-[100px] tab:max-w-[120px] object-contain"
                  alt="Default Logo"
                />
                {/* Show X icon and Custom Mobile Logo if provided */}
                {logoMobile && (
                  <div className="flex items-center gap-x-2">
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    <img
                      src={logoMobile}
                      className="h-10 tab:h-12 w-auto max-w-[100px] tab:max-w-[120px] object-contain"
                      alt="Custom Logo"
                    />
                  </div>
                )}
              </button>
              <div className="absolute left-1/2 transform -translate-x-1/2 text-[0.9rem] leading-[1.2rem] text-white arca tab:text-[1.1rem] tab:leading-[1.5rem]">
                {formName.toUpperCase()}
              </div>
            </div>

            {/* Mobile Reward Icons - Evenly Spaced */}
            {showRewardsIcons && (
              <div className="flex justify-between items-center pt-4 tab:pt-2 pr-4 w-full mx-auto">
                {/* Coins */}
                <div className="flex items-center gap-2">
                  <motion.img
                    src={Points}
                    alt="Coin Icon"
                    className="w-6 h-6"
                    animate={{
                      rotateY: shouldFlip ? 360 : 0,
                      scale: shouldFlip ? [1, 1.2, 1] : 1,
                    }}
                    transition={{
                      duration: shouldFlip ? 1 : 0.3,
                      ease: "easeInOut",
                    }}
                  />
                  <motion.p
                    className="text-sm font-bold text-white"
                    animate={{
                      scale: isCountingUp ? [1, 1.1, 1] : 1,
                      color: isCountingUp ? ["#ffffff", "#00ff88", "#ffffff"] : "#ffffff",
                    }}
                    transition={{
                      duration: 0.3,
                      ease: "easeInOut",
                    }}
                  >
                    {displayCoins}
                  </motion.p>
                </div>

                {/* Streaks */}
                <div className="flex items-center gap-2">
                  <motion.img
                    src={Streaks}
                    alt="Streak Icon"
                    className="w-6 h-6"
                    animate={{
                      rotate: streakCelebrating ? [0, -10, 10, -10, 10, 0] : 0,
                      scale: streakCelebrating ? [1, 1.3, 1] : 1,
                    }}
                    transition={{
                      duration: streakCelebrating ? 0.6 : 0.3,
                      ease: "easeInOut",
                    }}
                  />
                  <motion.p
                    className="text-sm font-bold text-white"
                    animate={{
                      scale: streakCelebrating ? [1, 1.2, 1] : 1,
                      color: streakCelebrating ? ["#ffffff", "#ffd700", "#ffffff"] : "#ffffff",
                    }}
                    transition={{
                      duration: streakCelebrating ? 0.6 : 0.3,
                      ease: "easeInOut",
                    }}
                  >
                    {totalStreaks}
                  </motion.p>
                </div>

                {/* Progress */}
                <div className="flex items-center gap-2">
                  <img src={Badge} alt="Badge Icon" className="w-6 h-6" />
                  <p className="text-sm font-bold text-white">{badgesToShow}</p>
                </div>

                {/* Help Button */}
                {onRulesClick && (
                  <button
                    onClick={onRulesClick}
                    className="bg-white w-6 h-6 rounded-full flex items-center justify-center hover:opacity-80 transition-colors font-bold text-sm text-[var(--color-dark)]"
                    title="Rewards Rules"
                  >
                    ?
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Floating Rewards Icons Only */}
      {showRewardsIcons && (
        <div className="fixed md:right-14 mac:right-12 top-[0.7rem] z-50 transition-all duration-300 hidden mac:block">
          <div className="flex gap-3 items-center">
            {/* Coins */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-3 py-2 rounded-xl shadow-lg flex items-center gap-2 relative border border-blue-300">
              <motion.img
                src={Points}
                alt="Coin Icon"
                className="w-6 h-6 drop-shadow-sm"
                animate={{
                  rotateY: shouldFlip ? 360 : 0,
                  scale: shouldFlip ? [1, 1.2, 1] : 1,
                }}
                transition={{
                  duration: shouldFlip ? 1 : 0.3,
                  ease: "easeInOut",
                }}
              />
              <motion.p
                className="text-sm font-bold text-white drop-shadow-sm"
                animate={{
                  scale: isCountingUp ? [1, 1.1, 1] : 1,
                  color: isCountingUp ? ["#ffffff", "#00ff88", "#ffffff"] : "#ffffff",
                }}
                transition={{
                  duration: 0.3,
                  ease: "easeInOut",
                }}
              >
                {displayCoins}
              </motion.p>
            </div>

            {/* Streaks counter */}
            <motion.div
              className={`px-3 py-2 rounded-xl shadow-lg flex items-center gap-2 border ${totalStreaks > 0
                ? "bg-gradient-to-r from-emerald-500 to-teal-600 border-emerald-300"
                : "bg-gradient-to-r from-slate-400 to-slate-500 border-slate-300"
                }`}
              animate={{
                scale: streakCelebrating ? [1, 1.3, 1.1, 1] : 1,
                rotate: streakCelebrating ? [0, 5, -5, 0] : 0,
              }}
              transition={{
                duration: streakCelebrating ? 1.2 : 0.3,
                ease: "easeInOut",
              }}
            >
              <motion.img
                src={Streaks}
                alt="Streak Icon"
                className="w-6 h-6 drop-shadow-sm"
                animate={{
                  rotate: streakCelebrating ? [0, -25, 25, -20, 20, -15, 15, 0] : 0,
                  scale: streakCelebrating ? [1, 1.5, 1.2, 1] : 1,
                }}
                transition={{
                  duration: streakCelebrating ? 1.2 : 0.3,
                  ease: "easeInOut",
                }}
              />
              <motion.p
                className="text-sm font-bold text-white drop-shadow-sm"
                animate={{
                  scale: streakCelebrating ? [1, 1.6, 1.3, 1] : 1,
                  color: streakCelebrating
                    ? ["#ffffff", "#ffd700", "#ff6b35", "#ffd700", "#ffffff"]
                    : "#ffffff",
                }}
                transition={{
                  duration: streakCelebrating ? 1.2 : 0.3,
                  ease: "easeInOut",
                }}
              >
                {totalStreaks}
              </motion.p>
            </motion.div>

            {/* Badges/Progress */}
            <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-3 py-2 rounded-xl shadow-lg flex items-center gap-2 border border-violet-300">
              <img src={Badge} alt="Badge Icon" className="w-6 h-6 drop-shadow-sm" />
              <p className="text-sm font-bold text-white drop-shadow-sm">{badgesToShow}</p>
            </div>

            {/* Help Button */}
            {onRulesClick && (
              <button
                onClick={onRulesClick}
                className="bg-white w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80 transition-colors font-bold text-lg border-2 text-[var(--color-dark)] border-[var(--color-dark)]"
                title="Rewards Rules"
              >
                ?
              </button>
            )}
          </div>
        </div>
      )}

      {/* Countdown Timer Popup */}
      {showStreakWarning && (
        <div className="fixed top-[8rem] tab:top-[7rem] mac:top-[6rem] right-4 transform tab:-translate-x-1/2 z-[9999] w-[70%] maclg:w-[23.5%] md:w-[25%] mac:w-[30%] mac11:w-[35%] xxl:w-[20%] tab:w-[50%] animate-bounce">
          <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-3 sm:p-2 rounded-xl shadow-2xl border-4 border-red-300">
            <div className="flex flex-row items-center gap-3 sm:gap-4">
              {/* Warning Icon */}
              <div className="flex-shrink-0">
                <svg
                  className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.864-.833-2.634 0L4.182 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>

              {/* Warning Text */}
              <div className="flex-1 text-center sm:text-left">
                <div className="text-yellow-300 text-xs sm:text-sm font-bold uppercase tracking-wide mb-1">
                  STREAK ENDING!
                </div>
                <div className="text-sm sm:text-lg font-bold leading-tight">
                  Answer quickly or lose your streak!
                </div>
                <div className="text-xs sm:text-sm opacity-90 mt-1">
                  Time remaining:{" "}
                  <span className="font-bold text-yellow-300">{warningCountdown} seconds</span>
                </div>
              </div>

              {/* Countdown Circle */}
              <div className="flex-shrink-0 relative">
                <div className="absolute inset-0 bg-yellow-300 opacity-30 rounded-full animate-ping"></div>
                <div className="relative text-2xl sm:text-3xl font-black bg-yellow-300 text-red-700 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-lg animate-bounce border-2 border-white">
                  {warningCountdown}
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-3 h-2 sm:h-3 bg-red-300 rounded-full overflow-hidden shadow-inner border border-red-400">
              <div
                className="h-full bg-gradient-to-r from-yellow-400 via-red-500 to-red-600 transition-all duration-1000 ease-linear"
                style={{ width: `${(warningCountdown / 10) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AnalyticFormNavbar;
