import { Button, Form, InlineLoading, ModalBody, ModalFooter, ModalHeader, TextArea } from '@carbon/react';
import {
  ErrorState,
  getCoreTranslation,
  openmrsFetch,
  restBaseUrl,
  showSnackbar,
  useConfig,
} from '@openmrs/esm-framework';
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
  fetchOperationBatchNumbers,
  fetchOperationTransactions,
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
import { type ConfigObject } from '../../config-schema';

interface StockOperationsModalProps {
  title: string;
  requireReason: boolean;
  operation: StockOperationDTO;
  operationType: OperationType;
  closeModal: () => void;
}

async function persistRecallTrackAndTraceEvent(
  operation: StockOperationDTO,
  operationTypeName: string,
  enableTrackAndTrace: boolean,
  persistedRefs: Set<string>,
): Promise<void> {
  const isRecallType = operationTypeName === OperationType.EXTERNAL_RECALL_OPERATION_TYPE;

  if (!enableTrackAndTrace || !isRecallType || !operation?.uuid) return;

  const operationRef = operation.operationNumber ?? operation.uuid;
  if (persistedRefs.has(operationRef)) return;

  const [batchNumbers, transactions] = await Promise.all([
    fetchOperationBatchNumbers(operation.uuid),
    fetchOperationTransactions(operation.uuid),
  ]);

  const transactionsByBatchNo = new Map(transactions.map((txn) => [txn.stockBatchNo, txn]));

  const recallLocationUuid = (operation as any).sourceUuid ?? (operation as any).destinationUuid ?? 'unknown';
  const now = new Date().toISOString();
  const operationTime = (operation as any).operationDate ?? now;

  const recallNoticeRef =
    (operation as any).recallNoticeNumber ?? (operation as any).requisitionTransactionDate ?? operationRef;

  const eventList = batchNumbers
    .map((batch) => {
      if (!batch.sgtin) {
        console.info(
          `[TrackAndTrace] Recall batch ${batch.uuid} (lot ${batch.batchNo}) has no sgtin — skipping GS1 event for this batch`,
        );
        return null;
      }

      const matchingTransaction = batch.batchNo ? transactionsByBatchNo.get(batch.batchNo) : undefined;
      const quantity = matchingTransaction ? Math.abs(matchingTransaction.quantity) : 0;
      const uom = matchingTransaction?.packagingUomName ?? 'EA';

      const itemLocationGln = batch.sgln ?? recallLocationUuid;
      const eventId =
        typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${operation.uuid}-${batch.uuid}`;

      return {
        type: 'ObjectEvent',
        eventID: `urn:uuid:${eventId}`,
        eventTime: operationTime,
        eventTimeZoneOffset: '+03:00',
        epcList: [],
        action: 'OBSERVE',
        bizStep: 'holding',
        disposition: 'recalled',
        readPoint: { id: `urn:epc:id:sgln:${itemLocationGln}` },
        bizLocation: { id: `urn:epc:id:sgln:${itemLocationGln}` },
        bizTransactionList: [
          {
            type: 'cert',
            bizTransaction: `urn:epc:id:gdti:${itemLocationGln}.${recallNoticeRef}`,
          },
        ],
        quantityList: [
          {
            epcClass: `urn:epc:class:lgtin:${batch.sgtin}`,
            quantity,
            uom,
          },
        ],
      };
    })
    .filter(Boolean);

  if (!eventList || eventList.length === 0) {
    console.info(`[TrackAndTrace] No GS1-eligible batches found on recall ${operationRef} — skipping EPCIS event`);
    return;
  }

  const epcisDocument = {
    '@context': ['https://ref.gs1.org/standards/epcis/epcis-context.jsonld'],
    type: 'EPCISDocument',
    schemaVersion: '2.0',
    creationDate: now,
    epcisBody: { eventList },
  };

  const envelopeEventId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : operation.uuid;

  try {
    await openmrsFetch(`${restBaseUrl}/stockmanagement/trackandtraceevent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        eventId: envelopeEventId,
        eventType: 'ObjectEvent',
        bizType: 'recall',
        status: 'queued',
        reference: operationRef,
        eventTime: new Date(),
        message: JSON.stringify(epcisDocument),
      },
    });
    persistedRefs.add(operationRef);
    showSnackbar({
      kind: 'success',
      isLowContrast: true,
      title: 'Track & Trace',
      subtitle: `GS1 recall event queued for ${operationRef}`,
    });
  } catch (error) {
    showSnackbar({
      kind: 'warning',
      title: 'Track & Trace Warning',
      subtitle: `Recall saved, but GS1 event could not be queued: ${(error as any)?.message ?? 'unknown error'}`,
    });
  }
}

async function persistReturnTrackAndTraceEvent(
  operation: StockOperationDTO,
  operationTypeName: string,
  enableTrackAndTrace: boolean,
  persistedRefs: Set<string>,
): Promise<void> {
  const isReturnType = operationTypeName === OperationType.EXTERNAL_RETURN_OPERATION_TYPE;

  if (!enableTrackAndTrace || !isReturnType || !operation?.uuid) return;

  const operationRef = operation.operationNumber ?? operation.uuid;
  if (persistedRefs.has(operationRef)) return;

  const [batchNumbers, transactions] = await Promise.all([
    fetchOperationBatchNumbers(operation.uuid),
    fetchOperationTransactions(operation.uuid),
  ]);

  const transactionsByBatchNo = new Map(transactions.map((txn) => [txn.stockBatchNo, txn]));

  // Source is where the return ships from (Main Store); destination is the
  // external party (e.g. KEMSA / supplier) it's returning to.
  const operationSourceUuid = (operation as any).sourceUuid ?? 'unknown';
  const operationDestinationUuid = (operation as any).destinationUuid ?? operationSourceUuid;
  const now = new Date().toISOString();
  const operationTime = (operation as any).operationDate ?? now;

  const returnRmaRef = (operation as any).rmaNumber ?? (operation as any).requisitionTransactionDate ?? operationRef;

  const eventList = batchNumbers
    .map((batch) => {
      const itemEpcList: string[] = [];
      if (batch.sscc) itemEpcList.push(`urn:epc:id:sscc:${batch.sscc}`);
      if (batch.sgtin) itemEpcList.push(`urn:epc:id:sgtin:${batch.sgtin}`);
      if (itemEpcList.length === 0) {
        console.info(
          `[TrackAndTrace] Return batch ${batch.uuid} (lot ${batch.batchNo}) has no sscc/sgtin — skipping GS1 event for this batch`,
        );
        return null;
      }

      const matchingTransaction = batch.batchNo ? transactionsByBatchNo.get(batch.batchNo) : undefined;
      if (matchingTransaction === undefined) {
        console.info(
          `[TrackAndTrace] Return batch ${batch.uuid} (lot ${batch.batchNo}) has no matching transaction — quantity will be omitted from this event`,
        );
      }

      const itemSourceGln = batch.sgln ?? operationSourceUuid;
      const itemEventId =
        typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${operation.uuid}-${batch.uuid}`;

      return {
        type: 'ObjectEvent',
        eventID: `urn:uuid:${itemEventId}`,
        eventTime: operationTime,
        eventTimeZoneOffset: '+03:00',
        epcList: itemEpcList,
        action: 'OBSERVE',
        bizStep: 'shipping',
        disposition: 'returned',
        readPoint: { id: `urn:epc:id:sgln:${itemSourceGln}` },
        bizLocation: { id: `urn:epc:id:sgln:${itemSourceGln}` },
        bizTransactionList: [
          {
            type: 'desadv',
            bizTransaction: `urn:epcglobal:cbv:bt:${itemSourceGln}:${returnRmaRef}`,
          },
        ],
        sourceList: [{ type: 'owning_party', source: `urn:epc:id:sgln:${itemSourceGln}` }],
        destinationList: [
          { type: 'owning_party', destination: `urn:epc:id:sgln:${operationDestinationUuid}` },
          { type: 'location', destination: `urn:epc:id:sgln:${operationDestinationUuid}` },
        ],
      };
    })
    .filter(Boolean);

  if (eventList.length === 0) {
    console.info(`[TrackAndTrace] No GS1-eligible batches found on return ${operationRef} — skipping EPCIS event`);
    return;
  }

  const epcisDocument = {
    '@context': ['https://ref.gs1.org/standards/epcis/epcis-context.jsonld'],
    type: 'EPCISDocument',
    schemaVersion: '2.0',
    creationDate: now,
    epcisBody: { eventList },
  };

  const envelopeEventId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : operation.uuid;

  try {
    await openmrsFetch(`${restBaseUrl}/stockmanagement/trackandtraceevent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        eventId: envelopeEventId,
        eventType: 'ObjectEvent',
        bizType: 'return',
        status: 'queued',
        reference: operationRef,
        eventTime: new Date(),
        message: JSON.stringify(epcisDocument),
      },
    });
    persistedRefs.add(operationRef);
    showSnackbar({
      kind: 'success',
      isLowContrast: true,
      title: 'Track & Trace',
      subtitle: `GS1 return event queued for ${operationRef}`,
    });
  } catch (error) {
    showSnackbar({
      kind: 'warning',
      title: 'Track & Trace Warning',
      subtitle: `Return saved, but GS1 event could not be queued: ${(error as any)?.message ?? 'unknown error'}`,
    });
  }
}

const LOSS_REASON_STOLEN_CONCEPT_UUID = 'e8090476-87e5-4d43-9ba5-cea93245fb64';
const LOSS_REASON_LOST_CONCEPT_UUID = 'f46d3b5e-3c51-4f1b-9a7a-be136b97b3f3';

async function persistLossTrackAndTraceEvent(
  operation: StockOperationDTO,
  operationTypeName: string,
  enableTrackAndTrace: boolean,
  persistedRefs: Set<string>,
): Promise<void> {
  const isLossType = operationTypeName === OperationType.LOSS_OPERATION_TYPE;
  const reasonUuid = (operation as any).reasonUuid;
  const isStolenReason = reasonUuid === LOSS_REASON_STOLEN_CONCEPT_UUID;
  const isLostReason = reasonUuid === LOSS_REASON_LOST_CONCEPT_UUID;

  if (!enableTrackAndTrace || !isLossType || (!isStolenReason && !isLostReason) || !operation?.uuid) return;

  const operationRef = operation.operationNumber ?? operation.uuid;
  if (persistedRefs.has(operationRef)) return;

  const batchNumbers = await fetchOperationBatchNumbers(operation.uuid);

  const operationLocationUuid = (operation as any).sourceUuid ?? (operation as any).atLocationUuid ?? 'unknown';
  const now = new Date().toISOString();
  const operationTime = (operation as any).operationDate ?? now;

  const stolenCaseRef = (operation as any).caseReferenceNumber ?? operationRef;

  const eventList = batchNumbers
    .map((batch) => {
      if (!batch.sgtin) {
        console.info(
          `[TrackAndTrace] Loss batch ${batch.uuid} (lot ${batch.batchNo}) has no sgtin — skipping GS1 event for this batch`,
        );
        return null;
      }

      const itemLocationGln = batch.sgln ?? operationLocationUuid;
      const itemEventId =
        typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${operation.uuid}-${batch.uuid}`;

      const baseEvent = {
        type: 'ObjectEvent',
        eventID: `urn:uuid:${itemEventId}`,
        eventTime: operationTime,
        eventTimeZoneOffset: '+03:00',
        epcList: [`urn:epc:id:sgtin:${batch.sgtin}`],
        action: 'OBSERVE',
        bizStep: 'decommissioning',
        disposition: isStolenReason ? 'stolen' : 'inactive',
        readPoint: { id: `urn:epc:id:sgln:${itemLocationGln}` },
        bizLocation: { id: `urn:epc:id:sgln:${itemLocationGln}` },
      };

      if (isStolenReason) {
        return {
          ...baseEvent,
          bizTransactionList: [{ type: 'cert', bizTransaction: stolenCaseRef }],
        };
      }

      return baseEvent;
    })
    .filter(Boolean);

  if (eventList.length === 0) {
    console.info(`[TrackAndTrace] No GS1-eligible batches found on loss ${operationRef} — skipping EPCIS event`);
    return;
  }

  const epcisDocument = {
    '@context': ['https://ref.gs1.org/standards/epcis/epcis-context.jsonld'],
    type: 'EPCISDocument',
    schemaVersion: '2.0',
    creationDate: now,
    epcisBody: { eventList },
  };

  const envelopeEventId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : operation.uuid;

  try {
    await openmrsFetch(`${restBaseUrl}/stockmanagement/trackandtraceevent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        eventId: envelopeEventId,
        eventType: 'ObjectEvent',
        bizType: isStolenReason ? 'stolen' : 'loss',
        status: 'queued',
        reference: operationRef,
        eventTime: new Date(),
        message: JSON.stringify(epcisDocument),
      },
    });
    persistedRefs.add(operationRef);
    showSnackbar({
      kind: 'success',
      isLowContrast: true,
      title: 'Track & Trace',
      subtitle: `GS1 ${isStolenReason ? 'stolen' : 'loss'} event queued for ${operationRef}`,
    });
  } catch (error) {
    showSnackbar({
      kind: 'warning',
      title: 'Track & Trace Warning',
      subtitle: `Operation saved, but GS1 event could not be queued: ${(error as any)?.message ?? 'unknown error'}`,
    });
  }
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
  const { enableTrackAndTrace } = useConfig<ConfigObject>();
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
    statusRemoteMessages,
    supplier,
  } = useExternalRequisitionStatusByReceiptNumber(isReceiptOperation ? operation?.operationNumber : null);
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
              title: t('requisitionSubmissionFailed', 'Requisition Submission Failed'),
              subtitle: t('submissionFailedDetails', 'Details: {{message}}', {
                message,
              }),
              kind: 'error',
            });
          });
      }
      // Submit Receipt note to nlmis
      if (isReceiptDerivedFromExternalRequisition && status?.at(-1)?.podNotificationStatus !== 'SUCCESS') {
        submitReceiptNote({
          // sourceOrderId: operation.operationNumber as string,
          supplierOrderId: supplier?.supplierOrderId as string,
          // sourceOrderId: operation.operationNumber as string,
          supplierCode: supplier?.code as string,
          rnrId: statusRemoteMessages?.[0]?.data?.requisition?.rnrId,
          facilityCode: facilityCode as string,
          deliveryStatus: 'DELIVERED',
          deliveredBy: '',
          deliveredDate: dayjs(operation.operationDate).toISOString(),
          facility_gln: '',
          read_point: '',
          biz_location: '',
          packingList: operation.stockOperationItems?.map((item) => ({
            batchNumber: item.batchNo as string,
            expiryDate: dayjs(item.expiration).toISOString(),
            gtin: '',
            productCode: item.etcdProductId as string,
            // Get the quantity ordered from the source external requisition used to create the receipt operation
            quantityOrdered: sourceExternalRequisition?.stockOperationItems?.find(
              (i) => i.etcdProductId === item.etcdProductId,
            )?.quantity as number,
            quantityShipped: item.quantity as number,
          })),
          metadata: {
            carrier: '',
            trackingNumber: '',
          },
        })
          .then(({ data }) => {
            showSnackbar({
              title: t('success', 'Success'),
              subtitle: t('proofOfDeliverySubmittedSuccessfully', 'Proof of Delivery Submitted Successfully to nlmis'),
              kind: 'success',
            });
            return openmrsFetch<LocalStatusResponse>(`${restBaseUrl}/stockmanagement/externalrequisitionstatus`, {
              method: 'POST',
              body: {
                uuid: status?.at(-1)?.uuid,
                receiptMessage: JSON.stringify(data),
                podNotificationStatus: 'SUCCESS',
              },
              headers: { 'Content-Type': 'application/json' },
            });
          })
          .then(({ data }) => {
            showSnackbar({
              title: t('success', 'Success'),
              subtitle: t('proofOfDeliveryStatusUpdated', 'Proof of Delivery Status Updated Successfully'),
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

      if (enableTrackAndTrace && actionName === 'COMPLETE') {
        if (operation?.operationType === OperationType.EXTERNAL_RECALL_OPERATION_TYPE) {
          void persistRecallTrackAndTraceEvent(operation, operation?.operationType, enableTrackAndTrace, new Set());
        }
        if (operation?.operationType === OperationType.EXTERNAL_RETURN_OPERATION_TYPE) {
          void persistReturnTrackAndTraceEvent(operation, operation?.operationType, enableTrackAndTrace, new Set());
        }
        if (operation?.operationType === OperationType.LOSS_OPERATION_TYPE) {
          void persistLossTrackAndTraceEvent(operation, operation?.operationType, enableTrackAndTrace, new Set());
        }
      }
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
