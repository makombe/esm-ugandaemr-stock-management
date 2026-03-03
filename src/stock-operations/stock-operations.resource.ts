import { type FetchResponse, openmrsFetch, restBaseUrl, showSnackbar } from '@openmrs/esm-framework';
import { useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { type ResourceFilterCriteria, toQueryParams } from '../core/api/api';
import { type PageableResult } from '../core/api/types/PageableResult';
import { type InventoryGroupBy } from '../core/api/types/stockItem/StockItem';
import { type StockItemInventory } from '../core/api/types/stockItem/StockItemInventory';
import {
  type ExternalRequisitionPayload,
  type StopOperationAction,
} from '../core/api/types/stockOperation/StockOperationAction';
import { type StockOperationDTO } from '../core/api/types/stockOperation/StockOperationDTO';
import { type StockOperationItemCost } from '../core/api/types/stockOperation/StockOperationItemCost';
import { type StockOperationItemDtoSchema } from './validation-schema';
import { useTranslation } from 'react-i18next';

export interface StockOperationFilter extends ResourceFilterCriteria {
  status?: string | null | undefined;
  operationTypeUuid?: string | null | undefined;
  locationUuid?: string | null | undefined;
  isLocationOther?: boolean | null | undefined;
  stockItemUuid?: string | null | undefined;
  operationDateMin?: string | null | undefined;
  operationDateMax?: string | null | undefined;
  sourceTypeUuid?: string | null | undefined;
}

export interface StockItemInventoryFilter extends ResourceFilterCriteria {
  stockItemUuid?: string | null;
  partyUuid?: string | null;
  locationUuid?: string | null;
  includeBatchNo?: boolean | null;
  stockBatchUuid?: string | null;
  groupBy?: InventoryGroupBy | null;
  totalBy?: InventoryGroupBy | null;
  stockOperationUuid?: string | null;
  date?: string | null;
  includeStockItemName?: 'true' | 'false' | '0' | '1';
  excludeExpired?: boolean | null;
}

// getStockOperations
export function useStockOperations(filter: StockOperationFilter) {
  const apiUrl = `${restBaseUrl}/stockmanagement/stockoperation${toQueryParams(filter)}`;
  const { data, error, isLoading } = useSWR<{ data: PageableResult<StockOperationDTO> }, Error>(apiUrl, openmrsFetch);

  return {
    items: data?.data || <PageableResult<StockOperationDTO>>{},
    isLoading,
    error,
  };
}

// getStockOperationLinks
export function getStockOperationLinks(filter: string) {
  const apiUrl = `${restBaseUrl}/stockmanagement/stockoperationlink?v=default&q=${filter}`;
  const abortController = new AbortController();

  return openmrsFetch(apiUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: abortController.signal,
  });
}

// getStockOperation

export function useStockOperation(id: string | null) {
  const apiUrl = id ? `${restBaseUrl}/stockmanagement/stockoperation/${id}` : null;
  const { data, error, isLoading } = useSWR<{ data: StockOperationDTO }, Error>(apiUrl, apiUrl ? openmrsFetch : null);
  return {
    items: data?.data,
    isLoading,
    error,
  };
}

// getStockOperation
export function getStockOperation(id: string): Promise<FetchResponse<StockOperationDTO>> {
  if (!id) {
    return;
  }
  const apiUrl = `${restBaseUrl}/stockmanagement/stockoperation/${id}?v=full`;
  return openmrsFetch(apiUrl);
}

// getStockOperationAndItems
export function useStockOperationAndItems(id = '') {
  const apiUrl = `${restBaseUrl}/stockmanagement/stockoperation/${id}?v=full`;
  const { data, error, isLoading } = useSWR<{ data: StockOperationDTO }, Error>(id ? apiUrl : null, openmrsFetch);
  return {
    items: data?.data,
    isLoading,
    error,
  };
}

// deleteStockOperations
export function deleteStockOperations(ids: string[]) {
  let otherIds = ids.reduce((p, c, i) => {
    if (i === 0) return p;
    p += (p.length > 0 ? ',' : '') + encodeURIComponent(c);
    return p;
  }, '');
  if (otherIds.length > 0) {
    otherIds = '?ids=' + otherIds;
  }
  const apiUrl = `${restBaseUrl}/stockmanagement/stockoperation/${ids[0]}${otherIds}`;
  const abortController = new AbortController();
  return openmrsFetch(apiUrl, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: abortController.signal,
  });
}

// deleteStockOperationItem
export function deleteStockOperationItem(id: string) {
  const apiUrl = `${restBaseUrl}/stockmanagement/stockoperationitem/${id}`;
  const abortController = new AbortController();
  return openmrsFetch(apiUrl, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: abortController.signal,
  });
}

// createStockOperation
export function createStockOperation(data: StockOperationItemDtoSchema) {
  const apiUrl = `${restBaseUrl}/stockmanagement/stockoperation`;
  const abortController = new AbortController();
  return openmrsFetch<StockOperationDTO>(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: abortController.signal,
    body: data,
  });
}

// updateStockOperation
export function updateStockOperation(stockOperation: StockOperationDTO, data: StockOperationItemDtoSchema) {
  const apiUrl = `${restBaseUrl}/stockmanagement/stockoperation/${stockOperation.uuid}`;
  const abortController = new AbortController();
  return openmrsFetch<StockOperationDTO>(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: abortController.signal,
    body: data,
  });
}

// executeStockOperationAction
export function executeStockOperationAction(item: StopOperationAction) {
  const apiUrl = `${restBaseUrl}/stockmanagement/stockoperationaction`;
  const abortController = new AbortController();
  return openmrsFetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: abortController.signal,
    body: item,
  });
}

export function useFacilityCode() {
  const apiUrl = `${restBaseUrl}/kenyaemr/facility-registry-code`;
  const { data, isLoading, error } = useSWR(apiUrl, async (_) => {
    const res = await openmrsFetch(apiUrl);
    const facilityCode = await res.text();
    return facilityCode;
  });

  return {
    facilityCode: data,
    isLoading,
    error,
  };
}

export interface StatusResponse {
  status: 'FAIL' | 'SUCCESS';
  statusCode: number;
  message?: string;
  data?: StatusResponseData;
}

export interface StatusResponseData {
  sourceSystem: string;
  submissionStatus: string;
  requisition: {
    sourceOrderId: string;
    rnrId: any;
    status: 'RELEASED' | string;
    submissionStatus?: string; // For Failed
    approvalDate: any;
    supplier: { code: string; name: string };
    items: Array<{
      productCode: string;
      genericConceptCode: string;
      uom: string;
      quantityRequested: number;
      quantityApproved: number;
    }>;
    errorMessage: string; // For Failed
  };
}

export type LocalStatusResponse = {
  uuid: string;
  message: string;
  status: string;
  source: string;
  dateCreated: string;
  dateUpdated: string;
  operationNumber: null;
};

export function useExternalRequisitionStation(operationNumber: string, operationUuid: string) {
  const { t } = useTranslation();
  // 1. Fetch Local Status
  const localStatusUrl = `${restBaseUrl}/stockmanagement/externalrequisitionstatus/${operationUuid}`;
  const {
    data: localData,
    isLoading: isLoadingLocal,
    error: localError,
    mutate: mutateLocalStatus,
  } = useSWR<FetchResponse<LocalStatusResponse>>(localStatusUrl, async (url) => {
    try {
      const res = await openmrsFetch<LocalStatusResponse>(url);
      return res;
    } catch (err) {
      return null;
    }
  });
  const localStatus = useMemo(() => {
    const data = localData?.data?.message ? JSON.parse(localData?.data?.message) : undefined;
    return data as StatusResponse | undefined;
  }, [localData]);
  const { error: facilityCodeError, facilityCode, isLoading: isloadingFacilityCode } = useFacilityCode();
  // 2. Determine if we need to hit the remote NLMIS API
  const shouldFetchRemote = useMemo(() => {
    if (isLoadingLocal || isloadingFacilityCode || !facilityCode) return false;

    // Fetch if no local data exists, or if the local record indicates it's not finished
    if (!localStatus) return true;
    if (localStatus?.status === 'FAIL') return true;
    if (localStatus?.data?.requisition?.status !== 'RELEASED') return true;

    return false;
  }, [facilityCode, isLoadingLocal, isloadingFacilityCode, localStatus]);

  const remoteUrl = `${restBaseUrl}/kenyaemr/nlmis/requisition-status?sourceOrderId=${operationNumber}&facilityCode=${facilityCode}`;
  const {
    data: remoteData,
    error: remoteError,
    isLoading: isLoadingRemote,
  } = useSWR<FetchResponse<StatusResponse>>(shouldFetchRemote ? remoteUrl : null, openmrsFetch);

  // 3. The effective status: Remote data takes priority if it exists
  const status = useMemo(() => remoteData?.data ?? localStatus, [remoteData, localStatus]);

  // 4. Syncing Effect
  useEffect(() => {
    const remoteStatus = remoteData?.data;

    // Logic: Sync if we have new remote data that differs from our local record
    const hasNewData =
      remoteStatus &&
      (!localStatus ||
        remoteStatus.data?.requisition?.submissionStatus !== localStatus.data?.requisition?.submissionStatus);
    if (hasNewData) {
      const status = remoteData?.data?.data?.requisition?.status ?? remoteData?.data.status;
      openmrsFetch(`${restBaseUrl}/stockmanagement/externalrequisitionstatus`, {
        method: 'POST',
        body: {
          uuid: operationUuid,
          message: JSON.stringify(remoteStatus),
          status,
          source: remoteStatus.data?.sourceSystem,
          operationNumber,
        },
        headers: { 'Content-Type': 'application/json' },
      })
        .then(() => {
          // Force SWR to re-fetch local data so isLoadingLocal becomes true/false correctly
          mutateLocalStatus();
          showSnackbar({
            title: t('syncComplete', 'Status Sync Complete'),
            kind: 'success',
            subtitle: t('syncWasSuccessful', 'Status Sync was successful'),
          });
        })
        .catch((err) => {
          showSnackbar({
            title: t('syncError', 'Sync Error'),
            kind: 'error',
            subtitle: err?.message,
          });
        });
    }
  }, [remoteData, localStatus, operationUuid, t, localStatusUrl, mutateLocalStatus, operationNumber]);

  return {
    isLoading: isLoadingRemote || isloadingFacilityCode || isLoadingLocal,
    error: remoteError ?? facilityCodeError ?? localError,
    status,
  };
}

export const useProgramCode = () => {
  const url = `${restBaseUrl}/kenyaemr/nlmis/programs`;
  const { data, error, isLoading } = useSWR<FetchResponse<Array<{ id: string; code?: string }>>>(url, openmrsFetch);
  return {
    isLoading,
    error,
    programCode: data?.data?.[0]?.code,
  };
};

export const useProcessingPeriod = () => {
  const url = `${restBaseUrl}/kenyaemr/nlmis/processing-periods`;
  const { data, error, isLoading } = useSWR<FetchResponse<{ content: Array<{ id: string }> }>>(url, openmrsFetch);
  return {
    isLoading,
    error,
    processingPeriod: data?.data?.content?.[0]?.id,
  };
};

export const useProgramCodeAndProcessingPeriod = () => {
  const { error: programError, isLoading: isLoadingProgramCode, programCode } = useProgramCode();
  const { error: periodError, isLoading: isLoadingPeriod, processingPeriod } = useProcessingPeriod();
  return {
    isLoading: isLoadingPeriod || isLoadingProgramCode,
    error: periodError ?? programError,
    processingPeriod,
    programCode: 'ess',
  };
};
export function submitExternalRequisition(payload: ExternalRequisitionPayload) {
  const apiUrl = `${restBaseUrl}/kenyaemr/hmis-requisition/submit`;
  const abortController = new AbortController();
  return openmrsFetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: abortController.signal,
    body: payload,
  });
}

// updateStockOperationBatchNumbers
export function updateStockOperationBatchNumbers(item: StockOperationDTO, uuid: string) {
  const apiUrl = `${restBaseUrl}/stockmanagement/stockoperationbatchnumbers/${uuid}`;
  const abortController = new AbortController();
  return openmrsFetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: abortController.signal,
    body: item,
  });
}

// get stock operation itemcosts
export function getStockOperationItemsCost(filter: StockOperationFilter) {
  const apiUrl = `${restBaseUrl}/stockmanagement/stockoperationitemcost?v=default&stockOperationUuid=${filter}`;
  const abortController = new AbortController();
  return openmrsFetch<{ results: Array<StockOperationItemCost> }>(apiUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: abortController.signal,
  });
}
// get stockiteminvoentory
export function getStockItemInventory(filter: StockItemInventoryFilter) {
  const apiUrl = `${restBaseUrl}/stockmanagement/stockiteminventory${toQueryParams(filter)}&v=default`;
  const abortController = new AbortController();
  return openmrsFetch<{ results: Array<StockItemInventory> }>(apiUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: abortController.signal,
  });
}

export const operationStatusColor = (status: string) => {
  switch (status) {
    case 'NEW':
      return '#0f62fe';
    case 'SUBMITTED':
      return '#4589ff';
    case 'DISPATCHED':
      return '#8a3ffc';
    case 'COMPLETED':
      return '#24a148';
    case 'CANCELLED':
      return '#da1e28';
    case 'RETURNED':
      return '#eb6200';
    default:
      break;
  }
};
