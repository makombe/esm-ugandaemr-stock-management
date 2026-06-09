import { Button } from '@carbon/react';
import { View } from '@carbon/react/icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { type TntEvent } from '../track-and-trace.resource';
import { showModal } from '@openmrs/esm-framework';

const TntMessageViewAction = ({ event }: { event: TntEvent }) => {
  const { t } = useTranslation();
  const handleView = () => {
    const dispose = showModal('tnt-message-view-modal', { onClose: () => dispose(), event });
  };
  return <Button hasIconOnly renderIcon={View} kind="ghost" iconDescription={t('view', 'View')} onClick={handleView} />;
};

export default TntMessageViewAction;
