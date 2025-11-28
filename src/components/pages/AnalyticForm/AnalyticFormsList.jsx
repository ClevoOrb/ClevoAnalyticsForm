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

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import useAnalyticForms from "../../../hooks/useAnalyticForms";
import useAccessCode from "../../../hooks/useAccessCode";

// localStorage key for storing archived form IDs
const ARCHIVED_FORMS_KEY = 'archived_form_ids';

export default function AnalyticFormsList() {
  const [forms, setForms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  // Toggle to show archived forms or active forms
  const [showArchived, setShowArchived] = useState(false);
  // List of archived form IDs (stored in localStorage)
  const [archivedFormIds, setArchivedFormIds] = useState([]);
  const navigate = useNavigate();

  // Supabase hook
  const { getAllForms, deleteForm } = useAnalyticForms();

  // Access code hook - to check if user is admin (can delete)
  const { isAdmin } = useAccessCode();

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
   * Filter forms based on archive status
   * - If showArchived is true: show only archived forms
   * - If showArchived is false: show only non-archived forms
   */
  const filteredForms = forms.filter(form => {
    const isArchived = isFormArchived(form.id);
    return showArchived ? isArchived : !isArchived;
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
                className="bg-[#080594] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#0a06b8] transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create New Form
              </Link>
            )}
          </div>
        </div>

        {/* Forms List */}
        {isLoading ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="animate-spin w-12 h-12 mx-auto border-4 border-[#08B7F6] border-t-transparent rounded-full mb-4"></div>
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
                d={showArchived
                  ? "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                  : "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                }
              />
            </svg>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {showArchived ? "No Archived Forms" : "No Forms Created Yet"}
            </h3>
            <p className="text-gray-500 mb-6">
              {showArchived
                ? "You haven't archived any forms yet. Archive forms from the main list to see them here."
                : "Upload an Excel file with questions to create your first analytics form."}
            </p>
            {showArchived ? (
              <button
                onClick={() => setShowArchived(false)}
                className="inline-flex items-center gap-2 bg-[#08B7F6] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#069de8] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Active Forms
              </button>
            ) : (
              <Link
                to="/analytic-form-upload"
                className="inline-flex items-center gap-2 bg-[#08B7F6] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#069de8] transition-colors"
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
                      to={`/analytic-form-login/${form.id}`}
                      className="bg-[#080594] text-white px-5 py-2 rounded-full font-semibold hover:bg-[#0a06b8] transition-colors text-sm"
                    >
                      Open Form
                    </Link>

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
          <Link to="/analytic-form-upload" className="text-[#08B7F6] hover:text-[#080594] font-semibold transition-colors">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
