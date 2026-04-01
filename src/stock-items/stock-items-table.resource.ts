import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePagination } from '@openmrs/esm-framework';
import { type StockItemFilter, useStockItems } from './stock-items.resource';
import { ResourceRepresentation } from '../core/api/api';

export function useStockItemsPages(v?: ResourceRepresentation) {
  const { t } = useTranslation();
  const pageSizes = [10, 20, 30, 40, 50];
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setPageSize] = useState(10);
  const [searchString, setSearchString] = useState(null);

  // ------------------------------------------------------------------
  // CHANGED: itemType replaces the legacy isDrug boolean string.
  // Values: "" (all) | "PHARMACEUTICAL" | "NON_PHARMACEUTICAL" | "LAB_COMMODITY"
  // Empty string means no filter – all item types are returned.
  // ------------------------------------------------------------------
  const [itemType, setItemTypeState] = useState('');

  const [stockItemFilter, setStockItemFilter] = useState<StockItemFilter>({
    startIndex: currentPage - 1,
    v: v || ResourceRepresentation.Default,
    limit: currentPageSize,
    q: null,
    totalCount: true,
  });

  const { items, isLoading, error } = useStockItems(stockItemFilter);
  const pagination = usePagination(items.results, currentPageSize);

  useEffect(() => {
    setStockItemFilter({
      startIndex: currentPage - 1,
      v: ResourceRepresentation.Default,
      limit: currentPageSize,
      q: searchString,
      totalCount: true,
      // CHANGED: send itemType to the API instead of isDrug.
      // An empty string means "no filter" so we pass undefined in that case
      // to avoid sending an empty query parameter.
      itemType: itemType || undefined,
    });
  }, [searchString, currentPage, currentPageSize, itemType]);

  return {
    items: pagination.results,
    pagination,
    totalCount: items.totalCount,
    currentPageSize,
    currentPage,
    setCurrentPage,
    setPageSize,
    pageSizes,
    isLoading,
    error,
    // CHANGED: expose itemType / setItemType instead of isDrug / setDrug
    itemType,
    setItemType: (type: string) => {
      // Reset to page 1 whenever the filter changes so the user always
      // sees results from the beginning of the filtered set
      setCurrentPage(1);
      setItemTypeState(type);
    },
    setSearchString,
  };
}
