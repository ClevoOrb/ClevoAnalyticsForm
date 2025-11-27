/**
 * AnalyticSuccessModal.jsx
 *
 * Success modal displayed when the user completes all sections of the analytics form.
 * Shows total coins earned and sections completed.
 * Now fetches rewards from Supabase with localStorage fallback.
 */

import Lottie from "lottie-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import TY from "../../assets/thankyou.json";
import useAnalyticResponses from "../../../hooks/useAnalyticResponses";

// Use URL references instead of imports to avoid bundling large SVG files
const Points = "/assets/point.svg";
const Badge = "/assets/sectionBadge.svg";

function AnalyticSuccessModal({ modalOpen, fun, formId, maxSections = 13 }) {
  const navigate = useNavigate();
  const BG = "https://d2zcrs37ownl9k.cloudfront.net/asset/Headerbackground.webp";

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
          console.log("Loaded rewards from Supabase:", supabaseRewards);
        } else if (supabaseResponse && supabaseResponse.sections) {
          // Calculate completed sections from response
          const completedCount = Object.values(supabaseResponse.sections).filter(
            (s) => s.is_submitted
          ).length;
          setTotalSections(Math.min(completedCount, maxSections));
          setTotalCoins(supabaseResponse.rewards?.coins || 0);
          console.log("Calculated from Supabase response:", completedCount, "sections");
        } else {
          // Fallback to localStorage
          const globalRewardsKey = `analytic_rewards_${formId}_${cookieClevoCode}`;
          const globalRewards = localStorage.getItem(globalRewardsKey);
          if (globalRewards) {
            const { coins = 0, badges = 0 } = JSON.parse(globalRewards);
            setTotalCoins(coins);
            setTotalSections(Math.min(badges, maxSections));
            console.log("Loaded rewards from localStorage:", { coins, badges });
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

  const handleContinue = () => {
    fun("no"); // Close modal first
    navigate("www.clevohealth.com"); // Navigate to home page
  };

  const handleFillAnotherForm = () => {
    // Clear analytic cookies to logout
    Cookies.remove("analytic_clevo_id");
    Cookies.remove("analytic_clevo_code");
    Cookies.remove("analytic_form_id");

    // Close modal and navigate to the same form's login page
    fun("no");
    navigate(`/analytic-form-login/${formId}`, { replace: true });
  };

  return (
    <>
      {modalOpen && (
        <div className="fixed left-0 top-0 w-full h-full bg-black bg-opacity-50 z-[1000] backdrop-blur flex justify-center items-center p-4">
          <div
            className="relative w-full max-w-3xl h-auto rounded-3xl"
            style={{
              backgroundImage: `url(${BG})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {/* Main Content */}
            <div className="flex flex-col justify-center items-center text-center px-6 py-8">
              <div className="tab:w-[40%] w-[50%] mx-auto">
                <Lottie animationData={TY} loop={true} className="" />
              </div>

              <div className="text-center arca text-white mac:text-[2.5rem] text-[1.75rem] mt-2">
                Thank you for your response!
              </div>

              <div className="text-center roboto text-gray-200 mac:text-[1.25rem] text-base mt-2 mx-6">
                Your form has been submitted successfully. You will be notified once your report is prepared.
              </div>

              {/* Final Summary Section */}
              {totalCoins > 0 && (
                <div className="mt-6 p-5 bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl border border-white border-opacity-20 max-w-md">
                  <div className="text-center arca text-white text-lg mb-3">Achievements</div>

                  <div className="flex justify-between items-center gap-6">
                    {/* Total Coins */}
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-2 mb-2">
                        <img src={Points} alt="Coins" className="w-8 h-8" />
                        <span className="text-2xl font-bold text-white">{totalCoins}</span>
                      </div>
                    </div>

                    {/* Sections Completed */}
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-2 mb-2 relative">
                        <div className="relative">
                          <img
                            src={Badge}
                            alt="Sections"
                            className="w-8 h-8 transform hover:scale-110 transition-all duration-500"
                          />
                        </div>
                        <span className="text-2xl font-bold text-white">
                          {totalSections}/{totalSectionsAvailable}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Buttons Section */}
              <div className="w-full flex flex-col mac:flex-row justify-center items-center mt-6 mb-2 gap-3">
                <button
                  onClick={handleContinue}
                  className="px-8 text-[15px] py-3 bg-[#08B7F6] hover:bg-[#069de8] rounded-full text-white roboto font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg w-full max-w-xs"
                >
                  Continue to Home
                </button>
                <button
                  onClick={handleFillAnotherForm}
                  className="px-8 text-[15px] py-3 bg-transparent hover:bg-white hover:bg-opacity-10 border-2 border-white rounded-full text-white roboto font-semibold transition-all duration-300 w-full max-w-xs"
                >
                  Submit Another Response
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AnalyticSuccessModal;
