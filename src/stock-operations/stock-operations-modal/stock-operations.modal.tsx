import { Button, Form, InlineLoading, ModalBody, ModalFooter, ModalHeader, TextArea } from '@carbon/react';
import { ErrorState, getCoreTranslation, openmrsFetch, restBaseUrl, showSnackbar } from '@openmrs/esm-framework';
import dayjs from 'dayjs';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { extractErrorMessagesFromResponse } from '../../constants';
import {
  type StopOperationAction,
  type StopOperationActionType,
} from '../../core/api/types/stockOperation/StockOperationAction';
import { type StockOperationDTO } from '../../core/api/types/stockOperation/StockOperationDTO';
import { OperationType } from '../../core/api/types/stockOperation/StockOperationType';
import { handleMutate } from '../../utils';
import {
  executeStockOperationAction,
  type LocalStatusResponse,
  submitExternalRequisition,
  submitReceiptNote,
  useExternalRequisitionStatusByReceiptNumber,
  useFacilityCode,
  useProgramCodeAndProcessingPeriod,
  useStockOperationAndItems,
} from '../stock-operations.resource';
import styles from './stock-operations.scss';
import { mutate } from 'swr';

interface StockOperationsModalProps {
  title: string;
  requireReason: boolean;
  operation: StockOperationDTO;
  operationType: OperationType;
  closeModal: () => void;
}

const StockOperationsModal: React.FC<StockOperationsModalProps> = ({
  title,
  requireReason,
  operation,
  closeModal,
  operationType,
}) => {
  const confirmType = title.toLocaleLowerCase().trim();
  const { t } = useTranslation();
  const [notes, setNotes] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const { error, facilityCode, isLoading } = useFacilityCode();
  const isExternalRequisition = operationType === OperationType.EXTERNAL_REQUISITION_OPERATION_TYPE;
  const isReceiptOperation = operationType === OperationType.RECEIPT_OPERATION_TYPE;
  const {
    error: periodOrProgramError,
    isLoading: isLoadingProgramAndPeriod,
    processingPeriod,
    programCode,
  } = useProgramCodeAndProcessingPeriod(isExternalRequisition);
  // Check If is receipt operation created from external requisition
  const {
    status,
    error: statusError,
    isLoading: isLoadingStatus,
  } = useExternalRequisitionStatusByReceiptNumber(isReceiptOperation ? operation.operationNumber : null);
  const isReceiptDerivedFromExternalRequisition = isReceiptOperation && status?.length > 0;
  // Find External requisition used to create the receipt operation(Used to retrive the quantity ordered)
  const { items: sourceExternalRequisition, isLoading: isLoadingSourceRequisition } = useStockOperationAndItems(
    status?.[0]?.uuid ?? null,
  );

  const handleClick = async (event) => {
    event.preventDefault();

    setIsApproving(true);

    let actionName: StopOperationActionType | null = null;

    switch (confirmType) {
      case 'submit':
        actionName = 'SUBMIT';
        break;
      case 'dispatch':
        actionName = 'DISPATCH';
        break;
      case 'complete':
        actionName = 'COMPLETE';
        break;
      case 'complete dispatch':
        actionName = 'COMPLETE';
        break;
      case 'cancel':
        actionName = 'CANCEL';
        break;
      case 'reject':
        actionName = 'REJECT';
        break;
      case 'return':
        actionName = 'RETURN';
        break;
      case 'authorize':
      case 'approve':
        actionName = 'APPROVE';
        break;
      case 'dispatchapproval':
        // messagePrefix = "dispatch";
        actionName = 'DISPATCH';
        break;
    }
    if (!actionName) {
      return;
    }

    const payload: StopOperationAction = {
      name: actionName,
      uuid: operation?.uuid,
      reason: notes,
    };

    try {
      // Submit external requisition to nlimis
      if (isExternalRequisition) {
        submitExternalRequisition({
          sourceOrderId: operation.operationNumber,
          // rnrId: operation.uuid,
          facilityCode: facilityCode,
          programCode,
          periodId: processingPeriod,
          clientSubmitedTime: dayjs().toISOString(),
          sourceApplication: 'KenyaEMR',
          emergency: operation.requestType === 'EMERGENCY' ? true : false,
          status: 'AUTHORIZED',
          products: operation.stockOperationItems.map((item) => ({
            productCode: item.etcdProductId,
            quantityDispensed: operation?.quantityDispensed ?? 805,
            quantityReceived: operation.quantityReceived ?? 942,
            beginningBalance: operation?.beginningBalance ?? 81,
            stockInHand: operation?.stockInHand ?? 216,
            stockOutDays: operation?.stockOutDays ?? 0,
            lossesAndAdjustments: [
              {
                quantity: 2,
                typeCode: 'EXP',
                typeName: 'Expired',
              },
            ],

            quantityRequested: item.quantity,
            reasonForRequestedQuantity: item.reasonForRequestedQuantity,
            genericConceptCode: item.genericConceptCode,
          })),
        })
          .then(({ data }) => {
            showSnackbar({
              title: t('success', 'Success'),
              subtitle: t('requisitionSubmittedSuccessfully', 'Requisition Submitted Successfully to nlmis'),
              kind: 'success',
            });
            return openmrsFetch<LocalStatusResponse>(`${restBaseUrl}/stockmanagement/externalrequisitionstatus`, {
              method: 'POST',
              body: {
                uuid: operation.uuid,
                message: JSON.stringify(data),
                status: data.status,
                source: 'NLMIS',
                operationNumber: operation.operationNumber,
              },
              headers: { 'Content-Type': 'application/json' },
            });
          })
          .then(({ data }) => {
            showSnackbar({
              title: t('success', 'Success'),
              subtitle: t('requisitionStatusUpdatedSuccessfully', 'Requisition Status Updated Successfully from nlmis'),
              kind: 'success',
            });
          })
          .catch((err) => {
            const errorMessages = extractErrorMessagesFromResponse(err);
            const message = errorMessages[0].replace(/[[\]]/g, '');
            showSnackbar({
              title: t('requisitionSubmissionFailed', 'Requisition Submission to Failed'),
              subtitle: t('submissionFailedDetails', 'Details: {{message}}', {
                message,
              }),
              kind: 'error',
            });
          });
      }
      // Submit Receipt note to nlmis
      if (isReceiptDerivedFromExternalRequisition && status.at(-1).podNotificationStatus !== 'SUCCESS') {
        submitReceiptNote({
          sourceOrderId: operation.operationNumber,
          // rnrId: operation.uuid,
          facilityCode: facilityCode,
          deliveryStatus: 'DELIVERED',
          deliveredBy: '',
          deliveredDate: dayjs(operation.operationDate).toISOString(),
          facility_gln: '',
          read_point: '',
          biz_location: '',
          packingList: operation.stockOperationItems?.map((item) => ({
            batchNumber: item.batchNo,
            expiryDate: dayjs(item.expiration).toISOString(),
            gtin: '',
            productCode: item.etcdProductId,
            // Get the quantity ordered from the source external requisition used to create the receipt operation
            quantityOrdered: sourceExternalRequisition?.stockOperationItems?.find(
              (i) => i.etcdProductId === item.etcdProductId,
            )?.quantity,
            quantityShipped: item.quantity,
          })),
          metadata: {
            carrier: '',
            trackingNumber: '',
          },
        })
          .then(({ data }) => {
            showSnackbar({
              title: t('success', 'Success'),
              subtitle: t('receiptNoteSubmittedSuccessfully', 'Receipt note Submitted Successfully to nlmis'),
              kind: 'success',
            });
            return openmrsFetch<LocalStatusResponse>(`${restBaseUrl}/stockmanagement/externalrequisitionstatus`, {
              method: 'POST',
              body: {
                uuid: status.at(-1).uuid,
                receiptMessage: JSON.stringify(data),
                podNotificationStatus: 'SUCCESS',
              },
              headers: { 'Content-Type': 'application/json' },
            });
          })
          .then(({ data }) => {
            showSnackbar({
              title: t('success', 'Success'),
              subtitle: t('reciptNoteSubmissionStatusUpdated', 'Receipt note Submision status updated Successfully'),
              kind: 'success',
            });
          })
          .catch((err) => {
            const errorMessages = extractErrorMessagesFromResponse(err);
            const message = errorMessages[0].replace(/[[\]]/g, '');
            showSnackbar({
              title: t('deliveryNoteSubmissionFailed', 'Delivery note Submission Failed'),
              subtitle: t('submissionFailedDetails', 'Details: {{message}}', {
                message,
              }),
              kind: 'error',
            });
            return openmrsFetch<LocalStatusResponse>(`${restBaseUrl}/stockmanagement/externalrequisitionstatus`, {
              method: 'POST',
              body: {
                uuid: status.at(-1).uuid,
                podNotificationStatus: 'FAILED',
              },
              headers: { 'Content-Type': 'application/json' },
            });
          })
          .finally(() => {
            mutate((key) => typeof key === 'string' && key.includes('externalrequisitionstatus'));
          });
      }
      // submit action
      await executeStockOperationAction(payload);
      showSnackbar({
        title: t('operationSuccessTitle', '{{title}} Operation', { title }),
        subtitle: t('operationSuccessful', 'You have successfully {{title}} operation', {
          title,
        }),
        kind: 'success',
      });
      closeModal();
      handleMutate(`${restBaseUrl}/stockmanagement/stockoperation`);
    } catch (err) {
      const errorMessages = extractErrorMessagesFromResponse(err);
      const message = errorMessages[0].replace(/[[\]]/g, '');
      showSnackbar({
        title: t('stockOperationErrorTitle', 'Failed to submit request'),
        subtitle: t('stockOperationErrorDescription', 'Details: {{message}}', {
          message,
        }),
        kind: 'error',
      });
      closeModal();
    } finally {
      setIsApproving(false);
    }
  };

  if (
    (isExternalRequisition && (isLoading || isLoadingProgramAndPeriod)) ||
    (isReceiptOperation && isLoadingStatus) ||
    isLoadingSourceRequisition
  ) {
    return (
      <div>
        <ModalHeader closeModal={closeModal} title={t('operationModalTitle', '{{title}} Operation', { title })} />
        <ModalBody>
          <InlineLoading />
        </ModalBody>
      </div>
    );
  }

  if (isExternalRequisition && (error || periodOrProgramError)) {
    return (
      <ErrorState
        headerTitle={
          error
            ? t('errorFetchingFacilityCode', 'Error retreiving facility code')
            : t('errorFetchingProgramOrPeriod', 'Error fetching program or period')
        }
        error={error ?? periodOrProgramError}
      />
    );
  }
  if (isReceiptOperation && statusError) {
    return (
      <ErrorState
        headerTitle={t('errorLoadingStatus', 'Error loading requisition status by receipt operation number')}
        error={error ?? periodOrProgramError}
      />
    );
  }

  return (
    <div>
      <Form onSubmit={handleClick}>
        <ModalHeader closeModal={closeModal} title={t('operationModalTitle', '{{title}} Operation', { title })} />
        <ModalBody>
          <div className={styles.modalBody}>
            <section className={styles.section}>
              <h5 className={styles.section}>
                {t('confirmationMessage', 'Would you really like to {{title}} the operation ?', { title })}
              </h5>
            </section>
            <br />
            {requireReason && (
              <section className={styles.section}>
                <TextArea
                  labelText={t('notes', 'Please explain the reason:')}
                  id="nextNotes"
                  name="nextNotes"
                  invalidText="Required"
                  maxCount={500}
                  enableCounter
                  onChange={(e) => setNotes(e.target.value)}
                />
              </section>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={closeModal}>
            {getCoreTranslation('cancel')}
          </Button>
          {isApproving ? <InlineLoading /> : <Button type="submit">{t('submit', 'Submit')}</Button>}
        </ModalFooter>
      </Form>
    </div>
  );
};

export default StockOperationsModal;
