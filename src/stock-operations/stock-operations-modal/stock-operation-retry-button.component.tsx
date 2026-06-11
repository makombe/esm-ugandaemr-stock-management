import { Button, InlineLoading } from '@carbon/react';
import { Restart } from '@carbon/react/icons';
import { openmrsFetch, restBaseUrl, showSnackbar } from '@openmrs/esm-framework';
import dayjs from 'dayjs';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { StockOperationDTO } from '../../core/api/types/stockOperation/StockOperationDTO';
import {
  type LocalStatusResponse,
  submitExternalRequisition,
  submitReceiptNote,
  useExternalRequisitionStation,
  useExternalRequisitionStatusByReceiptNumber,
  useFacilityCode,
  useProgramCodeAndProcessingPeriod,
  useStockOperationAndItems,
} from '../stock-operations.resource';
import { extractErrorMessagesFromResponse } from '../../constants';

const Requisition: React.FC<{ operation: StockOperationDTO }> = ({ operation }) => {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const { isLoading, status, facilityCode, mutate } = useExternalRequisitionStation(
    operation.operationNumber as string,
    operation.uuid as string,
  );
  const {
    isLoading: isLoadingProgramAndPeriod,
    processingPeriod,
    programCode,
  } = useProgramCodeAndProcessingPeriod(true);
  const handleRetry = () => {
    setSubmitting(true);
    submitExternalRequisition({
      sourceOrderId: operation.operationNumber as string,
      // rnrId: operation.uuid,
      facilityCode: facilityCode as string,
      programCode,
      periodId: processingPeriod as string,
      clientSubmitedTime: dayjs().toISOString(),
      sourceApplication: 'KenyaEMR',
      emergency: operation.requestType === 'EMERGENCY' ? true : false,
      status: 'AUTHORIZED',
      products: operation.stockOperationItems.map((item) => ({
        productCode: item.etcdProductId as string,
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

        quantityRequested: item.quantity as number,
        reasonForRequestedQuantity: item.reasonForRequestedQuantity as string,
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
          title: t('submissionFailed', 'Submission Failed'),
          subtitle: t('submissionFailedDetails', 'Details: {{message}}', {
            message,
          }),
          kind: 'error',
        });
      })
      .finally(() => {
        setSubmitting(false);
        mutate();
      });
  };

  if (isLoading || isLoadingProgramAndPeriod || submitting) {
    return <InlineLoading description={t('loading', 'Loading...')} />;
  }

  if (status?.status !== 'FAIL') return null;
  return (
    <Button onClick={handleRetry} renderIcon={Restart} kind="tertiary">
      {t('retry', 'Retry')}
    </Button>
  );
};

const Receipt: React.FC<{ operation: StockOperationDTO }> = ({ operation }) => {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const { isLoading: isLoadingFacilityCode, error: facilityCodeError, facilityCode } = useFacilityCode();
  const {
    isLoading,
    status,
    mutate,
    error: statusError,
    supplier,
    statusRemoteMessages,
  } = useExternalRequisitionStatusByReceiptNumber(operation.operationNumber as string);
  const lastStatus = status.at(-1);
  const { items: sourceExternalRequisition, isLoading: isLoadingSourceRequisition } = useStockOperationAndItems(
    status?.[0]?.uuid ?? null,
  );

  const handleRetry = () => {
    setSubmitting(true);
    submitReceiptNote({
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
            uuid: lastStatus?.uuid,
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
            uuid: status?.at(-1)?.uuid,
            podNotificationStatus: 'FAILED',
          },
          headers: { 'Content-Type': 'application/json' },
        });
      })
      .finally(() => {
        setSubmitting(false);
        mutate();
      });
  };

  if (isLoading || submitting || isLoadingFacilityCode || isLoadingSourceRequisition) {
    return <InlineLoading description={t('loading', 'Loading...')} />;
  }

  if (facilityCodeError || statusError) return null;

  if (!status.length || status.at(-1)?.podNotificationStatus === 'SUCCESS') {
    return null;
  }

  return (
    <Button onClick={handleRetry} renderIcon={Restart} kind="tertiary">
      {t('retryDeliveryNoteSubmission', 'Retry Delivery Note Submission')}
    </Button>
  );
};

export default {
  Receipt,
  Requisition,
};
