import { IconButton } from '@carbon/react';
import { Edit } from '@carbon/react/icons';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { type StockOperationDTO } from '../../core/api/types/stockOperation/StockOperationDTO';
import { launchStockoperationAddOrEditWorkSpace } from '../stock-operation.utils';
import useFilteredOperationTypesByRoles from '../stock-operations-forms/hooks/useFilteredOperationTypesByRoles';
import styles from './edit-stock-operation-button.scss';

interface EditStockOperationActionMenuProps {
  stockOperation: StockOperationDTO;
  showIcon?: boolean;
  showprops?: boolean;
}

const EditStockOperationActionMenu: React.FC<EditStockOperationActionMenuProps> = ({
  stockOperation,
  showIcon = true,
  showprops = true,
}) => {
  const { t } = useTranslation();

  const { operationTypes } = useFilteredOperationTypesByRoles();

  const activeOperationType = useMemo(
    () => operationTypes?.find((op) => op?.uuid === stockOperation?.operationTypeUuid),
    [operationTypes, stockOperation],
  );

  const handleLaunchWorkspace = useCallback(() => {
    launchStockoperationAddOrEditWorkSpace(
      t,
      activeOperationType,
      stockOperation,
      stockOperation?.requisitionStockOperationUuid,
    );
  }, [t, activeOperationType, stockOperation]);

  if (stockOperation?.status !== 'NEW' && showIcon) {
    return <>--</>;
  }

  return (
    <IconButton
      className={styles.editStockButton}
      kind="ghost"
      size="sm"
      onClick={handleLaunchWorkspace}
      label={t('editStockOperation', 'Edit Stock Operation')}
      renderIcon={showIcon ? () => <Edit size={16} /> : undefined}
    >
      {showprops && <span className={styles.operationNumberText}>{stockOperation?.operationNumber}</span>}
    </IconButton>
  );
};

export default React.memo(EditStockOperationActionMenu);
