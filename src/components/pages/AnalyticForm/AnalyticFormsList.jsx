/**
 * AnalyticFormsList.jsx
 *
 * A page that displays all previously created analytics forms.
 * Users can select a form to fill out or create a new one.
 * Data is fetched from Supabase.
 *
 * Archive Feature (Frontend-only):
 * - Editors can archive forms to hide them from the main list
 * - Archived form IDs are stored in localStorage
 * - "Show Archives" button toggles between active and archived forms
 * - Archiving does NOT delete data from the database
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import useAnalyticForms from "../../../hooks/useAnalyticForms";
import useAccessCode from "../../../hooks/useAccessCode";
import ThemeSelector, { getThemeById, applyTheme } from "../../common/ThemeSelector";
import LogoPicker from "../../common/LogoPicker";
import ThemeSuccessModal from "../../common/ThemeSuccessModal";

/**
 * Parse Excel file to JSON format
 * Supports two formats:
 * 1. Single sheet with "Section" column
 * 2. Multiple sheets (each sheet = section)
 */
const parseExcelToJSON = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const XLSX = await import('xlsx');
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const result = [];
        // Store section descriptions from Excel
        const sectionDescriptionsFromExcel = {};

        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const firstSheetData = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

        const hasSectionColumn = firstSheetData.length > 0 &&
          (firstSheetData[0].Section !== undefined || firstSheetData[0].section !== undefined);

        if (hasSectionColumn && workbook.SheetNames.length === 1) {
          // Single sheet format with Section column
          const sectionGroups = {};
          const sectionOrder = [];

          firstSheetData.forEach((row) => {
            const sectionName = (row.Section || row.section || "GENERAL").toString().toUpperCase().trim();

            // Get section description (try multiple column name variations)
            const sectionDesc = row["Section Description"] || row["SectionDescription"] || row["section description"] || row["sectionDescription"] || "";

            if (!row.Question) return;

            if (!sectionGroups[sectionName]) {
              sectionGroups[sectionName] = [];
              sectionOrder.push(sectionName);
              // Store section description if provided
              if (sectionDesc && sectionDesc.trim()) {
                sectionDescriptionsFromExcel[sectionName] = sectionDesc.trim();
              }
            }

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

          sectionOrder.forEach((sectionName) => {
            const sectionObj = {};
            sectionObj[sectionName] = sectionGroups[sectionName];
            result.push(sectionObj);
          });
        } else {
          // Multi-sheet format
          workbook.SheetNames.forEach((sheetName) => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

            const questions = jsonData.map((row, rowIndex) => ({
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
            })).filter(q => q.Question);

            const sectionObj = {};
            sectionObj[sheetName.toUpperCase()] = questions;
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

// localStorage key for storing archived form IDs
const ARCHIVED_FORMS_KEY = 'archived_form_ids';

/**
 * Normalize question type to match select options
 * Maps various type values to standard types: boolean, dropdown, text, rating, slider
 */
const normalizeQuestionType = (type) => {
  if (!type) return "boolean";

  const normalizedType = type.toLowerCase().trim();

  // Map common variations to standard types
  const typeMap = {
    // Boolean variations
    "boolean": "boolean",
    "bool": "boolean",
    "yes/no": "boolean",
    "yesno": "boolean",

    // Dropdown/MCQ variations
    "dropdown": "dropdown",
    "mcq": "dropdown",
    "multiple choice": "dropdown",
    "multiplechoice": "dropdown",
    "select": "dropdown",
    "choice": "dropdown",
    "options": "dropdown",

    // Text variations
    "text": "text",
    "input": "text",
    "textinput": "text",
    "free text": "text",
    "freetext": "text",
    "string": "text",

    // Rating variations
    "rating": "rating",
    "rate": "rating",
    "scale": "rating",
    "stars": "rating",

    // Slider variations
    "slider": "slider",
    "range": "slider",
  };

  return typeMap[normalizedType] || "boolean";
};

export default function AnalyticFormsList() {
  const [forms, setForms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  // Search term for filtering forms by name
  const [searchTerm, setSearchTerm] = useState("");
  // Toggle to show archived forms or active forms
  const [showArchived, setShowArchived] = useState(false);
  // List of archived form IDs (stored in localStorage)
  const [archivedFormIds, setArchivedFormIds] = useState([]);
  // State for theme picker modal
  const [themePickerFormId, setThemePickerFormId] = useState(null);
  const [tempTheme, setTempTheme] = useState("default");
  const [tempThemeMethod, setTempThemeMethod] = useState("solid"); // "gradient" or "solid"
  // State for logo picker modal
  const [logoPickerFormId, setLogoPickerFormId] = useState(null);
  const [tempLogo, setTempLogo] = useState(null);
  const [logoPickerTheme, setLogoPickerTheme] = useState("default");
  // State for theme success modal
  const [showThemeSuccessModal, setShowThemeSuccessModal] = useState(false);
  const [savedThemeId, setSavedThemeId] = useState("default");
  // State for edit form modal
  const [editFormId, setEditFormId] = useState(null);
  const [editFormName, setEditFormName] = useState("");
  const [editUploadedData, setEditUploadedData] = useState(null);
  const [editFileName, setEditFileName] = useState("");
  const [editSectionDescriptions, setEditSectionDescriptions] = useState({}); // { sectionName: description }
  const [editDescriptionsFromExcel, setEditDescriptionsFromExcel] = useState({}); // Track which descriptions came from Excel
  const [isEditLoading, setIsEditLoading] = useState(false);
  const editFileInputRef = useRef(null);
  // Edit mode: "select" (choose mode), "minor" (inline edit), "excel" (upload new excel)
  const [editMode, setEditMode] = useState("select");
  // Existing form data for minor edits
  const [existingFormData, setExistingFormData] = useState(null);
  const navigate = useNavigate();

  // Supabase hook
  const { getAllForms, getForm, deleteForm, updateFormColor, updateFormLogo, updateFormQuestions } = useAnalyticForms();

  // Access code hook - to check if user is admin (can delete)
  const { isAdmin } = useAccessCode();

  // Reset to default theme on mount (admin pages always use default colors)
  useEffect(() => {
    applyTheme("default");
  }, []);

  // Load archived form IDs from localStorage on mount
  useEffect(() => {
    const storedArchived = localStorage.getItem(ARCHIVED_FORMS_KEY);
    if (storedArchived) {
      try {
        setArchivedFormIds(JSON.parse(storedArchived));
      } catch (e) {
        console.error('Error parsing archived forms:', e);
        setArchivedFormIds([]);
      }
    }
  }, []);

  useEffect(() => {
    // Load forms list from Supabase
    const loadForms = async () => {
      setIsLoading(true);
      try {
        const formsList = await getAllForms();
        setForms(formsList);
      } catch (e) {
        console.error("Error loading forms list:", e);
        setForms([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadForms();
  }, [getAllForms]);

  const handleDeleteForm = async (formId) => {
    // Check if user has admin role - only admins can delete
    if (!isAdmin()) {
      toast.error("You don't have permission to delete forms. Admin access required.", { duration: 3000 });
      return;
    }

    if (window.confirm("Are you sure you want to delete this form? This action cannot be undone.")) {
      try {
        // Delete from Supabase
        const success = await deleteForm(formId);

        if (success) {
          // Update local state
          const updatedForms = forms.filter((f) => f.id !== formId);
          setForms(updatedForms);
          toast.success("Form deleted successfully", { duration: 2000 });
        } else {
          toast.error("Error deleting form", { duration: 3000 });
        }
      } catch (e) {
        console.error("Error deleting form:", e);
        toast.error("Error deleting form", { duration: 3000 });
      }
    }
  };

  /**
   * Archive a form (frontend-only)
   * Adds the form ID to localStorage, hiding it from the main list
   */
  const handleArchiveForm = (formId) => {
    const updatedArchived = [...archivedFormIds, formId];
    setArchivedFormIds(updatedArchived);
    localStorage.setItem(ARCHIVED_FORMS_KEY, JSON.stringify(updatedArchived));
    toast.success("Form archived successfully", { duration: 2000 });
  };

  /**
   * Unarchive a form (restore to main list)
   * Removes the form ID from localStorage
   */
  const handleUnarchiveForm = (formId) => {
    const updatedArchived = archivedFormIds.filter(id => id !== formId);
    setArchivedFormIds(updatedArchived);
    localStorage.setItem(ARCHIVED_FORMS_KEY, JSON.stringify(updatedArchived));
    toast.success("Form restored successfully", { duration: 2000 });
  };

  /**
   * Check if a form is archived
   */
  const isFormArchived = (formId) => {
    return archivedFormIds.includes(formId);
  };

  /**
   * Open theme picker for a form
   */
  const handleOpenThemePicker = (formId, currentTheme, currentThemeMethod) => {
    setThemePickerFormId(formId);
    setTempTheme(currentTheme || "default");
    setTempThemeMethod(currentThemeMethod || "solid");
  };

  /**
   * Close theme picker
   */
  const handleCloseThemePicker = () => {
    setThemePickerFormId(null);
    setTempTheme("default");
    setTempThemeMethod("solid");
  };

  /**
   * Save the new theme and fill style for a form
   */
  const handleSaveTheme = async () => {
    if (!themePickerFormId) return;

    try {
      // Update both theme color and method
      const success = await updateFormColor(themePickerFormId, tempTheme, tempThemeMethod);

      if (success) {
        // Update local state
        setForms(forms.map(form =>
          form.id === themePickerFormId
            ? { ...form, themeColor: tempTheme, themeMethod: tempThemeMethod }
            : form
        ));
        // Show success modal for non-default themes
        if (tempTheme !== "default") {
          setSavedThemeId(tempTheme);
          setShowThemeSuccessModal(true);
        } else {
          toast.success("Theme updated successfully!", { duration: 2000 });
        }
        handleCloseThemePicker();
      } else {
        toast.error("Error updating theme", { duration: 3000 });
      }
    } catch (e) {
      console.error("Error updating form theme:", e);
      toast.error("Error updating theme", { duration: 3000 });
    }
  };

  /**
   * Open logo picker for a form
   */
  const handleOpenLogoPicker = (formId, currentLogo, theme) => {
    setLogoPickerFormId(formId);
    setTempLogo(currentLogo || null);
    setLogoPickerTheme(theme || "default");
  };

  /**
   * Close logo picker
   */
  const handleCloseLogoPicker = () => {
    setLogoPickerFormId(null);
    setTempLogo(null);
    setLogoPickerTheme("default");
  };

  /**
   * Save the new logo for a form
   */
  const handleSaveLogo = async () => {
    if (!logoPickerFormId) return;

    try {
      const success = await updateFormLogo(logoPickerFormId, tempLogo);

      if (success) {
        // Update local state
        setForms(forms.map(form =>
          form.id === logoPickerFormId
            ? { ...form, logo: tempLogo }
            : form
        ));
        toast.success(tempLogo ? "Logo updated successfully!" : "Logo removed successfully!", { duration: 2000 });
        handleCloseLogoPicker();
      } else {
        toast.error("Error updating logo", { duration: 3000 });
      }
    } catch (e) {
      console.error("Error updating form logo:", e);
      toast.error("Error updating logo", { duration: 3000 });
    }
  };

  /**
   * Open edit modal for a form
   */
  const handleOpenEditModal = (formId, formName) => {
    setEditFormId(formId);
    setEditFormName(formName);
    setEditUploadedData(null);
    setEditFileName("");
    setEditMode("select"); // Start with mode selection
    setExistingFormData(null);
  };

  /**
   * Close edit modal
   */
  const handleCloseEditModal = () => {
    setEditFormId(null);
    setEditFormName("");
    setEditUploadedData(null);
    setEditFileName("");
    setEditSectionDescriptions({}); // Reset section descriptions
    setEditDescriptionsFromExcel({}); // Reset Excel descriptions tracker
    setEditMode("select"); // Reset edit mode
    setExistingFormData(null); // Reset existing form data
    if (editFileInputRef.current) {
      editFileInputRef.current.value = "";
    }
  };

  /**
   * Handle selecting Minor Update mode - fetch existing form data
   */
  const handleSelectMinorUpdate = async () => {
    if (!editFormId) return;

    setIsEditLoading(true);
    try {
      const formData = await getForm(editFormId);
      if (formData) {
        // Normalize all question types to standard values when loading
        // This ensures types like "mcq" are converted to "dropdown" before editing
        const normalizedQuestions = formData.questions.map(section => {
          const sectionName = Object.keys(section)[0];
          const questions = section[sectionName].map(q => ({
            ...q,
            Type: normalizeQuestionType(q.Type),
            subQuestionType: q.subQuestionType ? normalizeQuestionType(q.subQuestionType) : ""
          }));
          return { [sectionName]: questions };
        });

        setExistingFormData({
          ...formData,
          questions: normalizedQuestions
        });
        // Pre-populate section descriptions from existing form
        setEditSectionDescriptions(formData.section_descriptions || {});
        setEditMode("minor");
      } else {
        toast.error("Could not load form data", { duration: 3000 });
      }
    } catch (error) {
      console.error("Error fetching form data:", error);
      toast.error("Error loading form data", { duration: 3000 });
    } finally {
      setIsEditLoading(false);
    }
  };

  /**
   * Handle selecting Excel Upload mode
   */
  const handleSelectExcelMode = () => {
    setEditMode("excel");
  };

  /**
   * Go back to mode selection
   */
  const handleBackToModeSelection = () => {
    setEditMode("select");
    setEditUploadedData(null);
    setEditFileName("");
    setExistingFormData(null);
    setEditSectionDescriptions({});
    setEditDescriptionsFromExcel({});
    if (editFileInputRef.current) {
      editFileInputRef.current.value = "";
    }
  };

  /**
   * Update a question in existing form data (for minor edits)
   */
  const handleUpdateQuestion = (sectionIndex, questionIndex, field, value) => {
    if (!existingFormData) return;

    const updatedQuestions = [...existingFormData.questions];
    const sectionName = Object.keys(updatedQuestions[sectionIndex])[0];
    const sectionQuestions = [...updatedQuestions[sectionIndex][sectionName]];

    sectionQuestions[questionIndex] = {
      ...sectionQuestions[questionIndex],
      [field]: value
    };

    updatedQuestions[sectionIndex] = { [sectionName]: sectionQuestions };

    setExistingFormData({
      ...existingFormData,
      questions: updatedQuestions
    });
  };

  /**
   * Save minor edits to the form
   */
  const handleSaveMinorEdits = async () => {
    if (!editFormId || !existingFormData) return;

    setIsEditLoading(true);
    try {
      const sections = existingFormData.questions.map(section => Object.keys(section)[0]);
      const success = await updateFormQuestions(
        editFormId,
        existingFormData.questions,
        sections,
        editSectionDescriptions
      );

      if (success) {
        // Update local state with new sections count
        setForms(forms.map(form =>
          form.id === editFormId
            ? { ...form, sectionsCount: sections.length }
            : form
        ));
        toast.success("Form updated successfully!", { duration: 3000 });
        handleCloseEditModal();
      } else {
        toast.error("Error updating form", { duration: 3000 });
      }
    } catch (error) {
      console.error("Error saving minor edits:", error);
      toast.error("Error saving changes", { duration: 3000 });
    } finally {
      setIsEditLoading(false);
    }
  };

  // Handle edit section description change
  const handleEditSectionDescriptionChange = (sectionName, description) => {
    setEditSectionDescriptions(prev => ({
      ...prev,
      [sectionName]: description
    }));
  };

  /**
   * Handle file selection in edit modal
   */
  const handleEditFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];

    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error("Please upload a valid Excel file (.xlsx, .xls) or CSV file", { duration: 4000 });
      return;
    }

    setIsEditLoading(true);
    setEditFileName(file.name);

    try {
      const parseResult = await parseExcelToJSON(file);

      // Handle new format that returns { questions, sectionDescriptions }
      const jsonData = parseResult.questions || parseResult;
      const descriptionsFromExcel = parseResult.sectionDescriptions || {};

      if (!jsonData || jsonData.length === 0) {
        throw new Error("No valid data found in the file");
      }

      setEditUploadedData(jsonData);
      // Pre-populate section descriptions from Excel if provided
      setEditSectionDescriptions(prev => ({
        ...prev,
        ...descriptionsFromExcel
      }));
      // Track which descriptions came from Excel
      setEditDescriptionsFromExcel(descriptionsFromExcel);

      const sectionsWithDesc = Object.keys(descriptionsFromExcel).length;
      const totalSections = jsonData.length;
      const descMessage = sectionsWithDesc > 0
        ? ` (${sectionsWithDesc}/${totalSections} sections have descriptions from Excel)`
        : '';

      toast.success(`Successfully parsed ${jsonData.length} section(s) from the file!${descMessage}`, { duration: 3000 });
    } catch (error) {
      console.error("Error parsing Excel file:", error);
      toast.error(`Error parsing file: ${error.message}`, { duration: 4000 });
      setEditUploadedData(null);
    } finally {
      setIsEditLoading(false);
    }
  };

  /**
   * Save updated questions for a form
   */
  const handleSaveEditedForm = async () => {
    if (!editFormId || !editUploadedData) return;

    // Validate section descriptions - skip sections that have descriptions from Excel
    const sectionNames = editUploadedData.map(section => Object.keys(section)[0]);

    // Only validate sections that don't have descriptions from Excel
    const sectionsNeedingManualInput = sectionNames.filter(name => !editDescriptionsFromExcel[name]);

    const missingSectionDescriptions = sectionsNeedingManualInput.filter(
      name => !editSectionDescriptions[name] || !editSectionDescriptions[name].trim()
    );

    if (missingSectionDescriptions.length > 0) {
      toast.error(`Please add description for: ${missingSectionDescriptions[0]}`, {
        duration: 3000,
      });
      return;
    }

    // Check minimum 20 characters for each description (only for manually entered ones)
    const shortDescriptions = sectionsNeedingManualInput.filter(
      name => editSectionDescriptions[name] && editSectionDescriptions[name].trim().length < 20
    );

    if (shortDescriptions.length > 0) {
      toast.error(`Description for "${shortDescriptions[0]}" must be at least 20 characters`, {
        duration: 3000,
      });
      return;
    }

    setIsEditLoading(true);

    try {
      const sections = editUploadedData.map(section => Object.keys(section)[0]);
      const success = await updateFormQuestions(editFormId, editUploadedData, sections, editSectionDescriptions);

      if (success) {
        // Update local state with new sections count
        setForms(forms.map(form =>
          form.id === editFormId
            ? { ...form, sectionsCount: sections.length }
            : form
        ));
        toast.success("Form questions updated successfully!", { duration: 3000 });
        handleCloseEditModal();
      } else {
        toast.error("Error updating form questions", { duration: 3000 });
      }
    } catch (e) {
      console.error("Error updating form:", e);
      toast.error("Error updating form questions", { duration: 3000 });
    } finally {
      setIsEditLoading(false);
    }
  };

  /**
   * Filter forms based on archive status and search term
   * - If showArchived is true: show only archived forms
   * - If showArchived is false: show only non-archived forms
   * - Also filters by search term (case-insensitive name match)
   */
  const filteredForms = forms.filter(form => {
    const isArchived = isFormArchived(form.id);
    const matchesArchiveFilter = showArchived ? isArchived : !isArchived;

    // Check if form name matches search term (case-insensitive)
    const matchesSearch = searchTerm.trim() === ""
      || form.name.toLowerCase().includes(searchTerm.toLowerCase().trim());

    return matchesArchiveFilter && matchesSearch;
  });

  // Count of archived forms (for badge display)
  const archivedCount = forms.filter(form => isFormArchived(form.id)).length;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#080594] arca">
              {showArchived ? "Archived Forms" : "Analytics Forms"}
            </h1>
            <p className="text-gray-600 mt-1">
              {showArchived
                ? "View and restore your archived forms"
                : "Manage and access your questionnaire forms"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Show Archives Toggle Button */}
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`px-4 py-3 rounded-full font-semibold transition-colors flex items-center gap-2 ${
                showArchived
                  ? "bg-amber-500 text-white hover:bg-amber-600"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                />
              </svg>
              {showArchived ? "Show Active" : "Archives"}
              {/* Badge showing count of archived forms */}
              {archivedCount > 0 && !showArchived && (
                <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {archivedCount}
                </span>
              )}
            </button>
            {/* Create New Form Button - only show when not viewing archives */}
            {!showArchived && (
              <Link
                to="/analytic-form-upload"
                className="bg-[#080594] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#060473] transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create New Form
              </Link>
            )}
          </div>
        </div>

        {/* Search Input */}
        <div className="mb-6">
          <div className="relative">
            {/* Search Icon */}
            <svg
              className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {/* Search Input Field */}
            <input
              type="text"
              placeholder="Search forms by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-10 py-3 border-2 border-gray-200 rounded-full focus:border-[#08b7f6] focus:outline-none transition-colors text-gray-700"
            />
            {/* Clear Button - shown only when there's text */}
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                title="Clear search"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {/* Search Results Count - shown when searching */}
          {searchTerm && (
            <p className="text-sm text-gray-500 mt-2 ml-4">
              Found {filteredForms.length} {filteredForms.length === 1 ? "form" : "forms"} matching "{searchTerm}"
            </p>
          )}
        </div>

        {/* Forms List */}
        {isLoading ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="animate-spin w-12 h-12 mx-auto border-4 border-[#08b7f6] border-t-transparent rounded-full mb-4"></div>
            <p className="text-gray-500">Loading forms...</p>
          </div>
        ) : filteredForms.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <svg
              className="w-16 h-16 mx-auto text-gray-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d={searchTerm
                  ? "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  : showArchived
                    ? "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                    : "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                }
              />
            </svg>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {searchTerm
                ? "No Forms Found"
                : showArchived
                  ? "No Archived Forms"
                  : "No Forms Created Yet"}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm
                ? `No forms match "${searchTerm}". Try a different search term.`
                : showArchived
                  ? "You haven't archived any forms yet. Archive forms from the main list to see them here."
                  : "Upload an Excel file with questions to create your first analytics form."}
            </p>
            {searchTerm ? (
              <button
                onClick={() => setSearchTerm("")}
                className="inline-flex items-center gap-2 bg-[#08b7f6] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#069DE8] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear Search
              </button>
            ) : showArchived ? (
              <button
                onClick={() => setShowArchived(false)}
                className="inline-flex items-center gap-2 bg-[#08b7f6] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#069DE8] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Active Forms
              </button>
            ) : (
              <Link
                to="/analytic-form-upload"
                className="inline-flex items-center gap-2 bg-[#08b7f6] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#069DE8] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                Upload Excel File
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredForms.map((form) => (
              <div
                key={form.id}
                className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-[#2C2C2C] mb-1">{form.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          />
                        </svg>
                        {form.sectionsCount} sections
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        {formatDate(form.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/login/${form.id}`}
                      className="bg-[#080594] text-white px-5 py-2 rounded-full font-semibold hover:bg-[#060473] transition-colors text-sm"
                    >
                      Open Form
                    </Link>

                    {/* Theme Picker Button */}
                    <button
                      onClick={() => handleOpenThemePicker(form.id, form.themeColor, form.themeMethod)}
                      className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                      title="Change Theme"
                    >
                      {/* Show theme colors as two-color swatch */}
                      <div className="flex rounded overflow-hidden border border-gray-300">
                        <div
                          className="w-3 h-5"
                          style={{ backgroundColor: getThemeById(form.themeColor || "default").dark }}
                        />
                        <div
                          className="w-3 h-5"
                          style={{ backgroundColor: getThemeById(form.themeColor || "default").accent }}
                        />
                      </div>
                    </button>

                    {/* Logo Picker Button */}
                    <button
                      onClick={() => handleOpenLogoPicker(form.id, form.logo, form.themeColor)}
                      className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                      title="Change Logo"
                    >
                      {form.logo ? (
                        <img
                          src={form.logo}
                          alt="Logo"
                          className="w-5 h-5 object-contain"
                        />
                      ) : (
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      )}
                    </button>

                    {/* Edit Form Button - Re-upload Excel to update questions */}
                    <button
                      onClick={() => handleOpenEditModal(form.id, form.name)}
                      className="text-blue-500 hover:text-blue-700 p-2 rounded-full hover:bg-blue-50 transition-colors"
                      title="Edit Questions"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>

                    {/* Archive/Unarchive button - shown based on current view */}
                    {showArchived ? (
                      // Unarchive button (restore) - shown in archives view
                      <button
                        onClick={() => handleUnarchiveForm(form.id)}
                        className="text-green-600 hover:text-green-700 p-2 rounded-full hover:bg-green-50 transition-colors"
                        title="Restore Form"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                      </button>
                    ) : (
                      // Archive button - shown in active forms view
                      <button
                        onClick={() => handleArchiveForm(form.id)}
                        className="text-amber-500 hover:text-amber-700 p-2 rounded-full hover:bg-amber-50 transition-colors"
                        title="Archive Form"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                          />
                        </svg>
                      </button>
                    )}

                    {/* Only show delete button if user is admin */}
                    {isAdmin() && (
                      <button
                        onClick={() => handleDeleteForm(form.id)}
                        className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors"
                        title="Delete Form"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Back to Home Link */}
        <div className="mt-8 text-center">
          <Link to="/analytic-form-upload" className="text-[#08b7f6] hover:text-[#080594] font-semibold transition-colors">
            &larr; Back to Home
          </Link>
        </div>
      </div>

      {/* Theme Picker Modal */}
      {themePickerFormId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Change Theme</h3>
              <button
                onClick={handleCloseThemePicker}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-gray-600 text-sm mb-4">
              Select a theme for this form. The theme colors will be used for buttons, headers, and accents.
            </p>

            <ThemeSelector
              value={tempTheme}
              onChange={setTempTheme}
              themeMethod={tempThemeMethod}
              onThemeMethodChange={setTempThemeMethod}
              showLabel={false}
            />

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCloseThemePicker}
                className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-600 rounded-full font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTheme}
                className="flex-1 px-4 py-3 text-white rounded-full font-semibold transition-colors"
                style={{ backgroundColor: getThemeById(tempTheme).dark }}
              >
                Save Theme
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logo Picker Modal */}
      {logoPickerFormId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Custom Logo</h3>
              <button
                onClick={handleCloseLogoPicker}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-gray-600 text-sm mb-4">
              Upload a custom logo for this form. The logo will appear in the form header with your theme color.
            </p>

            <LogoPicker
              value={tempLogo}
              onChange={setTempLogo}
              themeColor={getThemeById(logoPickerTheme).dark}
              showLabel={false}
            />

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCloseLogoPicker}
                className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-600 rounded-full font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLogo}
                className="flex-1 px-4 py-3 text-white rounded-full font-semibold transition-colors"
                style={{ backgroundColor: getThemeById(logoPickerTheme).dark }}
              >
                Save Logo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Form Modal - Mode Selection, Minor Edit, or Excel Upload */}
      {editFormId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                {editMode !== "select" && (
                  <button
                    onClick={handleBackToModeSelection}
                    className="text-gray-400 hover:text-gray-600 p-1"
                    title="Back"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                <h3 className="text-xl font-bold text-gray-800">
                  {editMode === "select" ? "Edit Form" : editMode === "minor" ? "Minor Update" : "Upload New Excel"}
                </h3>
              </div>
              <button
                onClick={handleCloseEditModal}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form Name Banner */}
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700">
                <strong>Editing:</strong> {editFormName}
              </p>
            </div>

            {/* Loading State */}
            {isEditLoading && (
              <div className="py-12 text-center">
                <div className="animate-spin w-12 h-12 mx-auto border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
                <p className="text-gray-600">Loading...</p>
              </div>
            )}

            {/* MODE SELECTION SCREEN */}
            {editMode === "select" && !isEditLoading && (
              <div className="space-y-4">
                <p className="text-gray-600 text-sm mb-4">
                  Choose how you want to update this form:
                </p>

                {/* Minor Update Option */}
                <button
                  onClick={handleSelectMinorUpdate}
                  className="w-full p-5 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 mb-1">Minor Update</h4>
                      <p className="text-sm text-gray-500">
                        Edit individual questions, options, or sub-questions directly. Best for small changes like fixing typos or updating options.
                      </p>
                    </div>
                  </div>
                </button>

                {/* Upload Excel Option */}
                <button
                  onClick={handleSelectExcelMode}
                  className="w-full p-5 border-2 border-gray-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-green-200 transition-colors">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 mb-1">Upload New Excel</h4>
                      <p className="text-sm text-gray-500">
                        Replace all questions by uploading a new Excel file. Best for major restructuring or adding many new questions.
                      </p>
                    </div>
                  </div>
                </button>

                {/* Cancel Button */}
                <div className="pt-4">
                  <button
                    onClick={handleCloseEditModal}
                    className="w-full px-4 py-3 border-2 border-gray-200 text-gray-600 rounded-full font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* MINOR UPDATE INTERFACE */}
            {editMode === "minor" && !isEditLoading && existingFormData && (
              <div className="space-y-4">
                {/* Sections with Questions */}
                <div className="max-h-[50vh] overflow-y-auto space-y-4 pr-2">
                  {existingFormData.questions.map((section, sectionIndex) => {
                    const sectionName = Object.keys(section)[0];
                    const questions = section[sectionName];

                    return (
                      <div key={sectionIndex} className="border border-gray-200 rounded-xl overflow-hidden">
                        {/* Section Header */}
                        <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
                          <h4 className="font-bold text-gray-800">{sectionName}</h4>
                          <p className="text-xs text-gray-500">{questions.length} questions</p>
                        </div>

                        {/* Section Description */}
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                          <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Section Description
                          </label>
                          <textarea
                            value={editSectionDescriptions[sectionName] || ""}
                            onChange={(e) => handleEditSectionDescriptionChange(sectionName, e.target.value)}
                            placeholder="What is the purpose of this section?"
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                            rows={2}
                          />
                        </div>

                        {/* Questions */}
                        <div className="divide-y divide-gray-100">
                          {questions.map((question, questionIndex) => (
                            <div key={questionIndex} className="p-4 hover:bg-gray-50 transition-colors">
                              <div className="flex items-start gap-3">
                                <span className="text-xs font-bold text-gray-400 mt-2">Q{questionIndex + 1}</span>
                                <div className="flex-1 space-y-3">
                                  {/* Question Text */}
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Question</label>
                                    <input
                                      type="text"
                                      value={question.Question || ""}
                                      onChange={(e) => handleUpdateQuestion(sectionIndex, questionIndex, "Question", e.target.value)}
                                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    />
                                  </div>

                                  {/* Type and Options Row */}
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-xs font-semibold text-gray-500 mb-1">Type</label>
                                      <select
                                        value={normalizeQuestionType(question.Type)}
                                        onChange={(e) => handleUpdateQuestion(sectionIndex, questionIndex, "Type", e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                      >
                                        <option value="boolean">Boolean (Yes/No)</option>
                                        <option value="dropdown">Dropdown / MCQ</option>
                                        <option value="rating">Rating</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-xs font-semibold text-gray-500 mb-1">Options</label>
                                      <input
                                        type="text"
                                        value={question.Options || ""}
                                        onChange={(e) => handleUpdateQuestion(sectionIndex, questionIndex, "Options", e.target.value)}
                                        placeholder="YES,NO or Option1,Option2"
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                      />
                                    </div>
                                  </div>

                                  {/* Sub-Question Fields (collapsible style) */}
                                  {(question.subQuestionCondition || question["Sub-Question"]) && (
                                    <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                      <p className="text-xs font-semibold text-blue-700 mb-2">Sub-Question</p>
                                      <div className="space-y-2">
                                        <div className="grid grid-cols-2 gap-2">
                                          <div>
                                            <label className="block text-xs text-blue-600 mb-1">Condition</label>
                                            <input
                                              type="text"
                                              value={question.subQuestionCondition || ""}
                                              onChange={(e) => handleUpdateQuestion(sectionIndex, questionIndex, "subQuestionCondition", e.target.value)}
                                              placeholder="e.g., Yes"
                                              className="w-full px-2 py-1.5 bg-white border border-blue-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-xs text-blue-600 mb-1">Sub Type</label>
                                            <select
                                              value={question.subQuestionType ? normalizeQuestionType(question.subQuestionType) : ""}
                                              onChange={(e) => handleUpdateQuestion(sectionIndex, questionIndex, "subQuestionType", e.target.value)}
                                              className="w-full px-2 py-1.5 bg-white border border-blue-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                                            >
                                              <option value="">Select...</option>
                                              <option value="dropdown">Dropdown / MCQ</option>
                                              <option value="rating">Rating</option>
                                            </select>
                                          </div>
                                        </div>
                                        <div>
                                          <label className="block text-xs text-blue-600 mb-1">Sub-Question Text</label>
                                          <input
                                            type="text"
                                            value={question["Sub-Question"] || ""}
                                            onChange={(e) => handleUpdateQuestion(sectionIndex, questionIndex, "Sub-Question", e.target.value)}
                                            placeholder="Follow-up question..."
                                            className="w-full px-2 py-1.5 bg-white border border-blue-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs text-blue-600 mb-1">Sub-Options</label>
                                          <input
                                            type="text"
                                            value={question.Suboptions || ""}
                                            onChange={(e) => handleUpdateQuestion(sectionIndex, questionIndex, "Suboptions", e.target.value)}
                                            placeholder="Option1,Option2,Option3"
                                            className="w-full px-2 py-1.5 bg-white border border-blue-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleBackToModeSelection}
                    className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-600 rounded-full font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSaveMinorEdits}
                    disabled={isEditLoading}
                    className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-full font-semibold hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {isEditLoading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            )}

            {/* EXCEL UPLOAD INTERFACE */}
            {editMode === "excel" && !isEditLoading && (
              <>
                {/* Hidden file input */}
                <input
                  type="file"
                  ref={editFileInputRef}
                  onChange={handleEditFileSelect}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                />

                {/* Upload area */}
                <div
                  onClick={() => editFileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-300 ${
                    editFileName
                      ? "border-green-400 bg-green-50 hover:bg-green-100"
                      : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50"
                  }`}
                >
                  {editFileName ? (
                    <div className="text-center">
                      <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="font-bold text-green-700">{editFileName}</p>
                      <p className="text-green-600 text-sm mt-1">
                        {editUploadedData ? `${editUploadedData.length} sections parsed` : 'File ready'}
                      </p>
                      <p className="text-gray-400 text-xs mt-2">Click to change file</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <p className="font-semibold text-gray-700">Upload New Excel File</p>
                      <p className="text-gray-500 text-sm mt-1">Click to browse</p>
                      <div className="flex items-center justify-center gap-2 mt-3">
                        <span className="px-2 py-1 bg-gray-200 rounded text-xs font-medium text-gray-600">.xlsx</span>
                        <span className="px-2 py-1 bg-gray-200 rounded text-xs font-medium text-gray-600">.xls</span>
                        <span className="px-2 py-1 bg-gray-200 rounded text-xs font-medium text-gray-600">.csv</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Preview of parsed sections with description inputs */}
                {editUploadedData && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg max-h-[300px] overflow-y-auto">
                    <p className="text-sm font-semibold text-gray-700 mb-3">
                      Sections to be updated:
                      <span className="text-xs font-normal text-gray-500 ml-2">(Add description for each section - min. 20 characters)</span>
                    </p>
                    <div className="space-y-3">
                      {editUploadedData.map((section, idx) => {
                        const sectionName = Object.keys(section)[0];
                        const questionsCount = section[sectionName].length;
                        const descLength = (editSectionDescriptions[sectionName] || "").trim().length;
                        const isFromExcel = editDescriptionsFromExcel[sectionName] ? true : false;
                        return (
                          <div key={idx} className="p-3 bg-white rounded-lg border border-gray-200">
                            <div className="text-sm text-gray-700 flex justify-between mb-2">
                              <span className="font-semibold">{sectionName}</span>
                              <span className="text-gray-400">{questionsCount} questions</span>
                            </div>
                            {isFromExcel ? (
                              // Description from Excel - Show as read-only with badge
                              <>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs text-gray-500">Section Description</span>
                                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                    ✓ From Excel
                                  </span>
                                </div>
                                <div className="w-full px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-gray-800">
                                  {editSectionDescriptions[sectionName]}
                                </div>
                              </>
                            ) : (
                              // Manual input required
                              <>
                                <textarea
                                  value={editSectionDescriptions[sectionName] || ""}
                                  onChange={(e) => handleEditSectionDescriptionChange(sectionName, e.target.value)}
                                  placeholder={`What is the purpose of the ${sectionName} section?`}
                                  className={`w-full px-3 py-2 bg-gray-50 border rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all resize-none ${
                                    descLength > 0 && descLength < 20 ? "border-red-300" : "border-gray-200"
                                  }`}
                                  rows={2}
                                  required
                                />
                                <div className="flex justify-end mt-1">
                                  <span className={`text-xs ${
                                    descLength >= 20
                                      ? "text-green-500"
                                      : descLength > 0
                                        ? "text-red-500"
                                        : "text-gray-400"
                                  }`}>
                                    {descLength}/20
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Warning message */}
                <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-xs text-amber-700">
                    <strong>Warning:</strong> This will replace ALL existing questions in the form.
                    User responses already submitted will NOT be affected.
                  </p>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleBackToModeSelection}
                    className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-600 rounded-full font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSaveEditedForm}
                    disabled={
                      !editUploadedData ||
                      isEditLoading ||
                      (editUploadedData && editUploadedData.some(section => {
                        const sectionName = Object.keys(section)[0];
                        // Skip validation for sections with descriptions from Excel
                        if (editDescriptionsFromExcel[sectionName]) return false;
                        const desc = editSectionDescriptions[sectionName];
                        return !desc || !desc.trim() || desc.trim().length < 20;
                      }))
                    }
                    className={`flex-1 px-4 py-3 rounded-full font-semibold transition-colors ${
                      editUploadedData && !isEditLoading && editUploadedData.every(section => {
                        const sectionName = Object.keys(section)[0];
                        // Skip validation for sections with descriptions from Excel
                        if (editDescriptionsFromExcel[sectionName]) return true;
                        const desc = editSectionDescriptions[sectionName];
                        return desc && desc.trim() && desc.trim().length >= 20;
                      })
                        ? "bg-blue-500 text-white hover:bg-blue-600"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {isEditLoading ? "Saving..." : "Update Questions"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Theme Success Modal */}
      <ThemeSuccessModal
        isOpen={showThemeSuccessModal}
        onClose={() => setShowThemeSuccessModal(false)}
        themeId={savedThemeId}
        themeName={getThemeById(savedThemeId).name}
      />
    </div>
  );
}
