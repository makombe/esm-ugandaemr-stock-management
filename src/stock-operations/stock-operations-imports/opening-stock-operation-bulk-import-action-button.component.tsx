import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@carbon/react';
import { showModal } from '@openmrs/esm-framework';

const OpeningStockOperationBulkImportActionButton: React.FC = () => {
  const { t } = useTranslation();

  const handleLaunchImportBulkStockItemsModal = useCallback(() => {
    const dispose = showModal('import-bulk-opening-stock-items', {
      closeModal: () => dispose(),
    });
  }, []);

  return (
    <Button
      iconDescription={t('importOpeningStock', 'Import opening stock')}
      kind="ghost"
      onClick={handleLaunchImportBulkStockItemsModal}
    >
      {t('importOpeningStockBulk', 'Opening Stock Operation Bulk Import')}
    </Button>
  );
};

export default OpeningStockOperationBulkImportActionButton;
