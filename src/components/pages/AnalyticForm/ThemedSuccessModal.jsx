/**
 * ThemedSuccessModal.jsx
 *
 * Success modal for forms with custom color palettes.
 * Shows completion with theme colors, coins earned, and sections completed.
 * Uses solid colors (dark and accent) for a unique, clean design.
 */

import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import useAnalyticResponses from "../../../hooks/useAnalyticResponses";
import { getThemeById } from "../../common/ThemeSelector";

// Use URL references instead of imports to avoid bundling large SVG files
const Points = "/assets/point.svg";
const Badge = "/assets/sectionBadge.svg";

function ThemedSuccessModal({
  modalOpen,
  fun,
  formId,
  maxSections = 13,
  themeId = "default",
  customColors = null // { dark: "#hex", accent: "#hex" } for custom themes
}) {
  const navigate = useNavigate();
  const [buttonHover, setButtonHover] = useState(false);

  // Get theme colors - use custom colors if provided for custom theme
  const theme = getThemeById(themeId, customColors);
  const darkColor = themeId === "custom" && customColors ? customColors.dark : theme.dark;
  const accentColor = themeId === "custom" && customColors ? customColors.accent : theme.accent;

  const [totalCoins, setTotalCoins] = useState(0);
  const [totalSections, setTotalSections] = useState(0);

  // Use maxSections prop directly, with fallback
  const totalSectionsAvailable = maxSections || 1;

  const clevoCode = Cookies.get("analytic_clevo_code") || "";
  const { getRewards, getResponse } = useAnalyticResponses(formId, clevoCode);

  useEffect(() => {
    const loadRewards = async () => {
      if (!modalOpen || !formId) return;

      const cookieClevoCode = Cookies.get("analytic_clevo_code");
      if (!cookieClevoCode) return;

      try {
        // Try to get rewards from Supabase first
        const supabaseRewards = await getRewards();
        const supabaseResponse = await getResponse();

        if (supabaseRewards && supabaseRewards.coins > 0) {
          setTotalCoins(supabaseRewards.coins);
          setTotalSections(Math.min(supabaseRewards.badges || 0, maxSections));
        } else if (supabaseResponse && supabaseResponse.sections) {
          // Calculate completed sections from response
          const completedCount = Object.values(supabaseResponse.sections).filter(
            (s) => s.is_submitted
          ).length;
          setTotalSections(Math.min(completedCount, maxSections));
          setTotalCoins(supabaseResponse.rewards?.coins || 0);
        } else {
          // Fallback to localStorage
          const globalRewardsKey = `analytic_rewards_${formId}_${cookieClevoCode}`;
          const globalRewards = localStorage.getItem(globalRewardsKey);
          if (globalRewards) {
            const { coins = 0, badges = 0 } = JSON.parse(globalRewards);
            setTotalCoins(coins);
            setTotalSections(Math.min(badges, maxSections));
          }
        }
      } catch (e) {
        console.error("Error loading rewards:", e);
        // Fallback to localStorage on error
        const globalRewardsKey = `analytic_rewards_${formId}_${Cookies.get("analytic_clevo_code")}`;
        const globalRewards = localStorage.getItem(globalRewardsKey);
        if (globalRewards) {
          try {
            const { coins = 0, badges = 0 } = JSON.parse(globalRewards);
            setTotalCoins(coins);
            setTotalSections(Math.min(badges, maxSections));
          } catch (parseError) {
            setTotalCoins(0);
            setTotalSections(0);
          }
        }
      }
    };

    loadRewards();
  }, [modalOpen, formId, maxSections, getRewards, getResponse]);

  const handleSeeReport = () => {
    fun("no");
    navigate(`/report/${formId}`, { replace: true });
  };

  const handleFillAnotherForm = () => {
    Cookies.remove("analytic_clevo_id");
    Cookies.remove("analytic_clevo_code");
    Cookies.remove("analytic_form_id");
    fun("no");
    navigate(`/login/${formId}`, { replace: true });
  };

  return (
    <>
      {modalOpen && (
        <div className="fixed left-0 top-0 w-full h-full bg-black/60 z-[1000] backdrop-blur-sm flex justify-center items-center p-4">
          <div
            className="relative w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl"
            style={{ backgroundColor: darkColor }}
          >
            {/* Accent stripe at top */}
            <div
              className="h-2 w-full"
              style={{ backgroundColor: accentColor }}
            />

            {/* Decorative corner accent */}
            <div
              className="absolute top-0 right-0 w-32 h-32"
              style={{
                backgroundColor: accentColor,
                clipPath: 'polygon(100% 0, 0 0, 100% 100%)',
                opacity: 0.15
              }}
            />

            {/* Main Content */}
            <div className="relative flex flex-col justify-center items-center text-center px-8 py-10">

              {/* Success checkmark icon */}
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mb-6 border-4"
                style={{
                  backgroundColor: 'transparent',
                  borderColor: accentColor
                }}
              >
                <svg
                  className="w-10 h-10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={accentColor}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>

              <div className="text-center arca text-white mac:text-[2.25rem] text-[1.5rem]">
                Thank you for your response!
              </div>

              <div
                className="w-16 h-1 rounded-full my-4"
                style={{ backgroundColor: accentColor }}
              />

              <div className="text-center roboto text-white/80 mac:text-[1.1rem] text-sm max-w-md">
                Your form has been submitted successfully. You will be notified once your report is prepared.
              </div>

              {/* Achievements Section */}
              {totalCoins > 0 && (
                <div
                  className="mt-8 p-6 rounded-2xl w-full max-w-sm border-2"
                  style={{
                    backgroundColor: `${accentColor}15`,
                    borderColor: `${accentColor}40`
                  }}
                >
                  <div
                    className="text-center arca text-sm uppercase tracking-widest mb-5"
                    style={{ color: accentColor }}
                  >
                    Achievements
                  </div>

                  <div className="flex justify-center items-center gap-10">
                    {/* Total Coins */}
                    <div className="flex flex-col items-center">
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center mb-3 shadow-lg"
                        style={{ backgroundColor: accentColor }}
                      >
                        <img src={Points} alt="Coins" className="w-7 h-7" />
                      </div>
                      <span className="text-2xl font-bold text-white">{totalCoins}</span>
                      <span className="text-xs text-white/60 uppercase tracking-wide">Points</span>
                    </div>

                    {/* Divider */}
                    <div
                      className="w-px h-20"
                      style={{ backgroundColor: `${accentColor}40` }}
                    />

                    {/* Sections Completed */}
                    <div className="flex flex-col items-center">
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center mb-3 shadow-lg"
                        style={{ backgroundColor: accentColor }}
                      >
                        <img src={Badge} alt="Sections" className="w-7 h-7" />
                      </div>
                      <span className="text-2xl font-bold text-white">
                        {totalSections}/{totalSectionsAvailable}
                      </span>
                      <span className="text-xs text-white/60 uppercase tracking-wide">Sections</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Buttons Section */}
              <div className="w-full flex flex-col mac:flex-row justify-center items-center mt-8 gap-3">
                <button
                  onClick={handleSeeReport}
                  onMouseEnter={() => setButtonHover(true)}
                  onMouseLeave={() => setButtonHover(false)}
                  className="px-8 text-[15px] py-3 rounded-full roboto font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg w-full max-w-xs"
                  style={{
                    backgroundColor: buttonHover ? darkColor : accentColor,
                    color: buttonHover ? accentColor : darkColor,
                    border: `2px solid ${accentColor}`
                  }}
                >
                  See Report
                </button>
                <button
                  onClick={handleFillAnotherForm}
                  className="px-8 text-[15px] py-3 bg-transparent hover:bg-white/10 border-2 border-white/50 hover:border-white rounded-full text-white roboto font-semibold transition-all duration-300 w-full max-w-xs"
                >
                  Submit Another Response
                </button>
              </div>
            </div>

            {/* Bottom accent bar */}
            <div
              className="h-1 w-full"
              style={{ backgroundColor: accentColor }}
            />
          </div>
        </div>
      )}
    </>
  );
}

export default ThemedSuccessModal;
