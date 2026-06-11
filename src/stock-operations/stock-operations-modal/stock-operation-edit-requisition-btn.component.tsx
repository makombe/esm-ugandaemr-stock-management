import { Button, InlineLoading } from '@carbon/react';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { StockOperationDTO } from '../../core/api/types/stockOperation/StockOperationDTO';
import { useExternalRequisitionStation, useStockOperationAndItems } from '../stock-operations.resource';
import { launchStockoperationAddOrEditWorkSpace } from '../stock-operation.utils';
import useFilteredOperationTypesByRoles from '../stock-operations-forms/hooks/useFilteredOperationTypesByRoles';

export const StockOperationEditRequisitionButton: React.FC<{ operation: StockOperationDTO }> = ({ operation }) => {
  const { t } = useTranslation();
  const { isLoading: isStockOperationLoading, items: fetchedStockOperation } = useStockOperationAndItems(
    operation?.uuid,
  );
  const { isLoading: isOperationTypesLoading, operationTypes } = useFilteredOperationTypesByRoles();
  const { isLoading, status } = useExternalRequisitionStation(operation.operationNumber, operation.uuid);
  const activeOperationType = useMemo(
    () => operationTypes?.find((op) => op?.uuid === fetchedStockOperation?.operationTypeUuid),
    [operationTypes, fetchedStockOperation],
  );

  const handleLaunchWorkspace = useCallback(() => {
    launchStockoperationAddOrEditWorkSpace(
      t,
      activeOperationType,
      fetchedStockOperation,
      fetchedStockOperation?.requisitionStockOperationUuid,
    );
  }, [t, activeOperationType, fetchedStockOperation]);

  if (isLoading || isStockOperationLoading || isOperationTypesLoading) {
    return null;
  }

  if (status?.status !== 'FAIL') return null;

  return <Button onClick={handleLaunchWorkspace}>{t('edit', 'Edit')}</Button>;
};
