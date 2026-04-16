import React, { useCallback, useId, useMemo } from 'react';
import { ArrowLeft, ArrowRight, Edit, TrashCan } from '@carbon/react/icons';
import {
  Button,
  DataTable,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@carbon/react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { type StockOperationDTO } from '../../../core/api/types/stockOperation/StockOperationDTO';
import { type StockOperationType, OperationType } from '../../../core/api/types/stockOperation/StockOperationType';
import { getStockOperationUniqueId } from '../../stock-operation.utils';
import {
  type SchemaOptions,
  type BaseStockOperationItemFormData,
  type StockOperationItemDtoSchema,
} from '../../validation-schema';
import useOperationTypePermisions from '../hooks/useOperationTypePermisions';
import StockItemSearch from '../input-components/stock-item-search.component';
import QuantityUomCell from './quantity-uom-cell.component';
import StockAvailability from './stock-availability-cell.component';
import StockOperationItemBatchNoCell from './stock-operation-item-batch-no-cell.component';
import StockOperationItemCell from './stock-operation-item-cell.component';
import StockoperationItemExpiryCell from './stock-operation-item-expiry-cell.component';
import styles from './stock-operation-items-form-step.scc.scss';
import { showSnackbar } from '@openmrs/esm-framework';
import StockOperationItemBrandNameCell from './stock-operation-item-brand-name-cell.component';

type StockOperationItemsFormStepProps = {
  stockOperation?: StockOperationDTO;
  stockOperationType: StockOperationType;
  onNext?: () => void;
  onPrevious?: () => void;
  onLaunchItemsForm?: (stockOperationItem?: BaseStockOperationItemFormData) => void;
  schemaOptions?: SchemaOptions;
};

const StockOperationItemsFormStep: React.FC<StockOperationItemsFormStepProps> = ({
  stockOperationType,
  stockOperation,
  onNext,
  onPrevious,
  onLaunchItemsForm,
  schemaOptions,
}) => {
  const { t } = useTranslation();
  const operationTypePermision = useOperationTypePermisions(stockOperationType);
  const isNewBatchMode = schemaOptions?.positiveAdjustmentType === 'new_batch';
  const isPositiveAdjustment = schemaOptions?.adjustmentType === 'positive';
  const effectivePermission = useMemo(
    () => ({
      ...operationTypePermision,
      requiresActualBatchInfo:
        isPositiveAdjustment && isNewBatchMode ? true : operationTypePermision.requiresActualBatchInfo,
      requiresBatchUuid: isPositiveAdjustment && isNewBatchMode ? false : operationTypePermision.requiresBatchUuid,
    }),
    [operationTypePermision, isNewBatchMode, isPositiveAdjustment],
  );

  const uniqueId = useId();
  const form = useFormContext<StockOperationItemDtoSchema>();
  const observableOperationItems = form.watch('stockOperationItems');

  const isStockIssueOperation = stockOperationType?.operationType === OperationType.STOCK_ISSUE_OPERATION_TYPE;
  const isAdjustmentOperation = stockOperationType?.operationType === OperationType.ADJUSTMENT_OPERATION_TYPE;
  const isRequisitionOperation =
    stockOperationType?.operationType === OperationType.REQUISITION_OPERATION_TYPE ||
    stockOperationType?.operationType === OperationType.EXTERNAL_REQUISITION_OPERATION_TYPE;

  const headers = useMemo(() => {
    return [
      {
        key: 'item',
        header: t('item', 'Item'),
        styles: { width: '40% !important' },
      },
      {
        key: 'itemDetails',
        header: t('itemDetails', 'Item Details'),
        styles: { width: '20% !important' },
      },
      ...(effectivePermission.requiresBatchUuid || effectivePermission.requiresActualBatchInfo
        ? [
            {
              key: 'batch',
              header: t('batchNo', 'Batch No'),
              styles: { width: '15% !important' },
            },
          ]
        : []),
      ...(effectivePermission.requiresActualBatchInfo ? [{ key: 'expiry', header: t('expiry', 'Expiry') }] : []),
      ...(effectivePermission.requiresBatchUuid ? [{ key: 'expiry', header: t('expiry', 'Expiry') }] : []),
      {
        key: 'quantity',
        header: t('qty', 'Qty'),
      },
      {
        key: 'quantityuom',
        header: t('quantityUom', 'Qty UoM'),
      },
      ...((effectivePermission.requiresBatchUuid || effectivePermission.requiresActualBatchInfo) &&
      !isRequisitionOperation
        ? [
            {
              key: 'brand',
              header: t('brandName', 'Brand Name'),
              styles: { width: '15% !important' },
            },
          ]
        : []),
      ...(operationTypePermision.canCaptureQuantityPrice
        ? [{ key: 'purchasePrice', header: t('purchasePrice', 'Purchase Price') }]
        : []),
      { key: 'actions', header: t('actions', 'Actions') },
    ];
  }, [operationTypePermision, t, effectivePermission, isRequisitionOperation]);

  const tableRows = useMemo(() => {
    return observableOperationItems?.map((item, index) => {
      const {
        batchNo,
        brandName,
        expiration,
        quantity,
        purchasePrice,
        uuid,
        stockItemUuid,
        stockItemPackagingUOMUuid,
        stockBatchUuid,
      } = item;

      return {
        id: uuid || `${uniqueId}-${index}`,

        item: stockItemUuid ? (
          <StockOperationItemCell
            stockItemUuid={stockItemUuid}
            displayMode={isRequisitionOperation ? 'generic' : 'brand'}
          />
        ) : (
          '--'
        ),

        itemDetails: stockItemUuid ? <StockAvailability stockItemUuid={stockItemUuid} /> : '--',

        batch: (
          <StockOperationItemBatchNoCell
            operation={stockOperationType}
            stockBatchUuid={stockBatchUuid}
            batchNo={batchNo}
            stockItemUuid={stockItemUuid}
          />
        ),

        brand: !isRequisitionOperation ? (
          <StockOperationItemBrandNameCell
            operation={stockOperationType}
            stockBatchUuid={stockBatchUuid}
            brandName={brandName}
            stockItemUuid={stockItemUuid}
          />
        ) : (
          '--'
        ),

        expiry: (
          <StockoperationItemExpiryCell
            operation={stockOperationType}
            stockBatchUuid={stockBatchUuid}
            expiration={expiration}
            stockItemUuid={stockItemUuid}
          />
        ),
        quantity: quantity?.toLocaleString(),
        quantityuom: stockItemPackagingUOMUuid ? (
          <QuantityUomCell stockItemPackagingUOMUuid={stockItemPackagingUOMUuid} stockItemUuid={stockItemUuid} />
        ) : (
          '--'
        ),
        purchasePrice: purchasePrice,
        actions: (
          <>
            <Button
              type="button"
              size="sm"
              className="submitButton clear-padding-margin"
              iconDescription={'Edit'}
              kind="ghost"
              renderIcon={Edit}
              onClick={() => onLaunchItemsForm?.(item)}
            />
            <Button
              type="button"
              size="sm"
              className="submitButton clear-padding-margin"
              iconDescription={'Delete'}
              kind="ghost"
              renderIcon={TrashCan}
              onClick={() => {
                const items = form.getValues('stockOperationItems') as Array<BaseStockOperationItemFormData>;
                form.setValue('stockOperationItems', items.filter((i) => i.uuid !== item.uuid) as any);
              }}
            />
          </>
        ),
      };
    });
  }, [observableOperationItems, onLaunchItemsForm, stockOperationType, uniqueId, form, isRequisitionOperation]);

  const handleNext = async () => {
    const valid = await form.trigger(['stockOperationItems']);

    if (!valid) {
      const errors = form.formState.errors;
      const items = observableOperationItems ?? [];

      if (items.length === 0) {
        showSnackbar({
          kind: 'error',
          title: t('validationError', 'Validation error'),
          subtitle: t('atLeastOneItem', 'You must add at least one item'),
        });
        return;
      }

      if (isStockIssueOperation && errors.stockOperationItems) {
        const itemErrors = errors.stockOperationItems as any;
        const hasInStockItemWithoutBatch = items.some((item: any, index: number) => {
          const itemError = itemErrors[index];
          return itemError?.stockBatchUuid && !item.isOutOfStock;
        });
        showSnackbar({
          kind: 'error',
          title: t('validationError', 'Validation error'),
          subtitle: hasInStockItemWithoutBatch
            ? t('inStockItemsRequireBatch', 'In-stock items require batch selection')
            : t('updateBatchInfo', 'Please update batch information for all items'),
        });
        return;
      }

      if (isAdjustmentOperation && items.length > 0 && !errors.stockOperationItems?.message) {
        onNext?.();
        return;
      }

      showSnackbar({
        kind: 'error',
        title: t('validationError', 'Validation error'),
        subtitle: t('correctValidationErrors', 'Please correct the validation errors before proceeding'),
      });
      return;
    }

    onNext?.();
  };

  return (
    <div style={{ margin: '10px' }}>
      <div className={styles.tableContainer}>
        <div className={styles.heading}>
          <h4>{t('stockoperationItems', 'Stock operation items')}</h4>
        </div>
        <StockItemSearch
          displayMode={isRequisitionOperation ? 'generic' : 'brand'}
          onSelectedItem={(stockItem) =>
            onLaunchItemsForm({
              uuid: `new-item-${getStockOperationUniqueId()}`,
              stockItemUuid: stockItem.uuid,
              hasExpiration: stockItem.hasExpiration,
              purchasePrice: stockItem.purchasePrice,
            })
          }
        />
        <DataTable
          rows={tableRows ?? []}
          headers={headers}
          isSortable={false}
          useZebraStyles={true}
          className={styles.dataTable}
          render={({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
            <TableContainer>
              <Table {...getTableProps()}>
                <TableHead>
                  <TableRow>
                    {headers.map((header) => (
                      <TableHeader
                        {...getHeaderProps({ header, isSortable: false })}
                        style={header?.styles}
                        key={header.key}
                      >
                        {header.header?.content ?? header?.header}
                      </TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow {...getRowProps({ row })} key={row.id}>
                      {row.cells.map((cell) => (
                        <TableCell key={cell.id}>{cell.value}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        />
        <div className={styles.btnSet}>
          {typeof onNext === 'function' && (
            <Button kind="primary" onClick={handleNext} renderIcon={ArrowRight}>
              {t('next', 'Next')}
            </Button>
          )}
          {typeof onPrevious === 'function' && (
            <Button
              kind="secondary"
              onClick={onPrevious}
              renderIcon={ArrowLeft}
              hasIconOnly
              data-testid="previous-btn"
              iconDescription={t('previous', 'Previous')}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default StockOperationItemsFormStep;
