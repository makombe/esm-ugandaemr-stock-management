import { ClickableTile, Search } from '@carbon/react';
import { useDebounce } from '@openmrs/esm-framework';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type StockItemDTO } from '../../../core/api/types/stockItem/StockItem';
import { useFilterableStockItems } from '../hooks/useFilterableStockItems';
import styles from './input-components-styles.scss';

/**
 * generic — show formulary name only (requisition, prescription).
 * brand   — show full drug name including brand (receipt, issue, dispensing).
 */
export type DisplayMode = 'generic' | 'brand';

type StockItemSearchProps = {
  onSelectedItem?: (stockItem: StockItemDTO) => void;
  displayMode?: DisplayMode;
};

const StockItemSearch: React.FC<StockItemSearchProps> = ({ onSelectedItem, displayMode = 'brand' }) => {
  const { t } = useTranslation();
  const isGenericMode = displayMode === 'generic';

  const { isLoading, stockItemsList, setSearchString } = useFilterableStockItems({
    ...(isGenericMode ? { groupByFormulary: true } : {}),
  });

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm);

  /**
   * Resolves what to show in the dropdown tile.
   *
   * Generic mode:  "Paracetamol 500 mg Oral Tablet"
   *                Falls back through displayName → split drugName → commonName.
   *
   * Brand mode:    "Paracetamol 500 mg Oral Tablet - Panadol (PH3514)"
   *                Same as the original behaviour.
   */
  const getDisplayLabel = useCallback(
    (item: StockItemDTO): string => {
      const etcd = item.etcdProductId ? ` (${item.etcdProductId})` : '';

      if (isGenericMode) {
        if (item.displayName) {
          return `${item.displayName}${etcd}`;
        }
        if (item.drugName) {
          const sep = item.drugName.indexOf(' - ');
          const formulary = sep > -1 ? item.drugName.substring(0, sep).trim() : item.drugName;
          return `${formulary}${etcd}`;
        }
        if (item.commonName) {
          return `${item.commonName}${etcd}`;
        }
        return t('noNameAvailable', 'No name available');
      }

      // Brand mode — original behaviour
      const name = item.drugName ?? item.commonName ?? t('noNameAvailable', 'No name available');
      return `${name}${etcd}`;
    },
    [isGenericMode, t],
  );

  useEffect(() => {
    if (debouncedSearchTerm?.length !== 0) {
      setSearchString(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, setSearchString]);

  const handleOnSearchResultClick = (stockItem: StockItemDTO) => {
    onSelectedItem?.(stockItem);
    setSearchTerm('');
  };

  return (
    <div className={styles.stockItemSearchContainer}>
      <div style={{ display: 'flex' }}>
        <Search
          size="lg"
          placeholder={t('findItems', 'Find your items')}
          labelText={t('search', 'Search')}
          closeButtonLabelText={t('clearSearch', 'Clear search input')}
          value={searchTerm}
          id="search-stock-operation-item"
          name="search-stock-operation-item"
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      {searchTerm && stockItemsList?.length > 0 && (
        <div className={styles.searchResults}>
          {stockItemsList?.slice(0, 5).map((stockItem) => (
            <ClickableTile onClick={() => handleOnSearchResultClick(stockItem)} key={stockItem?.uuid}>
              {getDisplayLabel(stockItem)}
            </ClickableTile>
          ))}
        </div>
      )}
    </div>
  );
};

export default StockItemSearch;
