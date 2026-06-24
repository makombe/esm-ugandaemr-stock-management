import { useMemo } from 'react';
import {
  useIsSessionLocationMainStore,
  useStockOperationTypes,
  useUserRoles,
} from '../../../stock-lookups/stock-lookups.resource';
import {
  EXTERNAL_REQUISITION_UUID,
  REQUISITION_UUID,
  EXTERNAL_RETURN_UUID,
  EXTERNAL_RECALL_UUID,
  INTERNAL_RECALL_UUID,
  INTERNAL_RETURN_UUID,
} from '../../../constants';

const MAINSTORE_ONLY_OPERATION_UUIDS = [EXTERNAL_REQUISITION_UUID, EXTERNAL_RETURN_UUID, EXTERNAL_RECALL_UUID];
const MAINSTORE_EXCLUDED_OPERATION_UUIDS = [REQUISITION_UUID, INTERNAL_RECALL_UUID, INTERNAL_RETURN_UUID];
const useFilteredOperationTypesByRoles = () => {
  const {
    types: { results },
    isLoading: isStockOperationTypesLoading,
    error: stockOperationTypesError,
  } = useStockOperationTypes();
  const {
    error: sessionLocationError,
    isLoading: isLoadingSessionLoacation,
    isMainstore,
  } = useIsSessionLocationMainStore();
  const { userRoles, isLoading: isUserRolesLoading, error: userRolesError } = useUserRoles();

  const operationTypes = useMemo(() => {
    const applicablePrivilegeScopes = userRoles?.operationTypes?.map((p) => p.operationTypeUuid) || [];
    const uniqueApplicablePrivilegeScopes = [...new Set(applicablePrivilegeScopes)];
    const operations = results?.filter((p) => uniqueApplicablePrivilegeScopes.includes(p.uuid)) || [];

    if (isMainstore) {
      return operations.filter((op) => !MAINSTORE_EXCLUDED_OPERATION_UUIDS.includes(op.uuid));
    } else {
      return operations.filter((op) => !MAINSTORE_ONLY_OPERATION_UUIDS.includes(op.uuid));
    }
  }, [results, userRoles, isMainstore]);

  const isLoading = isStockOperationTypesLoading || isUserRolesLoading;
  const error = stockOperationTypesError || userRolesError;

  return {
    operationTypes,
    isLoading: isLoading || isLoadingSessionLoacation,
    error: error ?? sessionLocationError,
  };
};

export default useFilteredOperationTypesByRoles;
