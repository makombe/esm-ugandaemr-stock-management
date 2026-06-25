import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import { type FetchResponse, openmrsFetch, restBaseUrl, showSnackbar, useConfig } from '@openmrs/esm-framework';
import { type ConfigObject } from '../config-schema';
import { type ResourceFilterCriteria, toQueryParams } from '../core/api/api';
import { type PageableResult } from '../core/api/types/PageableResult';
import { type InventoryGroupBy } from '../core/api/types/stockItem/StockItem';
import { type StockItemInventory } from '../core/api/types/stockItem/StockItemInventory';
import {
  type ExternalRequisitionPayload,
  type ReceiptNotePayload,
  type StopOperationAction,
} from '../core/api/types/stockOperation/StockOperationAction';
import { type StockOperationDTO } from '../core/api/types/stockOperation/StockOperationDTO';
import { type StockOperationItemCost } from '../core/api/types/stockOperation/StockOperationItemCost';
import { type StockOperationItemDtoSchema } from './validation-schema';

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

export async function fetchOperationBatchNumbers(operationUuid: string): Promise<BatchNumberItem[]> {
  try {
    const resp = await openmrsFetch<{ uuid: string; batchNumbers: BatchNumberItem[] }>(
      `${restBaseUrl}/stockmanagement/stockoperationbatchnumbers/${operationUuid}`,
    );
    return resp?.data?.batchNumbers ?? [];
  } catch {
    return [];
  }
}

export async function fetchOperationTransactions(operationUuid: string): Promise<StockItemTransactionForRecall[]> {
  try {
    const resp = await openmrsFetch<{ results: StockItemTransactionForRecall[] }>(
      `${restBaseUrl}/stockmanagement/stockitemtransaction?stockOperationUuid=${operationUuid}&v=default`,
    );
    return resp?.data?.results ?? [];
  } catch {
    return [];
  }
}

export enum ExternalRequisitionStatus {
  PR_CREATED = 'PR_CREATED',
  PENDING_MATCH = 'PENDING_MATCH',
  AUTO_MATCHED = 'AUTO_MATCHED',
  PARTIALLY_MATCHED = 'PARTIALLY_MATCHED',
  OVERRIDE = 'OVERRIDE',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  RETURNED = 'RETURNED',
  PO_GENERATED = 'PO_GENERATED',
  SUPPLIED_APPROVED = 'SUPPLIED_APPROVED',
  SUPPLIED_REJECTED = 'SUPPLIED_REJECTED',
  FULFILLED = 'FULFILLED',
  SHIPPED_IN_TRANSIT = 'SHIPPED_IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  FACILITY_POD = 'FACILITY_POD',
  MISSING = 'MISSING',
}

export interface StatusResponse {
  status: 'FAIL' | 'SUCCESS' | 'DELIVERED';
  statusCode: number;
  message?: string;
  data?: StatusResponseData;
}

export interface RequisitionItem {
  productCode: string;
  genericConceptCode: string;
  uom: string;
  quantityRequested: number;
  quantityApproved: number;
  orderId: string;
  supplier?: {
    code: string;
    name: string;
    supplierOrderId: string;
    orderNumber: string;
  };
  status: ExternalRequisitionStatus;
  price?: number;
}

export interface StatusResponseData {
  sourceSystem: string;
  submissionStatus: string;
  hasMissingProducts?: any;
  requisition: {
    sourceOrderId: string;
    rnrId?: string;
    status: ExternalRequisitionStatus;
    approvalDate?: string;
    items: Array<RequisitionItem>;
    errorMessage: string; // For Failed
    missingProducts?: any;
  };
}

export interface BatchNumberItem {
  uuid: string;
  batchNo: string | null;
  sscc: string | null;
  sgtin: string | null;
  sgln: string | null;
}

export interface StockItemTransactionForRecall {
  stockBatchNo: any;
  uuid: string;
  stockBatchUuid: string | null;
  quantity: number;
  packagingUomName: string | null;
}

export type LocalStatusResponse = {
  uuid: string;
  message: string;
  status: string;
  source: string;
  dateCreated: string;
  dateUpdated: string;
  operationNumber: string;
  receiptNumber?: string;
  receiptMessage?: string;
  deliveryStatus?: 'RECEIVED' | 'PENDING' | 'FAILED';
  podNotificationStatus?: 'SUCCESS' | 'FAILED';
};

export const useExternalRequisitionStatusByReceiptNumber = (receiptNumber?: string) => {
  const localStatusUrl = `${restBaseUrl}/stockmanagement/externalrequisitionstatus?receiptNumber=${receiptNumber}`;
  const {
    data: localData,
    isLoading,
    error,
    mutate,
  } = useSWR<FetchResponse<{ results: Array<LocalStatusResponse> }>>(
    receiptNumber ? localStatusUrl : null,
    openmrsFetch,
  );
  const statusRemoteMessages = useMemo<Array<StatusResponse>>(
    () => (localData?.data?.results ?? []).map((d) => JSON.parse(d.message)),
    [localData],
  );

  const supplier = useMemo(
    () =>
      statusRemoteMessages?.find((st) => st?.data?.requisition?.status !== ExternalRequisitionStatus.MISSING)?.data
        ?.requisition?.items?.[0]?.supplier,
    [statusRemoteMessages],
  );

  return {
    status: localData?.data?.results ?? [],
    statusRemoteMessages,
    supplier,
    isLoading,
    error,
    mutate,
  };
};
export function useExternalRequisitionStation(operationNumber: string, operationUuid: string) {
  const { t } = useTranslation();
  const { lastRequisitionStatus } = useConfig<ConfigObject>();
  const isSyncing = useRef(false); // Prevent duplicate concurrent syncs

  // 1. Fetch Local Status
  const localStatusUrl = `${restBaseUrl}/stockmanagement/externalrequisitionstatus/${operationUuid}`;
  const {
    data: localData,
    isLoading: isLoadingLocal,
    error: localError,
    mutate: mutateLocalStatus,
  } = useSWR<FetchResponse<LocalStatusResponse>>(localStatusUrl, openmrsFetch);

  const localStatus = useMemo(() => {
    try {
      return localData?.data?.message ? (JSON.parse(localData.data.message) as StatusResponse) : undefined;
    } catch {
      return undefined;
    }
  }, [localData?.data?.message]);

  const { error: facilityCodeError, facilityCode, isLoading: isloadingFacilityCode } = useFacilityCode();

  // 2. Determine if we need to hit the remote NLMIS API
  const shouldFetchRemote = useMemo(() => {
    if (isLoadingLocal || isloadingFacilityCode || !facilityCode) return false;

    if (!localStatus || localStatus?.status === 'FAIL') return true;
    if (localStatus?.data?.requisition?.status !== lastRequisitionStatus) return true;

    return false;
  }, [facilityCode, isLoadingLocal, isloadingFacilityCode, lastRequisitionStatus, localStatus]);

  const remoteUrl = shouldFetchRemote
    ? `${restBaseUrl}/kenyaemr/nlmis/requisition-status?sourceOrderId=${operationNumber}&facilityCode=${facilityCode}`
    : null;

  const {
    data: remoteData,
    error: remoteError,
    isLoading: isLoadingRemote,
    mutate: mutateRemoteStatus,
  } = useSWR<FetchResponse<StatusResponse>>(remoteUrl, openmrsFetch);

  // 3. The effective status: Remote data takes priority
  const status = useMemo(() => remoteData?.data ?? localStatus, [remoteData, localStatus]);

  // 4. Syncing Effect
  useEffect(() => {
    const remoteStatus = remoteData?.data;
    if (!remoteStatus || isSyncing.current) return;

    // Logic: Sync if remote data differs from local
    const needsSync = !localStatus || remoteStatus.data?.submissionStatus !== localStatus.data?.submissionStatus;

    if (needsSync) {
      isSyncing.current = true;

      const statusValue = remoteStatus.data?.requisition?.status ?? remoteStatus.status;

      openmrsFetch(`${restBaseUrl}/stockmanagement/externalrequisitionstatus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uuid: operationUuid,
          message: JSON.stringify(remoteStatus),
          status: statusValue,
          source: remoteStatus.data?.sourceSystem,
          operationNumber,
        }),
      })
        .then(() => {
          mutateLocalStatus(); // Refresh local to match new state
          showSnackbar({
            title: t('syncComplete', 'Status Sync Complete'),
            kind: 'success',
          });
        })
        .catch((err) => {
          console.error('Sync failed', err);
        })
        .finally(() => {
          isSyncing.current = false;
        });
    }
  }, [remoteData?.data, localStatus, operationUuid, operationNumber, localData?.data?.status, mutateLocalStatus, t]);

  return {
    isLoading: isLoadingRemote || isloadingFacilityCode || isLoadingLocal,
    error: remoteError ?? facilityCodeError ?? localError,
    status,
    receitNumber: localData?.data?.receiptNumber,
    receiptMessage: localData?.data?.receiptMessage,
    deliveryStatus: localData?.data?.deliveryStatus,
    facilityCode,
    mutate: () => {
      mutateLocalStatus();
      mutateRemoteStatus();
    },
  };
}
export const useProgramCode = (enabled = true) => {
  const url = `${restBaseUrl}/kenyaemr/nlmis/programs`;
  const { data, error, isLoading } = useSWR<FetchResponse<Array<{ id: string; code?: string }>>>(
    enabled ? url : null,
    openmrsFetch,
  );
  return {
    isLoading,
    error,
    programCode: data?.data?.[0]?.code,
  };
};

export const useProcessingPeriod = (enabled = true) => {
  const url = `${restBaseUrl}/kenyaemr/nlmis/processing-periods`;
  const { data, error, isLoading } = useSWR<FetchResponse<{ content: Array<{ id: string }> }>>(
    enabled ? url : null,
    openmrsFetch,
  );
  return {
    isLoading,
    error,
    processingPeriod: data?.data?.content?.[0]?.id,
  };
};

export const useProgramCodeAndProcessingPeriod = (enabled = true) => {
  const { error: programError, isLoading: isLoadingProgramCode, programCode } = useProgramCode(enabled);
  const { error: periodError, isLoading: isLoadingPeriod, processingPeriod } = useProcessingPeriod(enabled);
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
  return openmrsFetch<StatusResponse>(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: abortController.signal,
    body: payload,
  });
}

export function submitReceiptNote(payload: ReceiptNotePayload) {
  const apiUrl = `${restBaseUrl}/kenyaemr/nlmis/receiving-pods/submit`;
  const abortController = new AbortController();
  return openmrsFetch<StatusResponse>(apiUrl, {
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
