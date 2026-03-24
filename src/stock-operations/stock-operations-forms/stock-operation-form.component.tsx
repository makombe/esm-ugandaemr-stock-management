import { CircleDash } from '@carbon/react/icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { type DefaultWorkspaceProps, parseDate, showSnackbar, useConfig, useSession } from '@openmrs/esm-framework';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { type FieldError, FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { type ConfigObject } from '../../config-schema';
import { today } from '../../constants';
import { type StockOperationDTO } from '../../core/api/types/stockOperation/StockOperationDTO';
import {
  operationFromString,
  OperationType,
  type StockOperationType,
  StockOperationTypeIsStockIssue,
} from '../../core/api/types/stockOperation/StockOperationType';
import { type TabItem } from '../../core/components/tabs/types';
import { otherUser, pick } from '../../core/utils/utils';
import {
  type BaseStockOperationItemFormData,
  getStockOperationFormSchema,
  getStockOperationItemFormSchema,
  getStockOperationItemBaseSchema,
  type StockOperationItemDtoSchema,
  type ExternalRequisitionExtrafields,
  type SchemaOptions,
} from '../validation-schema';
import useOperationTypePermisions from './hooks/useOperationTypePermisions';
import BaseOperationDetailsFormStep, {
  type ExtendedStockOperationType,
} from './steps/base-operation-details-form-step';
import ReceivedItems from './steps/received-items.component';
import StockOperationItemsFormStep from './steps/stock-operation-items-form-step.component';
import StockOperationSubmissionFormStep from './steps/stock-operation-submission-form-step.component';
import StockItemForm, { type StockItemFormProps } from './stock-item-form/stock-item-form.workspace';
import StockOperationStepper from './stock-operation-stepper/stock-operation-stepper.component';
import { useStockOperationAndItems } from '../stock-operations.resource';

type StockOperationFormProps = DefaultWorkspaceProps & {
  stockOperation?: StockOperationDTO;
  stockOperationType: ExtendedStockOperationType; // ← ExtendedStockOperationType, not base
  stockRequisitionUuid?: string;
  defaultValues?: Partial<StockOperationDTO>;
  externalRequsitionUuid?: string;
};

const StockOperationForm: React.FC<StockOperationFormProps> = ({
  stockOperation,
  stockOperationType,
  stockRequisitionUuid,
  closeWorkspace,
  defaultValues,
  externalRequsitionUuid,
}) => {
  const { t } = useTranslation();

  // Derive whether this is a positive adjustment directly from the extended prop.
  // stockOperationType.operationType will be 'adjustment' for both positive and
  // negative — adjustmentType is what distinguishes them.
  const isPositiveAdjustment = stockOperationType.adjustmentType === 'positive';
  const isAdjustmentOperation =
    operationFromString(stockOperationType.operationType) === OperationType.ADJUSTMENT_OPERATION_TYPE;

  const operationType = useMemo(() => operationFromString(stockOperationType.operationType), [stockOperationType]);

  const operationTypePermision = useOperationTypePermisions(stockOperationType);

  // stockOperationItemBaseSchema does NOT yet depend on positiveAdjustmentType —
  // we use a stable default here just for the pick() calls on existing items.
  // The reactive schemaOptions below is what drives StockItemForm.
  const stockOperationItemBaseSchema = useMemo(() => getStockOperationItemBaseSchema(operationType), [operationType]);

  const formschema = useMemo(() => getStockOperationFormSchema(operationType), [operationType]);

  const showReceivedItems = useMemo(() => {
    return (
      (StockOperationTypeIsStockIssue(stockOperation?.operationType as OperationType) ||
        stockOperation?.permission?.canDisplayReceivedItems) &&
      (stockOperation.status === 'DISPATCHED' || stockOperation.status === 'COMPLETED')
    );
  }, [stockOperation]);

  const {
    user: { uuid: defaultLoggedUserUuid },
  } = useSession();
  const { autoPopulateResponsiblePerson } = useConfig<ConfigObject>();
  const { error, items: _stockOperation, isLoading } = useStockOperationAndItems(stockRequisitionUuid);

  // ─── form must be initialized BEFORE any .watch() calls ─────────────────────
  const form = useForm<StockOperationItemDtoSchema & ExternalRequisitionExtrafields>({
    defaultValues: {
      responsiblePersonUuid:
        stockOperation?.responsiblePersonUuid ??
        (stockOperation?.responsiblePersonOther ? otherUser.uuid : undefined) ??
        (autoPopulateResponsiblePerson ? defaultLoggedUserUuid : undefined),
      operationDate:
        stockOperation?.operationDate || defaultValues?.operationDate
          ? parseDate(stockOperation?.operationDate ?? (defaultValues?.operationDate as any))
          : today(),
      remarks: stockOperation?.remarks ?? defaultValues?.remarks ?? '',
      operationTypeUuid: stockOperation?.operationTypeUuid ?? stockOperationType?.uuid,
      reasonUuid: stockOperation?.reasonUuid ?? defaultValues?.reasonUuid ?? '',
      responsiblePersonOther: stockOperation?.responsiblePersonOther ?? defaultValues?.responsiblePersonOther ?? '',
      stockOperationItems:
        (stockOperation?.stockOperationItems ?? defaultValues?.stockOperationItems)?.map((item) =>
          pick(
            { ...item, expiration: item.expiration ? parseDate(item.expiration as any) : undefined },
            stockOperationItemBaseSchema.keyof().options,
          ),
        ) ?? [],
      sourceUuid: stockOperation?.sourceUuid ?? defaultValues?.sourceUuid ?? '',
      destinationUuid: stockOperation?.destinationUuid ?? defaultValues?.destinationUuid ?? '',
      requestType: operationTypePermision.requirePriority ? stockOperation?.requestType ?? 'REGULAR' : undefined,
      reasonForRequestedQuantity: operationTypePermision.requirePriority
        ? stockOperation?.stockOperationItems?.at(0)?.reasonForRequestedQuantity ?? ''
        : undefined,
      // Seed positiveAdjustmentType so the radio group has a default value
      positiveAdjustmentType: isPositiveAdjustment ? 'existing_batch' : undefined,
    },
    mode: 'all',
    values: stockRequisitionUuid
      ? {
          sourceUuid: _stockOperation?.destinationUuid,
          destinationUuid: _stockOperation?.sourceUuid,
          operationTypeUuid: stockOperationType?.uuid,
          stockOperationItems: (_stockOperation?.stockOperationItems?.map((item) =>
            pick(
              { ...item, expiration: item?.expiration ? parseDate(item.expiration as any) : undefined },
              stockOperationItemBaseSchema.keyof().options,
            ),
          ) ?? []) as any,
          requisitionStockOperationUuid: stockRequisitionUuid,
          responsiblePersonUuid: _stockOperation?.responsiblePersonUuid,
          responsiblePersonOther: _stockOperation?.responsiblePersonOther,
          operationDate: _stockOperation?.operationDate ? parseDate(_stockOperation!.operationDate as any) : today(),
        }
      : undefined,
    resolver: zodResolver(formschema),
  });
  // ────────────────────────────────────────────────────────────────────────────

  // ─── Now safe to watch — form is initialized ─────────────────────────────────
  // Only watch when relevant; for non-adjustment operations this will be undefined
  // which is fine — schemaOptions will just omit positiveAdjustmentType.
  const positiveAdjustmentType = isPositiveAdjustment ? form.watch('positiveAdjustmentType') : undefined;

  // Reactive schemaOptions — updates whenever positiveAdjustmentType changes.
  // This is what gets passed down to StockItemForm to drive schema + permission
  // branching without affecting any other operation type.
  const schemaOptions: SchemaOptions = useMemo(
    () => ({
      adjustmentType: stockOperationType.adjustmentType, // 'positive' | 'negative' | undefined
      positiveAdjustmentType: positiveAdjustmentType ?? 'existing_batch',
    }),
    [stockOperationType.adjustmentType, positiveAdjustmentType],
  );
  // ────────────────────────────────────────────────────────────────────────────

  const [renderItemForm, setRenderItemForm] = useState(false);
  const [itemsFormProps, setItemFormProps] = useState<StockItemFormProps>();

  const handleLaunchStockItem = useCallback(
    (stockOperationItem?: BaseStockOperationItemFormData) => {
      setItemFormProps({
        stockOperationType,
        stockOperationItem,
        schemaOptions, // ← carries adjustmentType + positiveAdjustmentType
        onSave: (data) => {
          // For negative adjustment, quantity must be stored as negative
          if (isAdjustmentOperation && stockOperationType.adjustmentType === 'negative') {
            data.quantity = data.quantity > 0 ? -data.quantity : data.quantity;
          }

          const items = (form.getValues('stockOperationItems') ?? []) as Array<BaseStockOperationItemFormData>;
          const index = items.findIndex((i) => i.uuid === data.uuid);
          if (index === -1) {
            items.push(data);
          } else {
            items[index] = data;
          }
          form.setValue('stockOperationItems', items as any);
          setRenderItemForm(false);
          setItemFormProps(undefined);
        },
        onBack: () => {
          setRenderItemForm(false);
          setItemFormProps(undefined);
        },
      });
      setRenderItemForm(true);
    },
    // schemaOptions is now a dep — when positiveAdjustmentType changes and the
    // user re-opens an item form it gets the fresh options
    [stockOperationType, form, schemaOptions, isAdjustmentOperation],
  );

  const steps: TabItem[] = useMemo(() => {
    return [
      {
        name: `${stockOperationType?.name} Details`,
        component: (
          <BaseOperationDetailsFormStep
            stockOperation={stockOperation}
            stockOperationType={stockOperationType}
            onNext={() => setSelectedIndex(1)}
          />
        ),
        disabled: !stockOperation,
      },
      {
        name: t('stockItems', 'Stock Items'),
        component: (
          <StockOperationItemsFormStep
            stockOperation={stockOperation}
            stockOperationType={stockOperationType}
            onNext={() => setSelectedIndex(2)}
            onPrevious={() => setSelectedIndex(0)}
            onLaunchItemsForm={handleLaunchStockItem}
            schemaOptions={schemaOptions}
          />
        ),
        disabled: !stockOperation,
      },
      {
        name: operationTypePermision?.requiresDispatchAcknowledgement ? 'Submit/Dispatch' : 'Submit/Complete',
        component: (
          <StockOperationSubmissionFormStep
            stockOperation={stockOperation}
            stockOperationType={stockOperationType}
            onPrevious={() => setSelectedIndex(1)}
            onNext={showReceivedItems ? () => setSelectedIndex(3) : undefined}
            dismissWorkspace={closeWorkspace}
            externalRequsitionUuid={externalRequsitionUuid}
          />
        ),
        disabled: !stockOperation,
      },
    ].concat(
      showReceivedItems
        ? [
            {
              name: t('receivedItems', 'Received Items'),
              component: <ReceivedItems stockOperation={stockOperation} onPrevious={() => setSelectedIndex(2)} />,
              disabled: !stockOperation,
            },
          ]
        : [],
    ) as TabItem[];
  }, [
    stockOperation,
    stockOperationType,
    t,
    handleLaunchStockItem,
    operationTypePermision?.requiresDispatchAcknowledgement,
    showReceivedItems,
    closeWorkspace,
    externalRequsitionUuid,
    schemaOptions,
  ]);

  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    Object.entries(form.formState.errors ?? {}).forEach(([key, val]) => {
      if (['stockOperationItems', 'operationTypeUuid'].includes(key)) {
        showSnackbar({ kind: 'error', title: key, subtitle: (val as FieldError)?.message });
      }
    });

    const fieldSteps = [
      [
        'responsiblePersonUuid',
        'operationDate',
        'remarks',
        'sourceUuid',
        'destinationUuid',
        'reasonUuid',
        'responsiblePersonOther',
      ],
      ['stockOperationItems'],
    ];
    for (let step = 0; step < fieldSteps.length; step++) {
      const hasError = fieldSteps[step].some((field) => field in form.formState.errors);
      if (hasError) {
        setSelectedIndex(step);
        break;
      }
    }
  }, [form.formState.errors]);

  useEffect(() => {
    if (operationType === OperationType.STOCK_ISSUE_OPERATION_TYPE && !stockRequisitionUuid)
      showSnackbar({
        kind: 'error',
        title: t('stockIssueError', 'StockIssue error'),
        subtitle: t('relatedStockRequisitionRequired', 'Related stock requisition Required'),
      });
    if (error) {
      showSnackbar({
        kind: 'error',
        title: t('stockIssueError', 'StockIssue error'),
        subtitle: error?.message,
      });
    }
  }, [stockRequisitionUuid, error, t, operationType]);

  return (
    <FormProvider {...form}>
      {renderItemForm ? (
        <StockItemForm {...itemsFormProps} />
      ) : (
        <StockOperationStepper
          steps={steps.map((tab) => ({
            title: tab.name,
            component: tab.component,
            disabled: tab.disabled,
            icon: <CircleDash />,
          }))}
          selectedIndex={selectedIndex}
          onChange={setSelectedIndex}
        />
      )}
    </FormProvider>
  );
};

export default StockOperationForm;
