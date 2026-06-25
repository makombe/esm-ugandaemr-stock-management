import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Button, Column, InlineLoading, RadioButton, RadioButtonGroup, Stack } from '@carbon/react';
import { ArrowLeft, ArrowRight, Departure, ListChecked, Save, SendFilled } from '@carbon/react/icons';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { openmrsFetch, restBaseUrl, showSnackbar, useConfig } from '@openmrs/esm-framework';
import {
  createStockOperation,
  deleteStockOperationItem,
  fetchOperationBatchNumbers,
  type LocalStatusResponse,
  updateStockOperation,
} from '../../stock-operations.resource';
import { extractErrorMessagesFromResponse } from '../../../constants';
import { handleMutate } from '../../../utils';
import { OperationType, type StockOperationType } from '../../../core/api/types/stockOperation/StockOperationType';
import { otherUser } from '../../../core/utils/utils';
import { launchStockOperationsModal } from '../../stock-operation.utils';
import { type StockOperationDTO } from '../../../core/api/types/stockOperation/StockOperationDTO';
import { type StockOperationItemDTO } from '../../../core/api/types/stockOperation/StockOperationItemDTO';
import { type ExternalRequisitionExtrafields, type StockOperationItemDtoSchema } from '../../validation-schema';
import useOperationTypePermisions from '../hooks/useOperationTypePermisions';
import { type ConfigObject } from '../../../config-schema';
import styles from '../stock-operation-form.scss';

type ModalAction = 'Complete' | 'Submit' | 'Dispatch';

type StockOperationSubmissionFormStepProps = {
  onPrevious?: () => void;
  stockOperation?: StockOperationDTO;
  stockOperationType: StockOperationType;
  onNext?: () => void;
  dismissWorkspace?: () => void;
  externalRequsitionUuid?: string;
};

async function persistReceiptTrackAndTraceEvent(
  operation: StockOperationDTO,
  operationTypeName: string,
  enableTrackAndTrace: boolean,
  persistedRefs: Set<string>,
): Promise<void> {
  // All guards up front — zero network calls when any condition fails
  if (!enableTrackAndTrace || operationTypeName !== OperationType.RECEIPT_OPERATION_TYPE || !operation?.uuid) return;

  const operationRef = operation.operationNumber ?? operation.uuid;
  if (persistedRefs.has(operationRef)) return;

  const batchNumbers = await fetchOperationBatchNumbers(operation.uuid);

  const operationDestinationUuid = (operation as any).destinationUuid ?? (operation as any).sourceUuid ?? 'unknown';
  const operationSourceUuid = (operation as any).sourceUuid ?? 'unknown';
  const now = new Date().toISOString();
  const operationTime = (operation as any).operationDate ?? now;
  const operationRef2 = operation.operationNumber ?? operation.uuid;

  const eventList = batchNumbers
    .map((batch) => {
      const itemEpcList: string[] = [];
      if (batch.sscc) itemEpcList.push(`urn:epc:id:sscc:${batch.sscc}`);
      if (batch.sgtin) itemEpcList.push(`urn:epc:id:sgtin:${batch.sgtin}`);
      if (itemEpcList.length === 0) return null;

      const itemLocationGln = batch.sgln ?? operationDestinationUuid;
      const itemEventId =
        typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${operation.uuid}-${batch.uuid}`;

      return {
        type: 'ObjectEvent',
        eventID: `urn:uuid:${itemEventId}`,
        eventTime: operationTime,
        eventTimeZoneOffset: '+03:00',
        epcList: itemEpcList,
        action: 'OBSERVE',
        bizStep: 'receiving',
        disposition: 'active',
        readPoint: { id: `urn:epc:id:sgln:${itemLocationGln}` },
        bizLocation: { id: `urn:epc:id:sgln:${itemLocationGln}` },
        bizTransactionList: [
          {
            type: 'recadv',
            bizTransaction: `urn:epcglobal:cbv:bt:${itemLocationGln}:${operationRef2}`,
          },
        ],
        sourceList: [{ type: 'owning_party', source: `urn:epc:id:sgln:${operationSourceUuid}` }],
        destinationList: [{ type: 'owning_party', destination: `urn:epc:id:sgln:${itemLocationGln}` }],
      };
    })
    .filter(Boolean);

  if (eventList.length === 0) {
    console.info(`[TrackAndTrace] No GS1 identifiers found on receipt ${operationRef} — skipping EPCIS event`);
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
        eventType: 'receiving',
        bizType: 'receipt',
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
      subtitle: `GS1 receiving event queued for receipt ${operation.operationNumber}`,
    });
  } catch (error) {
    showSnackbar({
      kind: 'warning',
      title: 'Track & Trace Warning',
      subtitle: `Receipt saved, but GS1 event could not be queued: ${(error as any)?.message ?? 'unknown error'}`,
    });
  }
}

const StockOperationSubmissionFormStep: React.FC<StockOperationSubmissionFormStepProps> = ({
  onPrevious,
  stockOperationType,
  stockOperation,
  onNext,
  dismissWorkspace,
  externalRequsitionUuid,
}) => {
  const { t } = useTranslation();
  const { enableTrackAndTrace } = useConfig<ConfigObject>();
  const operationTypePermision = useOperationTypePermisions(stockOperationType);
  const editable = useMemo(
    () =>
      !stockOperation ||
      stockOperation.status === 'NEW' ||
      stockOperation.operationType === OperationType.EXTERNAL_REQUISITION_OPERATION_TYPE,
    [stockOperation],
  );
  const form = useFormContext<StockOperationItemDtoSchema & ExternalRequisitionExtrafields>();
  const [approvalRequired, setApprovalRequired] = useState<boolean | null>(
    stockOperation?.approvalRequired || operationTypePermision.requirePriority,
  );
  const isStockIssueOperation = useMemo(
    () => OperationType.STOCK_ISSUE_OPERATION_TYPE === stockOperationType.operationType,
    [stockOperationType],
  );
  const persistedOperationRefs = useRef<Set<string>>(new Set());

  const trackAndTraceContext = useMemo(
    () => ({
      enable: enableTrackAndTrace,
      type: stockOperationType.operationType,
      refs: persistedOperationRefs.current,
    }),
    [enableTrackAndTrace, stockOperationType.operationType],
  );

  const handleRadioButtonChange = (selectedItem: boolean) => {
    setApprovalRequired(selectedItem);
  };

  const handleSave = useCallback(async (): Promise<StockOperationDTO> => {
    let result: StockOperationDTO;

    await form.handleSubmit(async (formData) => {
      try {
        const itemsToDelete =
          stockOperation?.stockOperationItems?.reduce<Array<StockOperationItemDTO>>((prev, curr) => {
            const itemDoNotExistInFormData =
              formData.stockOperationItems.findIndex((item) => item.uuid === curr.uuid) === -1;
            return itemDoNotExistInFormData ? [...prev, curr] : prev;
          }, []) ?? [];

        const deleted = await Promise.allSettled(itemsToDelete.map((item) => deleteStockOperationItem(item.uuid)));

        deleted.forEach((del, index) => {
          showSnackbar({
            kind: del.status === 'rejected' ? 'error' : 'success',
            title:
              del.status === 'rejected'
                ? t('stockoperationItemDeleteError', 'Error deleting stock operation item {{item}}', {
                    item: itemsToDelete[index].commonName,
                  })
                : t('success', 'Success'),
            subtitle:
              del.status === 'rejected'
                ? del.reason?.message
                : t('stockoperationItemDeletSuccess', 'Stock operation item {{item}} deleted succesfully', {
                    item: itemsToDelete[index].commonName,
                  }),
          });
        });

        const orderReason = formData.reasonForRequestedQuantity;
        const payload = {
          ...formData,
          reasonForRequestedQuantity: undefined,
          responsiblePersonUuid:
            formData.responsiblePersonUuid === otherUser.uuid ? undefined : formData.responsiblePersonUuid,
          approvalRequired: approvalRequired ? true : false,
          stockOperationItems: formData.stockOperationItems.map((item) => ({
            ...item,
            reasonForRequestedQuantity: orderReason,
            uuid:
              item.uuid.startsWith('new-item-') || (!stockOperation && isStockIssueOperation) ? undefined : item.uuid,
          })),
        };

        const resp = await (stockOperation
          ? updateStockOperation(stockOperation, payload as any)
          : createStockOperation(payload as any));

        result = resp.data;
        handleMutate(`${restBaseUrl}/stockmanagement/stockoperation`);
        dismissWorkspace?.();

        showSnackbar({
          isLowContrast: true,
          title: stockOperation
            ? t('editStockOperation', 'Edit stock operation')
            : t('addStockOperation', 'Add stock operation'),
          kind: 'success',
          subtitle: stockOperation
            ? t('stockOperationEdited', 'Stock operation edited successfully')
            : t('stockOperationAdded', 'Stock operation added successfully'),
        });
      } catch (error) {
        showSnackbar({
          subtitle: extractErrorMessagesFromResponse(error).join(', '),
          title: t('errorSavingForm', 'Error on saving form'),
          kind: 'error',
          isLowContrast: true,
        });
        throw error;
      }
    })();

    // Update external requisition status if applicable
    if (externalRequsitionUuid) {
      try {
        await openmrsFetch<LocalStatusResponse>(`${restBaseUrl}/stockmanagement/externalrequisitionstatus`, {
          method: 'POST',
          body: {
            uuid: externalRequsitionUuid,
            receiptNumber: result.operationNumber,
            deliveryStatus: 'RECEIVED',
          },
          headers: { 'Content-Type': 'application/json' },
        });
        showSnackbar({
          title: t('success', 'Success'),
          subtitle: t('requisitionStatusUpdatedSuccessfully', 'Requisition Status Updated Successfully to RECEIVED'),
          kind: 'success',
        });
      } catch (error) {
        showSnackbar({
          title: t('externalRequisitionStatusUpdateFailed', 'Failed to update external requisition status'),
          subtitle: error?.message,
          kind: 'error',
        });
      }
    }

    return result;
  }, [form, stockOperation, t, approvalRequired, isStockIssueOperation, dismissWorkspace, externalRequsitionUuid]);

  const handleAction = useCallback(
    (modalAction?: ModalAction, nextStatus?: StockOperationDTO['status']) => {
      const { enable, type, refs } = trackAndTraceContext;

      handleSave()
        .then((operation) => {
          // Only launch modal for action buttons (Complete/Submit/Dispatch),
          if (modalAction && nextStatus) {
            launchStockOperationsModal(modalAction, false, { ...operation, status: nextStatus });
          }
          // T&T pipeline — only runs when it is enabled.;
          if (enable) {
            void persistReceiptTrackAndTraceEvent(operation, type, enable, refs);
            //void persistRecallTrackAndTraceEvent(operation, type, enable, refs);
          }
        })
        .catch(() => {
          // handleSave already shows an error snackbar — nothing more to do here.
          // Catch prevents an unhandled promise rejection console warning.
        });
    },
    [handleSave, trackAndTraceContext],
  );

  return (
    <Stack gap={4} className={styles.grid}>
      <div className={styles.heading}>
        <h4>
          {operationTypePermision?.requiresDispatchAcknowledgement
            ? t('submitAndDispatch', 'Submit/Dispatch')
            : t('submitAndComplete', 'Submit/Complete')}
        </h4>
      </div>

      <Column>
        <RadioButtonGroup
          name="rbgApprovelRequired"
          legendText={t('doesThisTransactionRequireApproval', 'Does the transaction require approval ?')}
          onChange={(value) => handleRadioButtonChange(value === 'true')}
          readOnly={!editable || operationTypePermision.requirePriority}
          valueSelected={approvalRequired === true ? 'true' : approvalRequired === false ? 'false' : null}
        >
          <RadioButton value="true" id="rbgApprovelRequired-true" labelText={t('yes', 'Yes')} />
          <RadioButton value="false" id="rbgApprovelRequired-false" labelText={t('no', 'No')} />
        </RadioButtonGroup>
      </Column>

      {editable && (
        <Column>
          {approvalRequired != null && (
            <>
              {!operationTypePermision.requiresDispatchAcknowledgement && !approvalRequired && (
                <Button
                  name="complete"
                  data-testid="complete-button"
                  type="button"
                  style={{ margin: '4px' }}
                  className="submitButton"
                  kind="primary"
                  onClick={() => handleAction('Complete', 'COMPLETED')}
                  renderIcon={ListChecked}
                >
                  {t('complete', 'Complete')}
                </Button>
              )}

              {operationTypePermision.requiresDispatchAcknowledgement && !approvalRequired && (
                <Button
                  name="dispatch"
                  type="button"
                  style={{ margin: '4px' }}
                  data-testid="dipatch-button"
                  className="submitButton"
                  kind="primary"
                  onClick={() => handleAction('Dispatch', 'DISPATCHED')}
                  renderIcon={Departure}
                >
                  {form.formState.isSubmitting ? (
                    <InlineLoading description={t('dispatching', 'Dispatching')} />
                  ) : (
                    t('dispatch', 'Dispatch')
                  )}
                </Button>
              )}

              {approvalRequired && (
                <Button
                  name="submit"
                  type="button"
                  style={{ margin: '4px' }}
                  className="submitButton"
                  kind="primary"
                  onClick={() => handleAction('Submit', 'SUBMITTED')}
                  renderIcon={SendFilled}
                >
                  {form.formState.isSubmitting ? (
                    <InlineLoading description={t('submittingForReview', 'Submitting for review')} />
                  ) : (
                    t('submitForReview', 'Submit For Review')
                  )}
                </Button>
              )}
            </>
          )}

          {/* Save only — no modal, T&T still fires if enabled */}
          <Button
            name="save"
            type="button"
            className="submitButton"
            style={{ margin: '4px' }}
            disabled={form.formState.isSubmitting}
            kind="secondary"
            onClick={() => handleAction()}
            renderIcon={Save}
          >
            {form.formState.isSubmitting ? <InlineLoading /> : t('save', 'Save')}
          </Button>
        </Column>
      )}

      <div className={styles.btnSet}>
        {typeof onNext === 'function' && (
          <Button kind="tertiary" onClick={onNext} renderIcon={ArrowRight}>
            {t('next', 'Next')}
          </Button>
        )}
        {typeof onPrevious === 'function' && (
          <Button
            kind="tertiary"
            onClick={onPrevious}
            renderIcon={ArrowLeft}
            hasIconOnly
            data-testid="previous-btn"
            iconDescription={t('previous', 'Previous')}
          />
        )}
      </div>
    </Stack>
  );
};

export default StockOperationSubmissionFormStep;
