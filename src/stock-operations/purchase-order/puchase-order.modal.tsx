import { Button, ButtonSet, ModalBody, ModalFooter, ModalHeader, Tag , InlineLoading } from '@carbon/react';
import React, { useMemo, type FC } from 'react';
import { useTranslation } from 'react-i18next';
import { type StockOperationDTO } from '../../core/api/types/stockOperation/StockOperationDTO';
import { type StatusResponseData, type StatusResponse } from '../stock-operations.resource';
import styles from './puchase-order.scss';
import { useStockItems } from '../../stock-items/stock-items.resource';
import { ResourceRepresentation } from '../../core/api/api';

type PurchaseOrderModalProps = {
  onClose?: () => void;
  status?: StatusResponse;
  stockOperation?: StockOperationDTO;
};

const PurchaseOrderModal: FC<PurchaseOrderModalProps> = ({ onClose, status, stockOperation }) => {
  const { t } = useTranslation();
  const modalTitle = t('purchaseOrder', 'Purchase Order');
  const onReceipt = () => {
    onClose?.();
  };

  const requisition = status?.data?.requisition;
  const items = requisition?.items || [];
  const stockOperationItems = stockOperation?.stockOperationItems || [];

  return (
    <>
      <ModalHeader closeModal={onClose} title={modalTitle} />
      <ModalBody>
        {status && (
          <div className={styles.statusContainer}>
            <h4 className={styles.sectionTitle}>{t('requisitionStatus', 'Requisition Status')}</h4>
            <div className={styles.statusHeader}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>{t('sourceOrderId', 'Order ID')}</span>
                <span className={styles.detailValue}>{requisition?.sourceOrderId || '-'}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>{t('supplier', 'Supplier')}</span>
                <span className={styles.detailValue}>{requisition?.supplier?.name || '-'}</span>
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
                  {status?.data?.requisition?.status || requisition?.submissionStatus || status?.status}
                </Tag>
              </div>
            </div>

            {items.length > 0 && (
              <div className={styles.itemsContainer}>
                <h5 className={styles.sectionTitle}>{t('items', 'Items')}</h5>
                {items.map((item, index) => (
                  <Item key={index} item={item} />
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
            disabled={status?.data?.requisition?.status !== 'RELEASED'}
          >
            {t('receipt', 'Receipt')}
          </Button>
        </ButtonSet>
      </ModalFooter>
    </>
  );
};

export default PurchaseOrderModal;

const Item = ({ item }: { item: StatusResponseData['requisition']['items'][number] }) => {
  const { t } = useTranslation();
  const { items, isLoading } = useStockItems({
    q: item.productCode ?? item.genericConceptCode,
    v: ResourceRepresentation.Full,
  });
  const itemWithProductCode = useMemo(() => {
    const matchedStockItem = items?.results?.find((i) => i.etcdProductId === item.productCode);
    return matchedStockItem;
  }, [items, item]);

  if (isLoading) {
    return (
      <InlineLoading
        description={t('loadingItemDetails', 'Loading {{item}} item details...', {
          item: item.productCode ?? item.genericConceptCode,
        })}
      />
    );
  }

  return (
    <div className={styles.itemRow}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span className={styles.itemName}>{`${itemWithProductCode?.etcdProductId || item.productCode} - ${
          itemWithProductCode?.drugName ?? itemWithProductCode?.commonName ?? ''
        } (${item.genericConceptCode ?? ''})`}</span>
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
      </div>
    </div>
  );
};
