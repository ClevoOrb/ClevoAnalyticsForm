/**
 * Analytics Form Routes
 *
 * Routes for the dynamic analytics form feature.
 * These forms are created from uploaded Excel files and stored in Supabase.
 *
 * Protected Routes:
 * - /af and /afu require an access code
 * - Access codes are stored in the 'access_code' table in Supabase
 * - Once verified, the access is stored in localStorage
 */

import AnalyticFormLogin from "../pages/AnalyticForm/AnalyticFormLogin";
import AnalyticFeedbackForm from "../pages/AnalyticForm/AnalyticFeedbackForm";
import AnalyticFeedbackFormPost from "../pages/AnalyticForm/AnalyticFeedbackFormPost";
import AnalyticFormsList from "../pages/AnalyticForm/AnalyticFormsList";
import ExcelUpload from "../pages/AnalyticForm/ExcelUpload";
import AccessCodeGuard from "../common/AccessCodeGuard";

const analyticFormRoutes = [
  {
    path: "/af",
    // Wrapped with AccessCodeGuard - requires access code to view
    element: (
      <AccessCodeGuard>
        <AnalyticFormsList />
      </AccessCodeGuard>
    ),
  },
  {
    path: "/afu",
    // Wrapped with AccessCodeGuard - requires access code to view
    element: (
      <AccessCodeGuard>
        <ExcelUpload />
      </AccessCodeGuard>
    ),
  },

  // User routes - for filling forms
  {
    path: "/afl/:formId",
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
