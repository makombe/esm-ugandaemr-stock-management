import { InlineLoading } from '@carbon/react';
import { ConfigurableLink, showSnackbar, useConfig } from '@openmrs/esm-framework';
import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { type ConfigObject } from '../../../config-schema';
import { URL_STOCK_ITEM } from '../../../constants';
import { useStockItem } from '../../../stock-items/stock-items.resource';
import { type DisplayMode } from '../input-components/stock-item-search.component';

type StockOperationItemCellProps = {
  stockItemUuid: string;
  displayMode?: DisplayMode;
};

const StockOperationItemCell: React.FC<StockOperationItemCellProps> = ({ stockItemUuid, displayMode = 'brand' }) => {
  const { isLoading, error, item } = useStockItem(stockItemUuid);
  const { t } = useTranslation();
  const { useItemCommonNameAsDisplay } = useConfig<ConfigObject>();
  const isGenericMode = displayMode === 'generic';

  const commonName = useMemo(() => {
    if (!useItemCommonNameAsDisplay) return;
    const drugName = item?.drugName ? `(Drug name: ${item.drugName})` : undefined;
    return `${item?.commonName || t('noCommonNameAvailable', 'No common name available') + (drugName ?? '')}`;
  }, [item, useItemCommonNameAsDisplay, t]);

  const drugName = useMemo(() => {
    if (useItemCommonNameAsDisplay) return;
    const commonName = item?.commonName ? `(Common name: ${item.commonName})` : undefined;
    return `${item?.drugName || t('noDrugNameAvailable', 'No drug name available') + (commonName ?? '')}`;
  }, [item, useItemCommonNameAsDisplay, t]);

  const genericName = useMemo(() => {
    if ((item as any)?.displayName) {
      return (item as any).displayName;
    }
    if (item?.drugName) {
      const sep = item.drugName.indexOf(' - ');
      return sep > -1 ? item.drugName.substring(0, sep).trim() : item.drugName;
    }
    if (item?.commonName) {
      return item.commonName;
    }
    return t('noNameAvailable', 'No name available');
  }, [item, t]);

  useEffect(() => {
    if (error) {
      showSnackbar({
        kind: 'error',
        title: t('stockItemError', 'Error loading stock item'),
        subtitle: error?.message,
      });
    }
  }, [error, t]);

  if (isLoading) return <InlineLoading status="active" iconDescription="Loading" />;
  if (error) return <>--</>;

  const label = isGenericMode ? genericName : useItemCommonNameAsDisplay ? commonName : drugName;

  return (
    <ConfigurableLink target={'_blank'} to={window.spaBase + URL_STOCK_ITEM(stockItemUuid)}>
      {label}
    </ConfigurableLink>
  );
};

export default StockOperationItemCell;
