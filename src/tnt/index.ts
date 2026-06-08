import { getAsyncLifecycle } from '@openmrs/esm-framework';

const options = {
  featureName: 'stock-management',
  moduleName: '@kenyaemr/esm-stock-management-app',
};

export const tntRoot = getAsyncLifecycle(() => import('./track-and-trace.component'), options);
