/**
 * Main Router Configuration
 *
 * Combines all route configurations for the Clevo Analytics Form application.
 */

import { createBrowserRouter, ScrollRestoration } from "react-router-dom";
import analyticFormRoutes from "./analyticFormRoutes";

// Main router configuration
const router = createBrowserRouter([
  ...analyticFormRoutes,
]);

export default router;
