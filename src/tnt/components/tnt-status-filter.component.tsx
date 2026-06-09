import React from 'react';
import { useTranslation } from 'react-i18next';
import { MultiSelect } from '@carbon/react';

const TntStatusFilter = () => {
  const { t } = useTranslation();
  return (
    <MultiSelect
      id="tnt-status-filter"
      initialSelectedItems={[]}
      itemToString={(item) => item?.text}
      items={[{ id: 'success', text: t('success', 'Success') }]}
      label={t('statusFilter', 'Status filter')}
      selectionFeedback="top-after-reopen"
      size="md"
      type="default"
    />
  );
};

export default TntStatusFilter;
