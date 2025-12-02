/**
 * ThemeSelector.jsx
 *
 * A component for selecting predefined color themes or creating custom palettes.
 * Shows 8 top theme combinations with hex codes, plus a custom palette generator.
 *
 * Usage:
 * <ThemeSelector value="default" onChange={(themeData) => console.log(themeData)} />
 *
 * onChange receives either:
 * - A theme ID string (e.g., "default") for preset themes
 * - An object { id: "custom", dark: "#hex", accent: "#hex" } for custom palettes
 */

import { useState, useRef, useEffect } from "react";

// Top 8 predefined themes with their colors and names
const TOP_THEMES = [
  { id: "default", name: "Blue Cyan", dark: "#080594", accent: "#08b7f6" },
  { id: "forest", name: "Green Sage", dark: "#283618", accent: "#52b788" },
  { id: "grape", name: "Purple Lavender", dark: "#3c096c", accent: "#c77dff" },
  { id: "midnight", name: "Deep Purple", dark: "#10002b", accent: "#5a189a" },
  { id: "violet", name: "Dark Teal", dark: "#041b15", accent: "#136f63" },
  { id: "blush", name: "Navy Gold", dark: "#0a174e", accent: "#f5d042" },
  { id: "electric", name: "Black Blue", dark: "#080708", accent: "#3772ff" },
  { id: "aqua", name: "Indigo Lime", dark: "#4831D4", accent: "#CCF381" },
];

// Keep all themes for backwards compatibility (getThemeById)
const ALL_THEMES = [
  ...TOP_THEMES,
  { id: "terracotta", name: "Orange Pink", dark: "#fb5607", accent: "#ff006e" },
  { id: "sunshine", name: "Black Yellow", dark: "#202020", accent: "#ffee32" },
  { id: "silver", name: "Charcoal Teal", dark: "#131515", accent: "#7de2d1" },
  { id: "coffee", name: "Teal Aqua", dark: "#006d77", accent: "#83c5be" },
  { id: "ruby", name: "Black Red", dark: "#0b090a", accent: "#e5383b" },
  { id: "mint", name: "Black Mint", dark: "#000000", accent: "#CFFFE2" },
  { id: "stone", name: "Gray Beige", dark: "#696663", accent: "#cbc5c0" },
  { id: "royal", name: "Teal Cream", dark: "#02343f", accent: "#f0edcc" },
  { id: "gold", name: "Gold Honey", dark: "#ffc60a", accent: "#ffe285" },
  { id: "ocean", name: "Purple Orange", dark: "#3b1877", accent: "#da5a2a" },
  { id: "emerald", name: "Green Mint", dark: "#1c3e35", accent: "#99f2d1" },
  { id: "crimson", name: "Purple Yellow", dark: "#422057", accent: "#FCF951" },
  { id: "neon", name: "Navy Lime", dark: "#03045e", accent: "#b8fb3c" },
];

/**
 * Apply theme to document
 * Sets CSS variables on :root for dynamic theming
 */
export const applyTheme = (themeId, customColors = null) => {
  document.documentElement.setAttribute("data-theme", themeId);

  // If custom colors provided, set CSS variables directly
  if (themeId === "custom" && customColors) {
    document.documentElement.style.setProperty("--color-dark", customColors.dark);
    document.documentElement.style.setProperty("--color-accent", customColors.accent);
  } else {
    // Find theme and apply its colors
    const theme = ALL_THEMES.find(t => t.id === themeId) || ALL_THEMES[0];
    document.documentElement.style.setProperty("--color-dark", theme.dark);
    document.documentElement.style.setProperty("--color-accent", theme.accent);
  }
};

/**
 * Get theme by ID
 * Returns custom theme object if customColors provided
 */
export const getThemeById = (themeId, customColors = null) => {
  if (themeId === "custom" && customColors) {
    return { id: "custom", name: "Custom", dark: customColors.dark, accent: customColors.accent };
  }
  return ALL_THEMES.find(t => t.id === themeId) || ALL_THEMES[0];
};

/**
 * Get all themes (for backwards compatibility)
 */
export const getAllThemes = () => ALL_THEMES;

/**
 * Get top themes
 */
export const getTopThemes = () => TOP_THEMES;

/**
 * ThemeSelector Component
 */
export default function ThemeSelector({
  value = "default",
  customColors = null, // { dark: "#hex", accent: "#hex" } for custom themes
  onChange,
  label = "Theme",
  showLabel = true
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(value === "custom");
  const [customDark, setCustomDark] = useState(customColors?.dark || "#080594");
  const [customAccent, setCustomAccent] = useState(customColors?.accent || "#08b7f6");
  const selectorRef = useRef(null);

  // Get current theme object
  const currentTheme = value === "custom"
    ? { id: "custom", name: "Custom", dark: customDark, accent: customAccent }
    : getThemeById(value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update custom colors when props change
  useEffect(() => {
    if (customColors) {
      setCustomDark(customColors.dark);
      setCustomAccent(customColors.accent);
    }
  }, [customColors]);

  // Handle preset theme selection
  const handleThemeSelect = (themeId) => {
    setIsCustomMode(false);
    onChange(themeId);
    applyTheme(themeId);
    setIsOpen(false);
  };

  // Handle custom color change
  const handleCustomColorChange = (type, color) => {
    if (type === "dark") {
      setCustomDark(color);
    } else {
      setCustomAccent(color);
    }
  };

  // Apply custom theme
  const handleApplyCustom = () => {
    setIsCustomMode(true);
    onChange({ id: "custom", dark: customDark, accent: customAccent });
    applyTheme("custom", { dark: customDark, accent: customAccent });
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={selectorRef}>
      {/* Label */}
      {showLabel && (
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {label}
        </label>
      )}

      {/* Selected Theme Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-all shadow-sm"
      >
        {/* Theme Preview */}
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg overflow-hidden shadow-sm">
            <div
              className="w-8 h-8"
              style={{ backgroundColor: currentTheme.dark }}
            />
            <div
              className="w-8 h-8"
              style={{ backgroundColor: currentTheme.accent }}
            />
          </div>
          <div className="flex flex-col items-start">
            <span className="font-medium text-gray-700">{currentTheme.name}</span>
            <span className="text-xs text-gray-400">
              {currentTheme.dark.toUpperCase()} + {currentTheme.accent.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Dropdown Arrow */}
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 p-4 max-h-[70vh] overflow-y-auto">

          {/* Top Combinations Section */}
          <p className="text-xs font-semibold text-gray-500 uppercase mb-3">
            Top Combinations
          </p>

          {/* Theme Grid - responsive columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {TOP_THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => handleThemeSelect(theme.id)}
                className={`relative p-3 rounded-xl transition-all text-left ${
                  value === theme.id && !isCustomMode
                    ? "ring-2 ring-blue-500 ring-offset-2 bg-blue-50"
                    : "hover:bg-gray-50 border border-gray-100"
                }`}
              >
                {/* Color Preview */}
                <div className="flex rounded-lg overflow-hidden shadow-sm mb-2">
                  <div
                    className="w-full h-8"
                    style={{ backgroundColor: theme.dark }}
                  />
                  <div
                    className="w-full h-8"
                    style={{ backgroundColor: theme.accent }}
                  />
                </div>

                {/* Theme Name */}
                <p className="text-sm font-semibold text-gray-700 mb-1">
                  {theme.name}
                </p>

                {/* Hex Codes */}
                <div className="flex flex-wrap gap-1 text-[10px]">
                  <span
                    className="px-1.5 py-0.5 rounded text-white font-mono truncate"
                    style={{ backgroundColor: theme.dark }}
                  >
                    {theme.dark.toUpperCase()}
                  </span>
                  <span
                    className="px-1.5 py-0.5 rounded font-mono truncate"
                    style={{
                      backgroundColor: theme.accent,
                      color: isLightColor(theme.accent) ? "#333" : "#fff"
                    }}
                  >
                    {theme.accent.toUpperCase()}
                  </span>
                </div>

                {/* Checkmark for selected */}
                {value === theme.id && !isCustomMode && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 my-4" />

          {/* Custom Palette Generator Section */}
          <p className="text-xs font-semibold text-gray-500 uppercase mb-3">
            Custom Palette
          </p>

          <div className="bg-gray-50 rounded-xl p-3 sm:p-4">
            {/* Color Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
              {/* Dark Color */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">
                  Primary (Dark)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customDark}
                    onChange={(e) => handleCustomColorChange("dark", e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border-2 border-gray-200"
                  />
                  <input
                    type="text"
                    value={customDark.toUpperCase()}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                        handleCustomColorChange("dark", val);
                      }
                    }}
                    className="flex-1 min-w-0 px-2 py-2 text-sm font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="#000000"
                  />
                </div>
              </div>

              {/* Accent Color */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">
                  Accent (Light)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customAccent}
                    onChange={(e) => handleCustomColorChange("accent", e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border-2 border-gray-200"
                  />
                  <input
                    type="text"
                    value={customAccent.toUpperCase()}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                        handleCustomColorChange("accent", val);
                      }
                    }}
                    className="flex-1 min-w-0 px-2 py-2 text-sm font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>
            </div>

            {/* Custom Preview */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-600 mb-2">
                Preview
              </label>
              <div className="flex rounded-xl overflow-hidden shadow-md">
                <div
                  className="w-full h-12 flex items-center justify-center text-white text-xs font-mono"
                  style={{ backgroundColor: customDark }}
                >
                  {customDark.toUpperCase()}
                </div>
                <div
                  className="w-full h-12 flex items-center justify-center text-xs font-mono"
                  style={{
                    backgroundColor: customAccent,
                    color: isLightColor(customAccent) ? "#333" : "#fff"
                  }}
                >
                  {customAccent.toUpperCase()}
                </div>
              </div>
            </div>

            {/* Apply Button */}
            <button
              type="button"
              onClick={handleApplyCustom}
              className={`w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
                isCustomMode
                  ? "bg-blue-500 text-white ring-2 ring-blue-500 ring-offset-2"
                  : "text-white hover:opacity-90"
              }`}
              style={{
                background: isCustomMode ? undefined : `linear-gradient(135deg, ${customDark}, ${customAccent})`
              }}
            >
              {isCustomMode ? "Custom Theme Applied" : "Apply Custom Theme"}
            </button>
          </div>

          {/* Button Preview Section */}
          <div className="border-t border-gray-100 pt-4 mt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
              Button Preview
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 py-2 px-4 rounded-full text-white text-sm font-semibold"
                style={{ backgroundColor: currentTheme.dark }}
              >
                Primary
              </button>
              <button
                type="button"
                className="flex-1 py-2 px-4 rounded-full text-sm font-semibold border-2"
                style={{
                  borderColor: currentTheme.dark,
                  color: currentTheme.dark,
                  backgroundColor: "white"
                }}
              >
                Outline
              </button>
              <button
                type="button"
                className="flex-1 py-2 px-4 rounded-full text-sm font-semibold"
                style={{
                  backgroundColor: currentTheme.accent,
                  color: isLightColor(currentTheme.accent) ? "#333" : "#fff"
                }}
              >
                Accent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Helper function to determine if a color is light or dark
 * Used for setting appropriate text color on backgrounds
 */
function isLightColor(hex) {
  // Remove # if present
  const color = hex.replace("#", "");

  // Convert to RGB
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5;
}
