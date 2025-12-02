/**
 * LogoPicker.jsx
 *
 * A component for uploading and previewing custom logos for PC and Mobile.
 * Features:
 * - Separate uploads for PC and Mobile logos
 * - Image upload (supports PNG, JPG, SVG)
 * - Live preview with theme color background
 * - Remove logo option
 */

import { useState, useRef } from "react";

// Maximum file size: 500KB
const MAX_FILE_SIZE = 500 * 1024;

// Allowed file types
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"];

/**
 * Single Logo Upload Component (internal)
 */
function SingleLogoUpload({
  value,
  onChange,
  themeColor,
  label,
  description,
  icon
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const processFile = async (file) => {
    setError("");

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Invalid file type. Use PNG, JPG, SVG, or WebP.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("File too large. Max 500KB.");
      return;
    }

    setIsUploading(true);

    try {
      const base64 = await fileToBase64(file);
      onChange(base64);
    } catch (err) {
      console.error("Error processing file:", err);
      setError("Error processing file.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleRemoveLogo = () => {
    onChange(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-semibold text-gray-700">{label}</span>
      </div>
      <p className="text-xs text-gray-500 mb-2">{description}</p>

      <div
        className={`relative border-2 border-dashed rounded-xl p-4 transition-all ${
          dragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-200 hover:border-gray-300"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.svg,.webp"
          onChange={handleFileChange}
          className="hidden"
        />

        {value ? (
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-full p-3 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: themeColor }}
            >
              <img
                src={value}
                alt={label}
                className="max-h-12 max-w-full object-contain"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleUploadClick}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Change
              </button>
              <button
                type="button"
                onClick={handleRemoveLogo}
                className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div
            className="flex flex-col items-center gap-2 cursor-pointer py-2"
            onClick={handleUploadClick}
          >
            {isUploading ? (
              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            <p className="text-xs text-gray-500">Click or drag to upload</p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * LogoPicker Component - Handles both PC and Mobile logos
 *
 * @param {string} logoPC - Current PC logo (base64 string or URL)
 * @param {string} logoMobile - Current Mobile logo (base64 string or URL)
 * @param {function} onChangePC - Callback when PC logo changes
 * @param {function} onChangeMobile - Callback when Mobile logo changes
 * @param {string} themeColor - Theme color for preview background
 * @param {string} label - Label text for the picker
 * @param {boolean} showLabel - Whether to show the label
 */
export default function LogoPicker({
  logoPC = null,
  logoMobile = null,
  onChangePC,
  onChangeMobile,
  themeColor = "#080594",
  label = "Custom Logos",
  showLabel = true
}) {
  // PC Icon
  const pcIcon = (
    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );

  // Mobile Icon
  const mobileIcon = (
    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );

  return (
    <div className="w-full">
      {showLabel && (
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          {label}
        </label>
      )}

      {/* Two Logo Uploads Side by Side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SingleLogoUpload
          value={logoPC}
          onChange={onChangePC}
          themeColor={themeColor}
          label="Desktop Logo"
          description="Shows on PC/tablet (wider logo recommended)"
          icon={pcIcon}
        />

        <SingleLogoUpload
          value={logoMobile}
          onChange={onChangeMobile}
          themeColor={themeColor}
          label="Mobile Logo"
          description="Shows on mobile (compact logo recommended)"
          icon={mobileIcon}
        />
      </div>

      {/* Guidelines Section */}
      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-start gap-2">
          <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-xs font-semibold text-amber-800 mb-1">Logo Guidelines</p>
            <ul className="text-xs text-amber-700 space-y-0.5">
              <li>• Use <strong>transparent background</strong> (PNG or SVG)</li>
              <li>• <strong>Desktop:</strong> Horizontal logo, 200-400px width</li>
              <li>• <strong>Mobile:</strong> Square/compact logo, icon-style works best</li>
              <li>• Use <strong>light/white colored</strong> logos for visibility</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Preview Section */}
      {(logoPC || logoMobile) && (
        <div className="mt-4 p-4 bg-gray-50 rounded-xl">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-3">
            Preview - Navbar Appearance
          </p>

          {/* Desktop Preview */}
          {logoPC && (
            <div className="mb-3">
              <p className="text-xs text-gray-400 mb-1">Desktop View:</p>
              <div
                className="rounded-lg p-3 flex items-center gap-3"
                style={{ backgroundColor: themeColor }}
              >
                <img src="/assets/Logo1.svg" alt="Default" className="h-8 w-auto object-contain" />
                <span className="text-white/70 text-sm font-bold">X</span>
                <img src={logoPC} alt="Custom PC" className="h-8 w-auto object-contain max-w-[100px]" />
                <span className="text-white text-sm font-medium ml-auto">FORM TITLE</span>
              </div>
            </div>
          )}

          {/* Mobile Preview */}
          {logoMobile && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Mobile View:</p>
              <div
                className="rounded-lg p-3 flex items-center gap-2 max-w-[280px]"
                style={{ backgroundColor: themeColor }}
              >
                <img src="/assets/LogoMobile.svg" alt="Default" className="h-7 w-auto object-contain" />
                <span className="text-white/70 text-xs font-bold">X</span>
                <img src={logoMobile} alt="Custom Mobile" className="h-7 w-auto object-contain max-w-[60px]" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
