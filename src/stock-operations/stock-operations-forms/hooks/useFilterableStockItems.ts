import { useEffect, useState } from 'react';
import { type StockItemFilter, useStockItems as useStockItemsData } from '../../../stock-items/stock-items.resource';
import { type UserFilterCriteria } from '../../../stock-lookups/stock-lookups.resource';
import { ResourceRepresentation } from '../../../core/api/api';

export function useFilterableStockItems(filter?: StockItemFilter) {
  const [conceptFilter, setConceptFilter] = useState<StockItemFilter>(
    filter || {
      v: ResourceRepresentation.Default,
      limit: 10,
      startIndex: 0,
    },
  );

  const {
    items: { results: stockItemsList },
    isLoading,
  } = useStockItemsData(conceptFilter);

  const [searchString, setSearchString] = useState(null);
  const [limit, setLimit] = useState(filter?.limit || 10);
  const [representation, setRepresentation] = useState(filter?.v || ResourceRepresentation.Default);

  const [groupByFormulary] = useState<boolean>(filter?.groupByFormulary ?? false);
  useEffect(() => {
    setConceptFilter({
      startIndex: 0,
      v: representation,
      limit: limit,
      q: searchString,
      ...(groupByFormulary ? { groupByFormulary: true } : {}),
    });
  }, [searchString, limit, representation, groupByFormulary]);

  return {
    stockItemsList,
    setLimit,
    setRepresentation,
    setSearchString,
    isLoading,
  };
}
