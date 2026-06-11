import React, { useMemo, useState, type FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, ButtonSet, Dropdown, InlineLoading, ModalBody, ModalFooter, ModalHeader, Tag } from '@carbon/react';
import { useConfig } from '@openmrs/esm-framework';
import { type ConfigObject } from '../../config-schema';
import type { StockItemDTO } from '../../core/api/types/stockItem/StockItem';
import { type StockOperationDTO } from '../../core/api/types/stockOperation/StockOperationDTO';
import { OperationType, type StockOperationType } from '../../core/api/types/stockOperation/StockOperationType';
import { useStockOperationTypes } from '../../stock-lookups/stock-lookups.resource';
import { launchStockoperationAddOrEditWorkSpace } from '../stock-operation.utils';
import { type RequisitionItem, type StatusResponse } from '../stock-operations.resource';
import styles from './puchase-order.scss';
import { usePurchaseOrderItems } from './purchase-order.resources';

type PurchaseOrderModalProps = {
  onClose?: () => void;
  status?: StatusResponse;
  stockOperation?: StockOperationDTO;
  delivered?: boolean;
};

const PurchaseOrderModal: FC<PurchaseOrderModalProps> = ({ onClose, status, stockOperation, delivered }) => {
  const { requisitionReceiptStatus } = useConfig<ConfigObject>();
  const { t } = useTranslation();
  const requisition = status?.data?.requisition;
  const items = useMemo(() => requisition?.items || [], [requisition]);
  const [currentSupplier, setCurrentSupplier] = useState<RequisitionItem['supplier']>();
  const suppliers = useMemo(
    () =>
      items.reduce<Array<RequisitionItem['supplier']>>((prev, curr) => {
        const exist = prev.findIndex((i: RequisitionItem['supplier']) => i?.code === curr.supplier?.code) !== -1;
        if (!exist && curr.supplier) {
          prev.push(curr.supplier);
        }
        return prev;
      }, []),
    [items],
  );
  const filteredBySupplier = useMemo(() => {
    if (!currentSupplier) return items;
    return items.filter((i) => i.supplier?.code === currentSupplier.code);
  }, [currentSupplier, items]);
  const {
    error,
    isLoading,
    stockItems: purchaseOrderItems,
    createReceiptPayload,
  } = usePurchaseOrderItems(filteredBySupplier.map((item) => item.productCode));
  const { types, isLoading: typesLoading } = useStockOperationTypes();
  const receiptType = useMemo(
    () => types?.results?.find((type) => type.operationType === OperationType.RECEIPT_OPERATION_TYPE),
    [types],
  );
  const modalTitle = t('purchaseOrder', 'Purchase Order');

  const onReceipt = () => {
    const receiptPayload = createReceiptPayload(filteredBySupplier);
    launchStockoperationAddOrEditWorkSpace(
      t,
      receiptType as StockOperationType,
      undefined,
      undefined,
      receiptPayload as unknown as Partial<StockOperationDTO>,
      stockOperation?.uuid ?? undefined,
    );
    onClose?.();
  };

  return (
    <>
      <ModalHeader closeModal={onClose} title={modalTitle} />
      <ModalBody>
        {isLoading || typesLoading ? (
          <InlineLoading />
        ) : (
          <div className={styles.statusContainer}>
            <h4 className={styles.sectionTitle}>{t('requisitionStatus', 'Requisition Status')}</h4>
            <div className={styles.statusHeader}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>{t('sourceOrderId', 'Order ID')}</span>
                <span className={styles.detailValue}>{requisition?.sourceOrderId || '-'}</span>
              </div>
              {requisition?.approvalDate && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>{t('approvalDate', 'Approval Date')}</span>
                  <span className={styles.detailValue}>{requisition.approvalDate}</span>
                </div>
              )}
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>{t('status', 'Status')}</span>
                <Tag type={'blue'}>
                  {status?.data?.requisition?.status || status?.data?.submissionStatus || status?.status}
                </Tag>
              </div>
            </div>

            <Dropdown
              id="default"
              itemToString={(item: RequisitionItem['supplier']) => item?.name ?? ''}
              items={suppliers}
              label={t('selectSupplier', 'Select supplier')}
              titleText={t('supplier', 'Supplier')}
              type="default"
              selectedItem={currentSupplier}
              onChange={({ selectedItem }: { selectedItem?: RequisitionItem['supplier'] }) =>
                setCurrentSupplier(selectedItem)
              }
            />

            {filteredBySupplier.length > 0 && (
              <div className={styles.itemsContainer}>
                <h5 className={styles.sectionTitle}>{t('items', 'Items')}</h5>
                {filteredBySupplier.map((item, index) => (
                  <Item
                    key={index}
                    item={item}
                    stockItem={purchaseOrderItems.find(
                      (i) => i.etcdProductId === item.productCode || i.genericConceptCode === item.genericConceptCode,
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <ButtonSet className={styles.btnSet}>
          <Button onClick={onClose} kind="secondary" className={styles.btn}>
            {t('close', 'Close')}
          </Button>
          <Button
            onClick={onReceipt}
            className={styles.btn}
            disabled={
              status?.data?.requisition?.status !== requisitionReceiptStatus ||
              delivered ||
              !currentSupplier ||
              filteredBySupplier.length === 0
            }
          >
            {t('receipt', 'Receipt')}
          </Button>
        </ButtonSet>
      </ModalFooter>
    </>
  );
};

export default PurchaseOrderModal;

const Item = ({ item, stockItem }: { stockItem?: StockItemDTO; item: RequisitionItem }) => {
  const { t } = useTranslation();

  return (
    <div className={styles.itemRow}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span className={styles.itemName}>{`${stockItem?.etcdProductId || item.productCode} - ${
          stockItem?.drugName ?? stockItem?.commonName ?? ''
        } (${stockItem?.genericConceptCode ?? ''})`}</span>
        <span className={styles.detailLabel}>{item.uom}</span>
      </div>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <div className={styles.detailRow} style={{ alignItems: 'flex-end' }}>
          <span className={styles.detailLabel}>{t('requested', 'Requested')}</span>
          <span className={styles.itemQuantity}>{item.quantityRequested}</span>
        </div>
        <div className={styles.detailRow} style={{ alignItems: 'flex-end' }}>
          <span className={styles.detailLabel}>{t('approved', 'Approved')}</span>
          <span className={styles.itemQuantity}>{item.quantityApproved}</span>
        </div>
        <div className={styles.detailRow} style={{ alignItems: 'flex-end' }}>
          <span className={styles.detailLabel}>{t('supplier', 'Supplier')}</span>
          <span className={styles.itemQuantity}>{item.supplier?.name ?? '--'}</span>
        </div>
        <div className={styles.detailRow} style={{ alignItems: 'flex-end' }}>
          <span className={styles.detailLabel}>{t('price', 'Price')}</span>
          <span className={styles.itemQuantity}>{item.price ?? '--'}</span>
        </div>
      </div>
    </div>
  );
};
