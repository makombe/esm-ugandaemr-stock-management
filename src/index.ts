import { getAsyncLifecycle, defineConfigSchema } from "@openmrs/esm-framework";
import { configSchema } from "./config-schema";

const moduleName = "@openmrs/esm-stock-management-app";

const options = {
  featureName: "stock-management",
  moduleName,
};

export const importTranslation = require.context(
  "../translations",
  false,
  /.json$/,
  "lazy"
);

export const stockManagementLink = getAsyncLifecycle(
  () => import("./stock-management-link.component"),
  options
);

export const stockManagement = getAsyncLifecycle(
  () => import("./stock-management.component"),
  options
);

export const stockManagementDashboard = getAsyncLifecycle(
  () => import("./dashboard/stock-management-dashboard.component"),
  options
);

export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
}
