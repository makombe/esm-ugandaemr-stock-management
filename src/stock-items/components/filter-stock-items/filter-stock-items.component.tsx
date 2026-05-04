import React from 'react';
import { RadioButton, RadioButtonGroup } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import styles from './filter-stock-items.scss';
import { StockItemType } from '../../add-stock-item/stock-item-details/stock-item-details.resource';

interface FilterStockItemsProps {
  /** The currently active item-type filter. Empty string means "All". */
  filterType: string;
  /** Called with the new filter value when the user changes the selection. */
  changeFilterType: React.Dispatch<React.SetStateAction<string>>;
}

const FilterStockItems: React.FC<FilterStockItemsProps> = ({ filterType, changeFilterType }) => {
  const { t } = useTranslation();

  return (
    <RadioButtonGroup
      name="item-type-filter"
      defaultSelected={filterType}
      onChange={changeFilterType}
      className={styles.spacing}
    >
      {/* Empty string = no filter → show all types */}
      <RadioButton labelText={t('all', 'All')} value="" id="item-type-all" />

      {/* PHARMACEUTICAL – formerly isDrug=true */}
      <RadioButton
        labelText={t('pharmaceuticals', 'Pharmaceuticals')}
        value={StockItemType.PHARMACEUTICAL}
        id="item-type-pharmaceutical"
      />

      {/* NON_PHARMACEUTICAL – formerly isDrug=false */}
      <RadioButton
        labelText={t('nonPharmaceuticals', 'Non Pharmaceuticals')}
        value={StockItemType.NON_PHARMACEUTICAL}
        id="item-type-non-pharmaceutical"
      />

      {/* LAB_COMMODITY – new third type */}
      <RadioButton
        labelText={t('labCommodities', 'Lab Commodities')}
        value={StockItemType.LAB_COMMODITY}
        id="item-type-lab-commodity"
      />
      {/* OTHER – new fourth type */}
      <RadioButton labelText={t('other', 'Other')} value={StockItemType.OTHER} id="item-type-other" />
    </RadioButtonGroup>
  );
};

export default FilterStockItems;
