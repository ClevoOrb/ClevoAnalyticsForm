/**
 * Analytics Form Routes
 *
 * Routes for the dynamic analytics form feature.
 * These forms are created from uploaded Excel files and stored in Supabase.
 *
 * Protected Routes:
 * - /analytic-forms and /analytic-form-upload require an access code
 * - Access codes are stored in the 'access_code' table in Supabase
 * - Once verified, the access is stored in localStorage
 */

import AnalyticFormLogin from "../pages/AnalyticForm/AnalyticFormLogin";
import AnalyticFeedbackForm from "../pages/AnalyticForm/AnalyticFeedbackForm";
import AnalyticFeedbackFormPost from "../pages/AnalyticForm/AnalyticFeedbackFormPost";
import AnalyticFormsList from "../pages/AnalyticForm/AnalyticFormsList";
import ExcelUpload from "../pages/AnalyticForm/ExcelUpload";
import AnalyticsReport from "../pages/AnalyticForm/AnalyticsReport";
import AyurvedaReport from "../pages/AnalyticForm/AyurvedaReport";
import AccessCodeGuard from "../common/AccessCodeGuard";

const analyticFormRoutes = [
  {
    path: "/analytic-forms",
    // Wrapped with AccessCodeGuard - requires access code to view
    element: (
      <AccessCodeGuard>
        <AnalyticFormsList />
      </AccessCodeGuard>
    ),
  },
  {
    path: "/analytic-form-upload",
    // Wrapped with AccessCodeGuard - requires access code to view
    element: (
      <AccessCodeGuard>
        <ExcelUpload />
      </AccessCodeGuard>
    ),
  },

  // User routes - for filling forms
  // URL format: /orgname/formname (e.g., /acme_corp/health_survey)
  {
    path: "/login/:orgName/:formName",
    element: <AnalyticFormLogin />,
  },
  {
    path: "/:orgName/:formName",
    element: <AnalyticFeedbackForm />,
  },
  {
    path: "/:orgName/:formName/:index/:id",
    element: <AnalyticFeedbackFormPost />,
  },
  // Report route - displays health assessment report
  // URL format: /report/orgname/formname/clevoCode
  {
    path: "/report/:orgName/:formName/:clevoCode",
    element: <AnalyticsReport />,
  },
  // Ayurveda Report route - displays Ayurvedic constitution report
  // URL format: /ayurveda-report/orgname/formname/clevoCode
  {
    path: "/ayurveda-report/:orgName/:formName/:clevoCode",
    element: <AyurvedaReport />,
  },
];

export default analyticFormRoutes;
