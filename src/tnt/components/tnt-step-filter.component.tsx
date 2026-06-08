import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MultiSelect } from '@carbon/react';

const TntStepFilter = () => {
  const { t } = useTranslation();

  const bizStepOptions = useMemo(
    () => [
      { value: 'Receiving', label: t('receiving', 'Receiving') },
      { value: 'Shipping', label: t('shipping', 'Shipping') },
      { value: 'Inspecting', label: t('inspecting', 'Inspecting') },
      { value: 'Inventory Taking', label: t('inventoryTaking', 'Inventory Taking') },
      { value: 'Unpacking', label: t('unpacking', 'Unpacking') },
      { value: 'Decommissioning', label: t('decommissioning', 'Decommissioning') },
    ],
    [t],
  );
  return (
    <MultiSelect
      id="tnt-status-filter"
      initialSelectedItems={[]}
      itemToString={(item) => item?.label}
      items={bizStepOptions}
      label={t('stepFilter', 'Step filter')}
      selectionFeedback="top-after-reopen"
      size="md"
      type="default"
    />
  );
};

export default TntStepFilter;
