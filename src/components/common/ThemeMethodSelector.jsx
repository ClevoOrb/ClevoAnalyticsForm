/**
 * ThemeMethodSelector.jsx
 *
 * A component for selecting theme fill method: gradient or solid.
 * - Gradient: Uses linear-gradient(135deg, dark, accent)
 * - Solid: Uses solid accent color for fills
 */

import { useState } from "react";

// Theme methods
const THEME_METHODS = [
  { id: "gradient", name: "Gradient", description: "Smooth color transition" },
  { id: "solid", name: "Solid", description: "Single accent color" },
];

/**
 * Apply theme method to document
 * Sets data-theme-method attribute on <html> element
 */
export const applyThemeMethod = (method) => {
  document.documentElement.setAttribute("data-theme-method", method);
};

/**
 * Get current theme method from document
 */
export const getThemeMethod = () => {
  return document.documentElement.getAttribute("data-theme-method") || "gradient";
};

/**
 * ThemeMethodSelector Component
 */
export default function ThemeMethodSelector({
  value = "solid",
  onChange,
  themeColor = "#080594",
  accentColor = "#08b7f6",
  label = "Fill Style",
  showLabel = true
}) {
  const handleMethodChange = (methodId) => {
    onChange(methodId);
    applyThemeMethod(methodId);
  };

  // Generate preview styles
  const gradientStyle = `linear-gradient(135deg, ${themeColor}, ${accentColor})`;
  const solidStyle = accentColor;

  return (
    <div className="w-full">
      {showLabel && (
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {label}
        </label>
      )}

      <div className="flex gap-3">
        {/* Gradient Option */}
        <button
          type="button"
          onClick={() => handleMethodChange("gradient")}
          className={`flex-1 p-3 rounded-xl border-2 transition-all ${
            value === "gradient"
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <div
            className="h-8 rounded-lg mb-2"
            style={{ background: gradientStyle }}
          />
          <p className="text-sm font-medium text-gray-700">Gradient</p>
          <p className="text-xs text-gray-500">Smooth transition</p>
        </button>

        {/* Solid Option */}
        <button
          type="button"
          onClick={() => handleMethodChange("solid")}
          className={`flex-1 p-3 rounded-xl border-2 transition-all ${
            value === "solid"
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <div
            className="h-8 rounded-lg mb-2"
            style={{ background: solidStyle }}
          />
          <p className="text-sm font-medium text-gray-700">Solid</p>
          <p className="text-xs text-gray-500">Single color</p>
        </button>
      </div>
    </div>
  );
}
