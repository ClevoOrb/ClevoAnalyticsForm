/**
 * ExcelUpload.jsx
 *
 * This component provides a page for uploading Excel files containing form questions.
 * It converts the Excel data to JSON format and stores it in Supabase.
 *
 * STORAGE: Supabase (analytic_forms table)
 *
 * The Excel file should follow this structure:
 * - Each sheet represents a section (e.g., "LIFESTYLE", "DIETARY HABITS")
 * - Columns should include: Heading, Question, Type, Options, subQuestionCondition,
 *   subQuestionType, Sub-Question, Suboptions, section
 */

import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import LoadingScreen from "../Form/LoadingScreen";
import useAnalyticForms from "../../../hooks/useAnalyticForms";
import ThemeSelector, { getThemeById, applyTheme } from "../../common/ThemeSelector";
// ThemeMethodSelector is now integrated inside ThemeSelector
import LogoPicker from "../../common/LogoPicker";
import FormPreview from "../../common/FormPreview";
import ThemeSuccessModal from "../../common/ThemeSuccessModal";

// Excel parsing function (using SheetJS/xlsx library)
// Supports TWO formats:
// 1. Single sheet with "Section" column - groups questions by Section value
// 2. Multiple sheets - each sheet becomes a section (legacy format)
const parseExcelToJSON = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        // Dynamically import xlsx library
        const XLSX = await import('xlsx');

        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // Result will be an array of section objects
        const result = [];
        // Store section descriptions from Excel
        const sectionDescriptionsFromExcel = {};

        // Check if using single-sheet format with Section column
        // by examining the first sheet
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const firstSheetData = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

        // Check if "Section" column exists in the first row
        const hasSectionColumn = firstSheetData.length > 0 &&
          (firstSheetData[0].Section !== undefined || firstSheetData[0].section !== undefined);

        if (hasSectionColumn && workbook.SheetNames.length === 1) {
          // SINGLE SHEET FORMAT: Group questions by Section column
          console.log("Detected single-sheet format with Section column");

          // Group questions by section
          const sectionGroups = {};
          const sectionOrder = []; // Preserve order of sections as they appear

          firstSheetData.forEach((row) => {
            // Get section name (try both "Section" and "section")
            const sectionName = (row.Section || row.section || "GENERAL").toString().toUpperCase().trim();

            // Get section description (try multiple column name variations)
            const sectionDesc = row["Section Description"] || row["SectionDescription"] || row["section description"] || row["sectionDescription"] || "";

            // Skip rows without questions
            if (!row.Question) return;

            // Track section order and capture description from first row of each section
            if (!sectionGroups[sectionName]) {
              sectionGroups[sectionName] = [];
              sectionOrder.push(sectionName);
              // Store section description if provided
              if (sectionDesc && sectionDesc.trim()) {
                sectionDescriptionsFromExcel[sectionName] = sectionDesc.trim();
              }
            }

            // Add question to section with index within that section
            sectionGroups[sectionName].push({
              index: sectionGroups[sectionName].length,
              Heading: sectionName,
              Question: row.Question || "",
              Type: (row.Type || "boolean").toLowerCase(),
              Options: row.Options || "YES,NO",
              subQuestionCondition: row.subQuestionCondition || "",
              subQuestionType: row.subQuestionType || "",
              "Sub-Question": row["Sub-Question"] || "",
              Suboptions: row.Suboptions || "",
              section: sectionName
            });
          });

          // Convert to result array in order
          sectionOrder.forEach((sectionName) => {
            const sectionObj = {};
            sectionObj[sectionName] = sectionGroups[sectionName];
            result.push(sectionObj);
          });

          console.log(`Parsed ${sectionOrder.length} sections from single sheet:`, sectionOrder);
          console.log('Section descriptions from Excel:', sectionDescriptionsFromExcel);
        } else {
          // MULTI-SHEET FORMAT: Each sheet is a section (legacy format)
          console.log("Detected multi-sheet format");

          workbook.SheetNames.forEach((sheetName, sheetIndex) => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

            // Process each row and add index
            const questions = jsonData.map((row, rowIndex) => {
              // Convert to the format expected by the form
              return {
                index: rowIndex,
                Heading: row.Heading || sheetName.toUpperCase(),
                Question: row.Question || "",
                Type: (row.Type || "boolean").toLowerCase(),
                Options: row.Options || "YES,NO",
                subQuestionCondition: row.subQuestionCondition || "",
                subQuestionType: row.subQuestionType || "",
                "Sub-Question": row["Sub-Question"] || "",
                Suboptions: row.Suboptions || "",
                section: row.section || ""
              };
            }).filter(q => q.Question); // Filter out empty rows

            // Create section object
            const sectionObj = {};
            const sectionName = sheetName.toUpperCase();
            sectionObj[sectionName] = questions;

            result.push(sectionObj);
          });
        }

        // Return both questions and section descriptions
        resolve({ questions: result, sectionDescriptions: sectionDescriptionsFromExcel });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
};

export default function ExcelUpload() {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedData, setUploadedData] = useState(null);
  const [fileName, setFileName] = useState("");
  const [formName, setFormName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [sectionDescriptions, setSectionDescriptions] = useState({}); // { sectionName: description }
  const [descriptionsFromExcel, setDescriptionsFromExcel] = useState({}); // Track which descriptions came from Excel
  const [selectedTheme, setSelectedTheme] = useState("default"); // Theme ID or "custom"
  const [customColors, setCustomColors] = useState(null); // { dark: "#hex", accent: "#hex" } for custom themes
  const [selectedThemeMethod, setSelectedThemeMethod] = useState("solid"); // Theme fill method (solid by default)
  const [logoPC, setLogoPC] = useState(null); // Custom logo for PC/Desktop (base64)
  const [logoMobile, setLogoMobile] = useState(null); // Custom logo for Mobile (base64)
  const [createdFormId, setCreatedFormId] = useState(null);
  const [createdFormLink, setCreatedFormLink] = useState("");
  const [showThemeModal, setShowThemeModal] = useState(false); // Theme success modal
  const fileInputRef = useRef(null);

  // Reset to default theme on mount (admin pages always use default colors)
  useEffect(() => {
    applyTheme("default");
  }, []);

  // Get current theme colors (handles both preset and custom)
  const getCurrentThemeColors = () => {
    if (selectedTheme === "custom" && customColors) {
      return { dark: customColors.dark, accent: customColors.accent };
    }
    const theme = getThemeById(selectedTheme);
    return { dark: theme.dark, accent: theme.accent };
  };

  // Handle theme selection - can be string (preset) or object (custom)
  const handleThemeChange = (themeData) => {
    if (typeof themeData === "string") {
      // Preset theme selected
      setSelectedTheme(themeData);
      setCustomColors(null);
      if (themeData !== "default") {
        setShowThemeModal(true);
      }
    } else if (themeData && themeData.id === "custom") {
      // Custom theme selected
      setSelectedTheme("custom");
      setCustomColors({ dark: themeData.dark, accent: themeData.accent });
      setShowThemeModal(true);
    }
  };

  // Supabase hook for form operations
  const { createForm, isLoading: isCreatingForm } = useAnalyticForms();

  const AuthImg = "https://d2zcrs37ownl9k.cloudfront.net/asset/auth Image/Group 2.webp";

  // Handle file selection
  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
      'application/vnd.ms-excel', // xls
      'text/csv' // csv
    ];

    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error("Please upload a valid Excel file (.xlsx, .xls) or CSV file", {
        duration: 4000,
      });
      return;
    }

    setIsLoading(true);
    setFileName(file.name);
    setCreatedFormId(null); // Reset if uploading new file

    try {
      const parseResult = await parseExcelToJSON(file);

      // Handle new format that returns { questions, sectionDescriptions }
      const jsonData = parseResult.questions || parseResult;
      const descriptionsFromExcel = parseResult.sectionDescriptions || {};

      if (!jsonData || jsonData.length === 0) {
        throw new Error("No valid data found in the file");
      }

      setUploadedData(jsonData);
      // Pre-populate section descriptions from Excel if provided
      setSectionDescriptions(prev => ({
        ...prev,
        ...descriptionsFromExcel
      }));
      // Track which descriptions came from Excel
      setDescriptionsFromExcel(descriptionsFromExcel);

      const sectionsWithDesc = Object.keys(descriptionsFromExcel).length;
      const totalSections = jsonData.length;
      const descMessage = sectionsWithDesc > 0
        ? ` (${sectionsWithDesc}/${totalSections} sections have descriptions from Excel)`
        : '';

      toast.success(`Successfully parsed ${jsonData.length} section(s) from the file!${descMessage}`, {
        duration: 3000,
      });
    } catch (error) {
      console.error("Error parsing Excel file:", error);
      toast.error(`Error parsing file: ${error.message}`, {
        duration: 4000,
      });
      setUploadedData(null);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Save form to Supabase
   * Stores form configuration in analytic_forms table
   */
  const saveFormToBackend = async (formData) => {
    // Use Supabase to create the form
    const savedForm = await createForm(formData);

    return {
      id: savedForm.form_code,
      ...formData,
      createdAt: savedForm.created_at
    };
  };

  // Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!uploadedData) {
      toast.error("Please upload an Excel file first", {
        duration: 3000,
      });
      return;
    }

    if (!formName.trim()) {
      toast.error("Please enter a form name", {
        duration: 3000,
      });
      // Scroll to and focus on the form name input
      const formNameInput = document.getElementById("formName");
      if (formNameInput) {
        formNameInput.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => formNameInput.focus(), 300); // Focus after scroll animation
      }
      return;
    }

    if (!organizationName.trim()) {
      toast.error("Please enter an organization name", {
        duration: 3000,
      });
      // Scroll to and focus on the organization name input
      const orgNameInput = document.getElementById("organizationName");
      if (orgNameInput) {
        orgNameInput.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => orgNameInput.focus(), 300); // Focus after scroll animation
      }
      return;
    }

    // Validate section descriptions - skip sections that have descriptions from Excel
    const sectionNames = uploadedData.map(section => Object.keys(section)[0]);

    // Only validate sections that don't have descriptions from Excel
    const sectionsNeedingManualInput = sectionNames.filter(name => !descriptionsFromExcel[name]);

    const missingSectionDescriptions = sectionsNeedingManualInput.filter(
      name => !sectionDescriptions[name] || !sectionDescriptions[name].trim()
    );

    if (missingSectionDescriptions.length > 0) {
      toast.error(`Please add description for: ${missingSectionDescriptions[0]}`, {
        duration: 3000,
      });
      return;
    }

    // Check minimum 20 characters for each description (only for manually entered ones)
    const shortDescriptions = sectionsNeedingManualInput.filter(
      name => sectionDescriptions[name] && sectionDescriptions[name].trim().length < 20
    );

    if (shortDescriptions.length > 0) {
      toast.error(`Description for "${shortDescriptions[0]}" must be at least 20 characters`, {
        duration: 3000,
      });
      return;
    }

    setIsLoading(true);

    try {
      const formData = {
        name: formName.trim(),
        organizationName: organizationName.trim(), // Organization name (required)
        fileName: fileName,
        questions: uploadedData,
        sections: uploadedData.map(section => Object.keys(section)[0]),
        sectionDescriptions: sectionDescriptions, // Section descriptions { sectionName: description }
        themeColor: selectedTheme, // Include selected theme ID or "custom"
        customColors: selectedTheme === "custom" ? customColors : null, // Include custom colors if custom theme
        themeMethod: selectedThemeMethod, // Include theme fill method (gradient/solid)
        logoPC: logoPC, // Custom logo for PC/Desktop (base64)
        logoMobile: logoMobile // Custom logo for Mobile (base64)
      };

      // Save form (currently to localStorage, will be API later)
      const savedForm = await saveFormToBackend(formData);

      // Generate the form link
      const baseUrl = window.location.origin;
      const formLink = `${baseUrl}/login/${savedForm.id}`;

      setCreatedFormId(savedForm.id);
      setCreatedFormLink(formLink);

      toast.success("Form created successfully!", {
        duration: 3000,
      });

    } catch (error) {
      console.error("Error saving form data:", error);

      // Show specific message for duplicate form error
      if (error.isDuplicate) {
        toast.error(error.message, {
          duration: 5000,
        });
      } else {
        toast.error("Error saving form data. Please try again.", {
          duration: 4000,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Copy link to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(createdFormLink).then(() => {
      toast.success("Link copied to clipboard!", { duration: 2000 });
    }).catch(() => {
      toast.error("Failed to copy link", { duration: 2000 });
    });
  };

  // Reset form to create another
  const resetForm = () => {
    setUploadedData(null);
    setFileName("");
    setFormName("");
    setOrganizationName(""); // Reset organization name
    setSectionDescriptions({}); // Reset section descriptions
    setDescriptionsFromExcel({}); // Reset Excel descriptions tracker
    setSelectedTheme("default"); // Reset to default theme
    setCustomColors(null); // Reset custom colors
    setLogoPC(null); // Reset PC logo
    setLogoMobile(null); // Reset Mobile logo
    setCreatedFormId(null);
    setCreatedFormLink("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle section description change
  const handleSectionDescriptionChange = (sectionName, description) => {
    setSectionDescriptions(prev => ({
      ...prev,
      [sectionName]: description
    }));
  };

  // Download Excel template function
  const downloadExcelTemplate = async () => {
    try {
      // Dynamically import xlsx library
      const XLSX = await import('xlsx');

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Template data with headers, instructions, and examples
      const templateData = [
        // Headers row
        ["Section", "Section Description", "Question", "Type", "Options", "subQuestionCondition", "subQuestionType", "Sub-Question", "Suboptions"],
        // Empty rows for spacing
        [],
        [],
        // Instructions section
        ["INSTRUCTIONS:"],
        [],
        ["NOTE:", "Before uploading, DELETE all instruction rows and example rows below. Keep only the header row (Row 1) and your actual questions."],
        [],
        ["Section", "Enter the section name (e.g., LIFESTYLE, DIETARY HABITS). All questions with the same section name will be grouped together."],
        ["Section Description", "Enter the purpose of this section (min 20 characters). Only needed in the FIRST row of each section."],
        ["Question", "Enter your question text here."],
        ["Type", "Choose one: boolean (Yes/No), dropdown (multiple choice), text (free text input), slider, rating"],
        ["Options", "For dropdown/rating type: Enter comma-separated options (e.g., Option1,Option2,Option3). For boolean: YES,NO"],
        ["subQuestionCondition", "If you want a follow-up question, enter the answer that triggers it (e.g., YES)"],
        ["subQuestionType", "Type for the sub-question: dropdown, text, or rating"],
        ["Sub-Question", "The follow-up question text"],
        ["Suboptions", "For dropdown sub-questions: comma-separated options"],
        [],
        [],
        // Examples section
        ["EXAMPLES:"],
        [],
        // Lifestyle section examples
        ["Lifestyle", "This section assesses your daily lifestyle habits including smoking and exercise patterns.", "Do you smoke?", "boolean", "YES,NO", "Yes", "dropdown", "If Yes How often do you smoke?", "Daily,Weekly,Occasionally"],
        ["Lifestyle", "", "Do you exercise regularly?", "boolean", "YES,NO", "Yes", "rating", "If Yes Rate your exercise intensity", "1,2,3,4,5,6,7,8,9,10"],
        ["Lifestyle", "", "How many hours do you sleep?", "dropdown", "Less than 5,5-7,7-9,More than 9", "", "", "", ""],
        // Medical History section examples
        ["Medical History", "This section collects information about your medical background and current health conditions.", "Do you have any chronic conditions?", "boolean", "YES,NO", "Yes", "dropdown", "If Yes Please specify the condition", "Diabetes,Hypertension,Heart Disease,Other"],
        ["Medical History", "", "Are you currently on medication?", "boolean", "YES,NO", "Yes", "dropdown", "If Yes What type of medication?", "Prescription,Over-the-counter,Both"],
        ["Medical History", "", "Do you have allergies?", "boolean", "YES,NO", "Yes", "dropdown", "If Yes Which allergy?", "Dust,Food,Pollen,Other"],
        // Nutrition section examples
        ["Nutrition", "This section evaluates your dietary habits and food consumption patterns.", "What is your diet type?", "dropdown", "Vegetarian,Non-Vegetarian,Vegan,Mixed", "", "", "", ""],
        ["Nutrition", "", "Do you consume sugary foods often?", "boolean", "YES,NO", "Yes", "dropdown", "If Yes How frequently?", "Daily,Weekly,Occasionally"],
        ["Nutrition", "", "Do you consume caffeine daily?", "boolean", "YES,NO", "Yes", "dropdown", "If Yes How many cups per day?", "1,2,3,4+"],
        // Mental Health section examples
        ["Mental Health", "This section assesses your mental well-being and psychological health indicators.", "How would you rate your stress level?", "rating", "1,2,3,4,5,6,7,8,9,10", "", "", "", ""],
        ["Mental Health", "", "Do you experience frequent headaches?", "boolean", "YES,NO", "Yes", "dropdown", "If Yes Rate the severity", "Mild,Moderate,Severe"],
        ["Mental Health", "", "Do you feel fatigued often?", "boolean", "YES,NO", "Yes", "dropdown", "If Yes How intense?", "Mild,Moderate,Severe"],
        // General Wellness section examples
        ["General Wellness", "This section covers your overall wellness practices and daily health routines.", "How much water do you drink daily?", "dropdown", "1L,1-2L,2-3L,More than 3L", "", "", "", ""],
        ["General Wellness", "", "Do you walk daily?", "boolean", "YES,NO", "Yes", "dropdown", "If Yes How many steps?", "Below 3000,3000-6000,6000-9000,9000+"],
        ["General Wellness", "", "Do you check your blood pressure regularly?", "boolean", "YES,NO", "Yes", "dropdown", "If Yes How often?", "Daily,Weekly,Monthly"],
      ];

      // Create worksheet from data
      const ws = XLSX.utils.aoa_to_sheet(templateData);

      // Set column widths for better readability
      ws['!cols'] = [
        { wch: 18 },  // Section
        { wch: 60 },  // Section Description
        { wch: 40 },  // Question
        { wch: 12 },  // Type
        { wch: 35 },  // Options
        { wch: 20 },  // subQuestionCondition
        { wch: 15 },  // subQuestionType
        { wch: 35 },  // Sub-Question
        { wch: 35 },  // Suboptions
      ];

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Form Template");

      // Generate and download file
      XLSX.writeFile(wb, "form-template.xlsx");

      toast.success("Template downloaded successfully!", { duration: 2000 });
    } catch (error) {
      console.error("Error generating template:", error);
      toast.error("Failed to download template", { duration: 3000 });
    }
  };

  // Preview the parsed data
  const renderPreview = () => {
    if (!uploadedData) return null;

    return (
      <div className="mt-6 p-4 bg-gray-50 rounded-lg max-h-[500px] overflow-y-auto">
        <h3 className="text-lg font-bold text-[#080594] mb-3">
          Sections Preview
          <span className="text-sm font-normal text-gray-500 ml-2">
            (Add description for each section)
          </span>
        </h3>
        {uploadedData.map((section, sectionIndex) => {
          const sectionName = Object.keys(section)[0];
          const questions = section[sectionName];
          const isFromExcel = descriptionsFromExcel[sectionName] ? true : false;

          return (
            <div key={sectionIndex} className="mb-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100">
              <h4 className="font-bold text-[#2C2C2C] mb-2">
                {sectionName} ({questions.length} questions)
              </h4>

              {/* Section Description - Show differently based on if from Excel or manual */}
              <div className="mb-3">
                {isFromExcel ? (
                  // Description from Excel - Show as read-only with badge
                  <>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">
                      Section Description
                      <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-normal">
                        ✓ From Excel
                      </span>
                    </label>
                    <div className="w-full px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-gray-800">
                      {sectionDescriptions[sectionName]}
                    </div>
                  </>
                ) : (
                  // Manual input required
                  <>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">
                      Section Description<span className="text-red-500">*</span>
                      <span className="text-xs font-normal text-gray-400 ml-2">(min. 20 characters)</span>
                    </label>
                    <textarea
                      value={sectionDescriptions[sectionName] || ""}
                      onChange={(e) => handleSectionDescriptionChange(sectionName, e.target.value)}
                      placeholder={`What is the purpose of the ${sectionName} section?`}
                      className={`w-full px-3 py-2 bg-gray-50 border rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#08b7f6] focus:border-transparent transition-all resize-none ${
                        sectionDescriptions[sectionName] && sectionDescriptions[sectionName].trim().length > 0 && sectionDescriptions[sectionName].trim().length < 20
                          ? "border-red-300"
                          : "border-gray-200"
                      }`}
                      rows={2}
                      required
                    />
                    <div className="flex justify-end mt-1">
                      <span className={`text-xs ${
                        sectionDescriptions[sectionName] && sectionDescriptions[sectionName].trim().length >= 20
                          ? "text-green-500"
                          : sectionDescriptions[sectionName] && sectionDescriptions[sectionName].trim().length > 0
                            ? "text-red-500"
                            : "text-gray-400"
                      }`}>
                        {(sectionDescriptions[sectionName] || "").trim().length}/20
                      </span>
                    </div>
                  </>
                )}
              </div>

              <ul className="text-sm text-gray-600 space-y-1">
                {questions.slice(0, 3).map((q, qIndex) => (
                  <li key={qIndex} className="truncate">
                    {qIndex + 1}. {q.Question}
                  </li>
                ))}
                {questions.length > 3 && (
                  <li className="text-[#08b7f6]">
                    ...and {questions.length - 3} more questions
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    );
  };

  // Render success state with form link
  const renderSuccessState = () => {
    if (!createdFormId) return null;

    const totalQuestions = uploadedData.reduce((acc, section) => {
      const sectionName = Object.keys(section)[0];
      return acc + section[sectionName].length;
    }, 0);

    return (
      <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 mt-6">
        {/* Success Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-green-700">Form Created Successfully!</h3>
            <p className="text-green-600 text-sm">Your questionnaire is ready to be shared</p>
          </div>
        </div>

        {/* Form Details */}
        <div className="bg-white rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Form Name:</span>
              <p className="font-semibold text-[#2C2C2C]">{formName}</p>
            </div>
            <div>
              <span className="text-gray-500">Sections:</span>
              <p className="font-semibold text-[#2C2C2C]">{uploadedData.length}</p>
            </div>
            <div>
              <span className="text-gray-500">Total Questions:</span>
              <p className="font-semibold text-[#2C2C2C]">{totalQuestions}</p>
            </div>
            <div>
              <span className="text-gray-500">Form ID:</span>
              <p className="font-semibold text-[#2C2C2C] text-xs truncate">{createdFormId}</p>
            </div>
          </div>
        </div>

        {/* Shareable Link */}
        <div className="mb-4">
          <label className="text-sm font-semibold text-gray-700 mb-2 block">
            Share this link with users to fill the form:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={createdFormLink}
              className="flex-1 px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-700 font-mono"
            />
            <button
              onClick={copyToClipboard}
              className="px-4 py-3 bg-[#080594] text-white rounded-lg hover:bg-[#060473] transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to={`/login/${createdFormId}`}
            className="flex-1 bg-[#08b7f6] text-white flex items-center justify-center px-6 py-3 rounded-full font-semibold hover:bg-[#069DE8] transition-colors text-center"
          >
            Open Form
          </Link>
          <button
            onClick={resetForm}
            className="flex-1 bg-white text-[#080594] px-6 py-3 rounded-full font-semibold border-2 border-[#080594] hover:bg-[#080594] hover:text-white transition-colors"
          >
            Create Another Form
          </button>
        </div>

        {/* Storage Notice */}
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-xs text-green-700">
            <strong>Cloud Saved:</strong> Your form is securely stored in the cloud.
            Share the link with anyone - they can access and fill the form from any device.
          </p>
        </div>
      </div>
    );
  };

  return (
    <>
      {isLoading && <LoadingScreen />}
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 py-8 px-4">
        {/* Header Section */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <h1 className="text-3xl tab:text-4xl font-bold text-[#080594] arca">
                Create Analytics Form
              </h1>
              <p className="text-gray-500 mt-1 opensans-regular">
                Build dynamic questionnaires from Excel files
              </p>
            </div>
            <Link
              to="/analytic-forms"
              className="bg-gradient-to-r from-[#08b7f6] to-[#080594] text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:from-[#080594] hover:to-[#08b7f6] transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              View All Forms
            </Link>
          </div>
        </div>

        {/* Main Card */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl p-6 tab:p-10 border border-gray-100">
            {/* Show success state if form created */}
            {createdFormId ? (
              renderSuccessState()
            ) : (
              <>
                {/* Instructions Card */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-5 mb-8 border border-blue-100">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-[#08b7f6] rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#080594] mb-1">How it works</h3>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        Upload an Excel file with your questions. Each sheet becomes a section,
                        or use a single sheet with a "Section" column to organize questions.
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Form Name Input */}
                  <div>
                    <label
                      htmlFor="formName"
                      className="block text-sm font-semibold text-gray-700 mb-2"
                    >
                      Form Name<span className="text-red-500 text-xl">*</span>
                    </label>
                    <input
                      type="text"
                      id="formName"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g., Health Assessment 2025"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#08b7f6] focus:border-transparent transition-all"
                      required
                    />
                  </div>

                  {/* Organization Name Input */}
                  <div>
                    <label
                      htmlFor="organizationName"
                      className="block text-sm font-semibold text-gray-700 mb-2"
                    >
                      Organization Name<span className="text-red-500 text-xl">*</span>
                    </label>
                    <input
                      type="text"
                      id="organizationName"
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      placeholder="e.g., ABC Healthcare Pvt Ltd"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#08b7f6] focus:border-transparent transition-all"
                      required
                    />
                  </div>

                  {/* Theme Selector with Fill Style Toggle */}
                  <ThemeSelector
                    value={selectedTheme}
                    customColors={customColors}
                    onChange={handleThemeChange}
                    themeMethod={selectedThemeMethod}
                    onThemeMethodChange={setSelectedThemeMethod}
                    label="Select Theme"
                  />

                  {/* Live Form Preview */}
                  <div className="mt-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Form Preview
                    </label>
                    <FormPreview
                      themeColor={getCurrentThemeColors().dark}
                      accentColor={getCurrentThemeColors().accent}
                      themeMethod={selectedThemeMethod}
                      logoPC={logoPC}
                      logoMobile={logoMobile}
                      formName={formName}
                    />
                  </div>

                  {/* Custom Logo Picker - PC and Mobile */}
                  <LogoPicker
                    logoPC={logoPC}
                    logoMobile={logoMobile}
                    onChangePC={setLogoPC}
                    onChangeMobile={setLogoMobile}
                    themeColor={getCurrentThemeColors().dark}
                    label="Custom Logos (Optional)"
                  />


                  {/* File Upload Section */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Upload Excel File<span className="text-red-500 text-xl">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={downloadExcelTemplate}
                        className="flex items-center gap-1 text-sm text-[#08b7f6] hover:text-[#080594] font-medium transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download Template (.xlsx)
                      </button>
                    </div>

                    {/* Hidden file input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                    />

                    {/* Custom upload area */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 ${fileName
                          ? "border-green-400 bg-green-50 hover:bg-green-100"
                          : "border-gray-300 bg-gray-50 hover:border-[#08b7f6] hover:bg-blue-50"
                        }`}
                    >
                      {fileName ? (
                        <div className="text-center">
                          <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <p className="font-bold text-green-700 text-lg">{fileName}</p>
                          <p className="text-green-600 text-sm mt-1">File uploaded successfully</p>
                          <p className="text-gray-400 text-xs mt-3">Click to change file</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="w-16 h-16 bg-gradient-to-br from-[#08b7f6] to-[#080594] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          </div>
                          <p className="font-bold text-gray-700 text-lg">Drop your file here</p>
                          <p className="text-gray-500 text-sm mt-1">or click to browse</p>
                          <div className="flex items-center justify-center gap-2 mt-4">
                            <span className="px-3 py-1 bg-gray-200 rounded-full text-xs font-medium text-gray-600">.xlsx</span>
                            <span className="px-3 py-1 bg-gray-200 rounded-full text-xs font-medium text-gray-600">.xls</span>
                            <span className="px-3 py-1 bg-gray-200 rounded-full text-xs font-medium text-gray-600">.csv</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Preview Section */}
                  {renderPreview()}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={!uploadedData || !formName.trim() || !organizationName.trim()}
                    className={`w-full py-4 font-bold rounded-xl text-base uppercase tracking-wide transition-all duration-300 ${uploadedData && formName.trim() && organizationName.trim()
                        ? "bg-gradient-to-r from-[#080594] to-[#08b7f6] text-white hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      }`}
                  >
                    {uploadedData && formName.trim() && organizationName.trim() ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Create Form
                      </span>
                    ) : (
                      "Create Form"
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Theme Success Modal */}
      <ThemeSuccessModal
        isOpen={showThemeModal}
        onClose={() => setShowThemeModal(false)}
        themeId={selectedTheme}
        themeName={selectedTheme === "custom" ? "Custom" : getThemeById(selectedTheme).name}
        customColors={customColors}
      />
    </>
  );
}
