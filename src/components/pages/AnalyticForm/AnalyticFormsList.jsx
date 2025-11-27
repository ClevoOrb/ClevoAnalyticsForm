/**
 * AnalyticFormsList.jsx
 *
 * A page that displays all previously created analytics forms.
 * Users can select a form to fill out or create a new one.
 * Data is fetched from Supabase.
 */

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import useAnalyticForms from "../../../hooks/useAnalyticForms";

export default function AnalyticFormsList() {
  const [forms, setForms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Supabase hook
  const { getAllForms, deleteForm } = useAnalyticForms();

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
            <h1 className="text-3xl font-bold text-[#080594] arca">Analytics Forms</h1>
            <p className="text-gray-600 mt-1">Manage and access your questionnaire forms</p>
          </div>
          <Link
            to="/analytic-form-upload"
            className="bg-[#080594] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#0a06b8] transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Form
          </Link>
        </div>

        {/* Forms List */}
        {isLoading ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="animate-spin w-12 h-12 mx-auto border-4 border-[#08B7F6] border-t-transparent rounded-full mb-4"></div>
            <p className="text-gray-500">Loading forms...</p>
          </div>
        ) : forms.length === 0 ? (
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Forms Created Yet</h3>
            <p className="text-gray-500 mb-6">
              Upload an Excel file with questions to create your first analytics form.
            </p>
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
          </div>
        ) : (
          <div className="space-y-4">
            {forms.map((form) => (
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
