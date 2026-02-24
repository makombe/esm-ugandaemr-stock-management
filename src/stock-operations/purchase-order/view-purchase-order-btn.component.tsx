import { Button, InlineLoading } from '@carbon/react';
import { OrderDetails } from '@carbon/react/icons';
import { showModal, showSnackbar } from '@openmrs/esm-framework';
import React, { useEffect, type FC } from 'react';
import { useTranslation } from 'react-i18next';
import { type StockOperationDTO } from '../../core/api/types/stockOperation/StockOperationDTO';
import { useExternalRequisitionStation } from '../stock-operations.resource';

const ViewPurchaseOrderAction: FC<{ stockOperation: StockOperationDTO }> = ({ stockOperation }) => {
  const { error, status, isLoading } = useExternalRequisitionStation(stockOperation.operationNumber);
  const { t } = useTranslation();

  useEffect(() => {
    if (error) {
      showSnackbar({
        title: t('fetchPurchaseOrderFailed', 'Failed to fetch purchase order status'),
        subtitle: error.message,
        kind: 'error',
      });
    }
  }, [error, t]);

  if (isLoading) return <InlineLoading />;
  if (error) return null;
  if (status.status !== 'SUCCESS') return null;
  return (
    <Button
      onClick={() => {
        const dismiss = showModal('stock-operation-purchase-order-modal', {
          stockOperation,
          status,
          onClose: () => dismiss(),
        });
      }}
      renderIcon={OrderDetails}
    >
      {t('viewPurchaseOrder', 'View Purchase Order')}
    </Button>
  );
};

export default ViewPurchaseOrderAction;
