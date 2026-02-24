import { Button, ButtonSet, ModalBody, ModalFooter, ModalHeader, Tag } from '@carbon/react';
import React, { type FC } from 'react';
import { useTranslation } from 'react-i18next';
import { type StockOperationDTO } from '../../core/api/types/stockOperation/StockOperationDTO';
import { type StatusResponse } from '../stock-operations.resource';
import styles from './puchase-order.scss';

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
                <Tag type={status.status === 'SUCCESS' ? 'green' : 'red'}>
                  {requisition?.submissionStatus || status.status}
                </Tag>
              </div>
            </div>

            {items.length > 0 && (
              <div className={styles.itemsContainer}>
                <h5 className={styles.sectionTitle}>{t('items', 'Items')}</h5>
                {items.map((item, index) => (
                  <div key={index} className={styles.itemRow}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span className={styles.itemName}>{item.productCode}</span>
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
                ))}
              </div>
            )}
          </div>
        )}

        {!status && stockOperationItems.length > 0 && (
          <div className={styles.itemsContainer}>
            <h4 className={styles.sectionTitle}>{t('items', 'Items')}</h4>
            {stockOperationItems.map((operationItem) => (
              <div key={operationItem.uuid} className={styles.itemRow}>
                <span className={styles.itemName}>{operationItem.etcdProductId}</span>
                <span className={styles.itemQuantity}>{operationItem.quantity}</span>
              </div>
            ))}
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <ButtonSet className={styles.btnSet}>
          <Button onClick={onClose} kind="secondary" className={styles.btn}>
            {t('close', 'Close')}
          </Button>
          <Button onClick={onReceipt} className={styles.btn}>
            {t('receipt', 'Receipt')}
          </Button>
        </ButtonSet>
      </ModalFooter>
    </>
  );
};

export default PurchaseOrderModal;
