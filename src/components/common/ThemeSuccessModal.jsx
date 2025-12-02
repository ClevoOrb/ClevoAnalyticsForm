/**
 * ThemeSuccessModal.jsx
 *
 * A success modal that appears when a custom theme is selected.
 * Shows the selected theme colors with a celebration animation.
 */

import { useEffect } from "react";
import { getThemeById } from "./ThemeSelector";

export default function ThemeSuccessModal({
  isOpen,
  onClose,
  themeId = "default",
  themeName = "Default",
  customColors = null // { dark: "#hex", accent: "#hex" } for custom themes
}) {
  // Get theme colors - use custom colors if provided for custom theme
  const theme = getThemeById(themeId, customColors);
  const darkColor = themeId === "custom" && customColors ? customColors.dark : theme.dark;
  const accentColor = themeId === "custom" && customColors ? customColors.accent : theme.accent;

  // Auto close after 3 seconds
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-8 max-w-sm w-[90%] mx-4 shadow-2xl transform animate-bounce-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Success Icon with Theme Colors */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          {/* Animated rings */}
          <div
            className="absolute inset-0 rounded-full animate-ping opacity-20"
            style={{ backgroundColor: accentColor }}
          />
          <div
            className="absolute inset-2 rounded-full animate-pulse opacity-30"
            style={{ backgroundColor: darkColor }}
          />
          {/* Main circle with gradient */}
          <div
            className="absolute inset-0 rounded-full flex items-center justify-center shadow-lg"
            style={{ background: `linear-gradient(135deg, ${accentColor}, ${darkColor})` }}
          >
            <svg
              className="w-12 h-12 text-white animate-scale-in"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        {/* Success Message */}
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-2 arca">
          Theme Applied!
        </h2>
        <p className="text-gray-500 text-center mb-6">
          Your form will now use the <span className="font-semibold" style={{ color: darkColor }}>{themeName}</span> theme
        </p>

        {/* Theme Preview */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <p className="text-xs text-gray-400 uppercase font-semibold mb-3 text-center">
            Color Preview
          </p>
          <div className="flex justify-center gap-4">
            {/* Dark Color */}
            <div className="flex flex-col items-center">
              <div
                className="w-14 h-14 rounded-xl shadow-md"
                style={{ backgroundColor: darkColor }}
              />
              <span className="text-xs text-gray-500 mt-2">Primary</span>
            </div>
            {/* Accent Color */}
            <div className="flex flex-col items-center">
              <div
                className="w-14 h-14 rounded-xl shadow-md"
                style={{ backgroundColor: accentColor }}
              />
              <span className="text-xs text-gray-500 mt-2">Accent</span>
            </div>
          </div>
        </div>

        {/* Sample Button Preview */}
        <div className="flex gap-3 mb-6">
          <button
            className="flex-1 py-2 px-4 rounded-full text-white text-sm font-semibold shadow-md"
            style={{ backgroundColor: darkColor }}
          >
            Primary
          </button>
          <button
            className="flex-1 py-2 px-4 rounded-full text-sm font-semibold border-2"
            style={{ borderColor: darkColor, color: darkColor }}
          >
            Outline
          </button>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-full font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg"
          style={{ background: `linear-gradient(135deg, ${accentColor}, ${darkColor})` }}
        >
          Got it!
        </button>

        {/* Auto-close indicator */}
        <div className="mt-4 flex justify-center">
          <div className="h-1 w-24 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full animate-shrink"
              style={{ backgroundColor: accentColor }}
            />
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes bounce-in {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          50% {
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes scale-in {
          0% {
            transform: scale(0);
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
          }
        }

        @keyframes shrink {
          0% {
            width: 100%;
          }
          100% {
            width: 0%;
          }
        }

        .animate-bounce-in {
          animation: bounce-in 0.5s ease-out forwards;
        }

        .animate-scale-in {
          animation: scale-in 0.4s ease-out 0.2s forwards;
          transform: scale(0);
        }

        .animate-shrink {
          animation: shrink 3s linear forwards;
        }

        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
