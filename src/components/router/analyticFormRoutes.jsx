/**
 * Analytics Form Routes
 *
 * Routes for the dynamic analytics form feature.
 * These forms are created from uploaded Excel files and stored in Supabase.
 */

import AnalyticFormLogin from "../pages/AnalyticForm/AnalyticFormLogin";
import AnalyticFeedbackForm from "../pages/AnalyticForm/AnalyticFeedbackForm";
import AnalyticFeedbackFormPost from "../pages/AnalyticForm/AnalyticFeedbackFormPost";
import AnalyticFormsList from "../pages/AnalyticForm/AnalyticFormsList";
import ExcelUpload from "../pages/AnalyticForm/ExcelUpload";

const analyticFormRoutes = [
  // Admin routes - for creating and managing forms
  {
    path: "/",
    element: <AnalyticFormsList />,
  },
  {
    path: "/analytic-forms",
    element: <AnalyticFormsList />,
  },
  {
    path: "/analytic-form-upload",
    element: <ExcelUpload />,
  },

  // User routes - for filling forms
  {
    path: "/analytic-form-login/:formId",
    element: <AnalyticFormLogin />,
  },
  {
    path: "/analytic-form/:formId",
    element: <AnalyticFeedbackForm />,
  },
  {
    path: "/analytic-form/:formId/:index/:id",
    element: <AnalyticFeedbackFormPost />,
  },
];

export default analyticFormRoutes;
