import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWR from 'swr';
import { type ResourceFilterCriteria, toQueryParams } from '../core/api/api';
import { type PageableResult } from '../core/api/types/PageableResult';
import { type StockBatchDTO } from '../core/api/types/stockItem/StockBatchDTO';
import { type InventoryGroupBy, type StockItemDTO } from '../core/api/types/stockItem/StockItem';
import { type StockItemInventory } from '../core/api/types/stockItem/StockItemInventory';
import { type StockItemPackagingUOMDTO } from '../core/api/types/stockItem/StockItemPackagingUOM';
import { type StockItemReference, type StockItemReferenceDTO } from '../core/api/types/stockItem/StockItemReference';
import { type StockItemTransactionDTO } from '../core/api/types/stockItem/StockItemTransaction';
import { type StockRule } from '../core/api/types/stockItem/StockRule';
import { type StockOperationItemCost } from '../core/api/types/stockOperation/StockOperationItemCost';
import { stockItemDetailsSchema, type StockItemFormData } from './validationSchema';

export interface StockItemFilter extends ResourceFilterCriteria {
  /**
   * New canonical type filter sent to the REST API.
   * Accepted values: "PHARMACEUTICAL" | "NON_PHARMACEUTICAL" | "LAB_COMMODITY"
   * Omit (or pass undefined) to return all types.
   */
  itemType?: string | null | undefined;

  /**
   * @deprecated Use {@link itemType} instead.
   * Kept in the interface so that any code that constructs a StockItemFilter
   * with isDrug does not get a TypeScript error during the migration period.
   * The field is stripped from the payload before it reaches the API.
   */
  isDrug?: string | null | undefined;

  drugUuid?: string | null;
  conceptUuid?: string | null;
  groupByFormulary?: boolean | null;
}

export interface StockItemTransactionFilter extends ResourceFilterCriteria {
  stockItemUuid?: string | null;
  partyUuid?: string | null;
  stockOperationUuid?: string | null;
  includeBatchNo?: boolean | null;
  dateMin?: string | null;
  dateMax?: string | null;
  stockBatchUuid?: string | null | undefined;
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
  isPatientTransaction?: 'true' | 'false';
}

export interface StockItemPackagingUOMFilter extends ResourceFilterCriteria {
  stockItemUuid?: string | null | undefined;
}

export interface StockItemReferenceFilter extends ResourceFilterCriteria {
  stockItemUuid?: string | null | undefined;
}

export interface StockBatchFilter extends ResourceFilterCriteria {
  stockItemUuid?: string | null | undefined;
  excludeExpired?: boolean | null;
  includeStockItemName?: 'true' | 'false' | '0' | '1';
}

export interface StockInventoryResult extends PageableResult<StockItemInventory> {
  total: StockItemInventory[];
}

export interface StockRuleFilter extends ResourceFilterCriteria {
  stockItemUuid?: string | null;
  locationUuid?: string | null;
}

// getStockItems
export function useStockItems(filter: StockItemFilter) {
  /**
   * Strip the legacy isDrug field before building the query string so
   * we never accidentally send both isDrug and itemType to the API.
   * The itemType field is the only one the updated server understands.
   */
  const { isDrug: _ignored, groupByFormulary, ...cleanFilter } = filter;
  const apiUrl =
    `${restBaseUrl}/stockmanagement/stockitem${toQueryParams(cleanFilter)}` +
    (groupByFormulary ? '&groupByFormulary=true' : '');

  const { data, error, isLoading } = useSWR<{ data: PageableResult<StockItemDTO> }, Error>(apiUrl, openmrsFetch);

  return {
    items: data?.data || ({} as PageableResult<StockItemDTO>),
    isLoading,
    error,
  };
}

// fetch filtered stock item
export function fetchStockItem(drugUuid: string) {
  const apiUrl = `${restBaseUrl}/stockmanagement/stockitem?drugUuid=${drugUuid}&limit=1`;
  return openmrsFetch(apiUrl).then(({ data }) => data);
}

// getStockItemTransactions
export function useStockItemTransactions(filter: StockItemTransactionFilter) {
  const apiUrl = `${restBaseUrl}/stockmanagement/stockitemtransaction${toQueryParams(filter)}`;
  const { data, error, isLoading } = useSWR<{ data: PageableResult<StockItemTransactionDTO> }, Error>(
    apiUrl,
    openmrsFetch,
  );

  return {
    items: data?.data || ({} as PageableResult<StockItemTransactionDTO>),
    isLoading,
    error,
  };
}

// getStockItemInventory
export function useStockItemInventory(filter: StockItemInventoryFilter) {
  const apiUrl = `${restBaseUrl}/stockmanagement/stockiteminventory${toQueryParams(filter)}`;
  const { data, error, isLoading } = useSWR<{ data: StockInventoryResult }, Error>(apiUrl, openmrsFetch);

  return {
    items: data?.data || ({} as StockInventoryResult),
    isLoading,
    error,
  };
}

// getStockOperationItemsCost
export function useStockOperationItemsCost(filter: string) {
  const apiUrl = `${restBaseUrl}/stockmanagement/stockoperationitemcost?v=default&stockOperationUuid=${filter}`;
  const { data, error, isLoading } = useSWR<{ data: PageableResult<StockOperationItemCost> }, Error>(
    apiUrl,
    openmrsFetch,
  );
  return {
    items: data?.data ? data.data : [],
    isLoading,
    error,
  };
}

// getStockBatches
export function useStockBatches(filter: StockBatchFilter) {
  const apiUrl = `${restBaseUrl}/stockmanagement/stockbatch${toQueryParams(filter)}`;
  const { data, error, isLoading } = useSWR<{ data: PageableResult<StockBatchDTO> }, Error>(apiUrl, openmrsFetch);
  return {
    items: data?.data || ({} as PageableResult<StockBatchDTO>),
    isLoading,
    error,
  };
}

// getStockItemPackagingUOMs
export function useStockItemPackagingUOMs(filter: StockItemPackagingUOMFilter) {
  const apiUrl = `${restBaseUrl}/stockmanagement/stockitempackaginguom${toQueryParams(filter)}`;
  const { data, error, isLoading, mutate } = useSWR<{ data: PageableResult<StockItemPackagingUOMDTO> }, Error>(
    apiUrl,
    openmrsFetch,
  );

  return {
    items: data?.data || ({} as PageableResult<StockItemPackagingUOMDTO>),
    isLoading,
    error,
    mutate,
  };
}

// getStockItem
export function useStockItem(id: string) {
  const apiUrl = `${restBaseUrl}/stockmanagement/stockitem/${id}?v=full`;
  const { data, error, isLoading } = useSWR<{ data: StockItemDTO }, Error>(apiUrl, openmrsFetch);
  return {
    item: data?.data || ({} as StockItemDTO),
    isLoading,
    error,
  };
}

// deleteStockItems
export function deleteStockItems(ids: string[]) {
  let otherIds = ids.reduce((p, c, i) => {
    if (i === 0) return p;
    p += (p.length > 0 ? ',' : '') + encodeURIComponent(c);
    return p;
  }, '');
  if (otherIds.length > 0) {
    otherIds = '?ids=' + otherIds;
  }

  const apiUrl = `${restBaseUrl}/stockmanagement/stockitem/${ids[0]}${otherIds}`;
  const abortController = new AbortController();

  return openmrsFetch(apiUrl, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    signal: abortController.signal,
  });
}

// deleteStockItemPackagingUnit
export function deleteStockItemPackagingUnit(id: string) {
  const apiUrl = `${restBaseUrl}/stockmanagement/stockitempackaginguom/${id}`;
  const abortController = new AbortController();

  return openmrsFetch(apiUrl, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    signal: abortController.signal,
  });
}

/* Shared helper – strips form-only fields that must not reach the API.

Fields removed:
  isDrug       – legacy boolean, replaced by itemType on the server.
                 The server still accepts isDrug for backward compat but
                 we let itemType be the sole driver from the frontend.
  dateCreated  – read-only audit field; rejected by the server on POST.

itemType IS kept in the payload – the server now reads it as the
canonical type discriminator. */

function buildApiPayload(item: StockItemFormData): Omit<StockItemFormData, 'isDrug' | 'dateCreated'> {
  const { isDrug: _isDrug, dateCreated: _dateCreated, ...payload } = item;
  return payload;
}

// createStockItem
export function createStockItem(item: StockItemFormData) {
  const apiUrl = `${restBaseUrl}/stockmanagement/stockitem`;
  const abortController = new AbortController();

  return openmrsFetch<StockItemDTO>(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: abortController.signal,
    // CHANGED: use shared helper that strips isDrug and keeps itemType
    body: buildApiPayload(item),
  });
}

// updateStockItem
export function updateStockItem(stockItemUuid: string, item: StockItemFormData) {
  const apiUrl = `${restBaseUrl}/stockmanagement/stockitem/${stockItemUuid}`;
  const abortController = new AbortController();

  return openmrsFetch<StockItemDTO>(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: abortController.signal,
    // CHANGED: use shared helper that strips isDrug and dateCreated, keeps itemType
    body: buildApiPayload(item),
  });
}

// createStockItemPackagingUnit
export function createStockItemPackagingUnit(item: StockItemPackagingUOMDTO) {
  const apiUrl = `${restBaseUrl}/stockmanagement/stockitempackaginguom`;
  const abortController = new AbortController();

  return openmrsFetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: abortController.signal,
    body: item,
  });
}

// updateStockItemPackagingUnit
export function updateStockItemPackagingUnit(item: StockItemPackagingUOMDTO, uuid: string) {
  const apiUrl = `${restBaseUrl}/stockmanagement/stockitempackaginguom/${uuid}`;
  const abortController = new AbortController();

  return openmrsFetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: abortController.signal,
    body: item,
  });
}

// importStockItem
export function importStockItem(item: FormData) {
  const apiUrl = `${restBaseUrl}/stockmanagement/stockitemimport`;
  const abortController = new AbortController();

  return openmrsFetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: abortController.signal,
    body: item,
  });
}

// Stock rules

export function useStockRules(filter: StockRuleFilter) {
  const apiUrl = `${restBaseUrl}/stockmanagement/stockrule${toQueryParams(filter)}`;
  const { data, error, isLoading } = useSWR<{ data: PageableResult<StockRule> }, Error>(apiUrl, openmrsFetch);

  return {
    items: data?.data || ({} as PageableResult<StockRule>),
    isLoading,
    error,
  };
}

export function createStockRule(item: StockRule) {
  const apiUrl = `${restBaseUrl}/stockmanagement/stockrule`;
  const abortController = new AbortController();

  return openmrsFetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: abortController.signal,
    body: item,
  });
}

export function updateStockRule(item: StockRule, uuid: string) {
  const apiUrl = `${restBaseUrl}/stockmanagement/stockrule/${uuid}`;
  const abortController = new AbortController();

  return openmrsFetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: abortController.signal,
    body: item,
  });
}

export function deleteStockRule(id: string) {
  const apiUrl = `${restBaseUrl}/stockmanagement/stockrule/${id}`;
  const abortController = new AbortController();

  return openmrsFetch(apiUrl, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    signal: abortController.signal,
  });
}

// Stock item references

export function useStockItemReferences(filter: StockItemReferenceFilter) {
  const apiUrl = `${restBaseUrl}/stockmanagement/stockitemreference${toQueryParams(filter)}`;
  const { data, error, isLoading } = useSWR<{ data: PageableResult<StockItemReferenceDTO> }, Error>(
    apiUrl,
    openmrsFetch,
  );

  return {
    items: data?.data || ({} as PageableResult<StockItemReferenceDTO>),
    isLoading,
    error,
  };
}

export function createStockItemReference(item: StockItemReferenceDTO) {
  const apiUrl = `${restBaseUrl}/stockmanagement/stockitemreference`;
  const abortController = new AbortController();

  return openmrsFetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: abortController.signal,
    body: item,
  });
}

export function updateStockItemReference(item: StockItemReference, uuid: string) {
  const apiUrl = `${restBaseUrl}/stockmanagement/stockitemreference/${uuid}`;
  const abortController = new AbortController();

  return openmrsFetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: abortController.signal,
    body: item,
  });
}

export function deleteStockItemReference(id: string) {
  const apiUrl = `${restBaseUrl}/stockmanagement/stockitemreference/${id}`;
  const abortController = new AbortController();

  return openmrsFetch(apiUrl, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    signal: abortController.signal,
  });
}
