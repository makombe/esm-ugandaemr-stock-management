import { Button, ButtonSet, FormGroup, InlineLoading, Stack } from '@carbon/react';
import { Save } from '@carbon/react/icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { getCoreTranslation, restBaseUrl, showSnackbar, useLayoutType } from '@openmrs/esm-framework';
import classNames from 'classnames';
import React, { forwardRef, useMemo } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { type StockItemDTO } from '../../../core/api/types/stockItem/StockItem';
import ControlledNumberInput from '../../../core/components/carbon/controlled-number-input.component';
import ControlledRadioButtonGroup from '../../../core/components/carbon/controlled-radio-button-group.component';
import ControlledTextInput from '../../../core/components/carbon/controlled-text-input.component';
import { handleMutate } from '../../../utils';
import styles from '../../add-stock-item/add-stock-item.scss';
import { launchAddOrEditStockItemWorkspace } from '../../stock-item.utils';
import { createStockItem, updateStockItem } from '../../stock-items.resource';
import { stockItemDetailsSchema, type StockItemFormData } from '../../validationSchema';
import ConceptsSelector from '../concepts-selector/concepts-selector.component';
import DispensingUnitSelector from '../dispensing-unit-selector/dispensing-unit-selector.component';
import DrugSelector from '../drug-selector/drug-selector.component';
import PreferredVendorSelector from '../preferred-vendor-selector/preferred-vendor-selector.component';
import StockItemCategorySelector from '../stock-item-category-selector/stock-item-category-selector.component';
import StockItemUnitsEdit from '../stock-item-units-edit/stock-item-units-edit.component';
import { itemTypeToIsDrug, type RadioOption, resolveItemType, StockItemType } from './stock-item-details.resource';

interface StockItemDetailsProps {
  stockItem?: StockItemDTO;
  handleTabChange: (index) => void;
  onCloseWorkspace?: () => void;
}

const StockItemDetails = forwardRef<never, StockItemDetailsProps>(
  ({ stockItem, handleTabChange, onCloseWorkspace }) => {
    const { t } = useTranslation();
    const isTablet = useLayoutType() === 'tablet';
    const expirationOptions: RadioOption[] = [
      { label: t('yes', 'Yes'), value: 'true' },
      { label: t('no', 'No'), value: 'false' },
    ];
    const radioOptions: RadioOption[] = [
      { label: t('pharmaceuticals', 'Pharmaceuticals'), value: StockItemType.PHARMACEUTICAL },
      { label: t('nonPharmaceuticals', 'Non Pharmaceuticals'), value: StockItemType.NON_PHARMACEUTICAL },
      { label: t('labCommodities', 'Lab Commodities'), value: StockItemType.LAB_COMMODITY },
      { label: t('other', 'Other'), value: StockItemType.OTHER },
    ];

    /*
    Resolve the initial itemType from the DTO.
    For new items it starts null (user must choose).
    For existing items we derive from itemType first, then fall back to
    the legacy isDrug boolean so older records display correctly.
    */
    const initialItemType = useMemo(() => resolveItemType(stockItem?.itemType, stockItem?.isDrug), [stockItem]);

    const { handleSubmit, control, formState, watch } = useForm<StockItemFormData>({
      defaultValues: {
        ...stockItem,
        // Populate the form field with the resolved itemType string
        itemType: initialItemType ?? undefined,
      },
      mode: 'all',
      resolver: zodResolver(stockItemDetailsSchema),
    });

    const { errors } = formState;

    const handleSave: SubmitHandler<StockItemFormData> = async (formValues) => {
      try {
        /*
        Build the payload with itemType as the canonical field.
        Also include the legacy isDrug boolean for API backward compat –
        the server-side setIsDrug setter will accept it and keep things in
        sync, but itemType is what actually drives persistence.
        */
        const payload = {
          ...formValues,
          itemType: formValues.itemType,
          // Legacy field kept for backward compat with older server versions
          isDrug: itemTypeToIsDrug(formValues.itemType as StockItemType),
        };

        const response = stockItem ? await updateStockItem(stockItem?.uuid, payload) : await createStockItem(payload);

        if (response?.data) {
          showSnackbar({
            isLowContrast: true,
            title: stockItem ? `${t('editStockItem', 'Edit Stock Item')}` : `${t('addStockItem', 'Add Stock Item')}`,
            kind: 'success',
            subtitle: stockItem
              ? `${t('stockItemEdited', 'Stock Item Edited Successfully')}`
              : `${t('stockItemAdded', 'Stock Item Added Successfully')}`,
          });

          if (!stockItem) {
            onCloseWorkspace?.();
            // Launch the edit workspace after creation.
            // Populate both itemType and the legacy isDrug flag on the item
            // so launchAddOrEditStockItemWorkspace continues to work during
            // the transition period when it may still read isDrug.
            const item = response.data;
            const resolvedType = resolveItemType(item.itemType, item.isDrug);
            item.itemType = resolvedType;
            item.isDrug = itemTypeToIsDrug(resolvedType); // backward compat
            launchAddOrEditStockItemWorkspace(t, item);
          }
        }

        handleTabChange(1);
        handleMutate(`${restBaseUrl}/stockmanagement/stockitem`);
      } catch (e) {
        showSnackbar({
          title: stockItem
            ? t('errorEditingStockItem', 'Error editing a stock Item')
            : t('errorAddingStockItem', 'Error adding a stock Item'),
          kind: 'error',
          isLowContrast: true,
          subtitle: e?.responseBody?.error?.message,
        });
      }
    };

    const [observableItemType, observableHasExpiration] = watch(['itemType', 'hasExpiration']);

    // Derive a typed enum value from the watched string for clean comparisons
    const selectedItemType = useMemo<StockItemType | null>(
      () => resolveItemType(observableItemType as string),
      [observableItemType],
    );

    // A drug selector is shown only for pharmaceutical items
    const isPharmaceutical = selectedItemType === StockItemType.PHARMACEUTICAL;
    // A concept selector is shown for non-pharmaceutical, lab commodity, and other items
    const isConceptBased =
      selectedItemType === StockItemType.NON_PHARMACEUTICAL ||
      selectedItemType === StockItemType.LAB_COMMODITY ||
      selectedItemType === StockItemType.OTHER;

    return (
      <form className={styles.formContainer}>
        <Stack className={styles.stack} gap={5}>
          {/* ------------------------------------------------------------------
              Item Type radio group – shown only when creating a new item.
              For existing items the type is locked (displayed read-only below).
          ------------------------------------------------------------------ */}
          {!stockItem && (
            <FormGroup
              className="clear-margin-bottom"
              legendText={t('itemType', 'Item Type')}
              title={t('itemType', 'Item Type')}
            >
              <ControlledRadioButtonGroup
                control={control}
                name="itemType"
                controllerName="itemType"
                legendText=""
                invalid={!!errors.itemType}
                invalidText={errors.itemType && errors?.itemType?.message}
                options={radioOptions}
              />
            </FormGroup>
          )}

          {/* Read-only type badge for existing items */}
          {stockItem && initialItemType && (
            <p className={styles.itemTypeBadge}>
              <strong>{t('itemType', 'Item Type')}:</strong>{' '}
              {initialItemType === StockItemType.PHARMACEUTICAL
                ? t('pharmaceuticals', 'Pharmaceuticals')
                : initialItemType === StockItemType.NON_PHARMACEUTICAL
                ? t('nonPharmaceuticals', 'Non Pharmaceuticals')
                : initialItemType === StockItemType.LAB_COMMODITY
                ? t('labCommodities', 'Lab Commodities')
                : t('other', 'Other')}
            </p>
          )}

          {/* Drug selector – only for PHARMACEUTICAL items */}
          {isPharmaceutical && (
            <DrugSelector
              name="drugUuid"
              controllerName="drugUuid"
              control={control}
              title={t('pleaseSpecify', 'Please specify:')}
              placeholder="Choose a drug"
              drugUuid={stockItem?.drugUuid}
              invalid={!!errors.drugUuid}
              invalidText={errors.drugUuid && errors?.drugUuid?.message}
            />
          )}

          {/* Concept selector – for NON_PHARMACEUTICAL and LAB_COMMODITY items */}
          {isConceptBased && (
            <ConceptsSelector
              name="conceptUuid"
              controllerName="conceptUuid"
              control={control}
              title={t('pleaseSpecify', 'Please specify') + ':'}
              placeholder={
                selectedItemType === StockItemType.LAB_COMMODITY
                  ? t('chooseALabCommodity', 'Choose a lab commodity')
                  : t('chooseAnItem', 'Choose an item')
              }
              invalid={!!errors.conceptUuid}
              invalidText={errors.conceptUuid && errors?.conceptUuid?.message}
            />
          )}

          <ControlledTextInput
            id="commonName"
            name="commonName"
            control={control}
            controllerName="commonName"
            maxLength={255}
            size={'md'}
            value={`${stockItem?.commonName ?? ''}`}
            labelText={t('commonName', 'Common name') + ':'}
            invalid={!!errors.commonName}
            invalidText={errors.commonName && errors?.commonName?.message}
          />
          <ControlledTextInput
            id="acronym"
            maxLength={255}
            name="acronym"
            control={control}
            controllerName="acronym"
            size={'md'}
            labelText={t('abbreviation', 'Abbreviation') + ':'}
            invalid={!!errors.acronym}
            invalidText={errors.acronym && errors?.acronym?.message}
          />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              justifyContent: 'center',
            }}
          >
            <FormGroup
              className="clear-margin-bottom"
              legendText={t('hasExpiration', 'Does the item expire?')}
              title={t('hasExpiration', 'Does the item expire?')}
            >
              <ControlledRadioButtonGroup
                name="hasExpiration"
                controllerName="hasExpiration"
                control={control}
                legendText=""
                invalid={!!errors.hasExpiration}
                invalidText={errors.hasExpiration && errors?.hasExpiration?.message}
                options={expirationOptions}
              />
            </FormGroup>

            {observableHasExpiration && (
              <FormGroup className="clear-margin-bottom" title={t('expirationNotice', 'Expiration Notice (days)')}>
                <ControlledNumberInput
                  id="expiryNotice"
                  name="expiryNotice"
                  control={control}
                  controllerName="expiryNotice"
                  min={0}
                  hideSteppers={true}
                  size={'md'}
                  allowEmpty={true}
                  label={t('expiryNoticeDays', 'Expiration Notice (days)')}
                  invalid={!!errors.expiryNotice}
                  invalidText={errors.expiryNotice && errors?.expiryNotice?.message}
                />
              </FormGroup>
            )}
          </div>

          <PreferredVendorSelector
            name="preferredVendorUuid"
            controllerName="preferredVendorUuid"
            control={control}
            title={t('whoIsThePreferredVendor', 'Who is the preferred vendor?')}
            placeholder={t('chooseVendor', 'Choose vendor')}
            invalid={!!errors.preferredVendorUuid}
            invalidText={errors.preferredVendorUuid && errors?.preferredVendorUuid?.message}
          />

          <StockItemCategorySelector
            name="categoryUuid"
            controllerName="categoryUuid"
            control={control}
            itemType={
              isPharmaceutical
                ? 'Drugs'
                : selectedItemType === StockItemType.NON_PHARMACEUTICAL
                ? 'Non Drugs'
                : selectedItemType === StockItemType.LAB_COMMODITY
                ? 'Lab Commodities'
                : selectedItemType === StockItemType.OTHER
                ? 'Other'
                : undefined
            }
            title={t('category', 'Category') + ':'}
            placeholder={t('chooseACategory', 'Choose a category')}
            invalid={!!errors.categoryUuid}
            invalidText={errors.categoryUuid && errors?.categoryUuid?.message}
          />

          {/* Dispensing unit is relevant for pharmaceutical AND lab commodity items */}
          {(isPharmaceutical || selectedItemType === StockItemType.LAB_COMMODITY) && (
            <DispensingUnitSelector
              name="dispensingUnitUuid"
              controllerName="dispensingUnitUuid"
              control={control}
              title={t('dispensingUnit', 'Dispensing Unit') + ':'}
              placeholder={t('dispensingUnitHolder', 'Choose a dispensing unit')}
              invalid={!!errors.dispensingUnitUuid}
              invalidText={errors.dispensingUnitUuid && errors?.dispensingUnitUuid?.message}
            />
          )}

          {/* Stock item packaging units – shown for existing items that have a
              drug (pharmaceutical) or are a lab commodity */}
          {(isPharmaceutical || selectedItemType === StockItemType.LAB_COMMODITY) && stockItem && (
            <StockItemUnitsEdit control={control} formState={formState} stockItemUuid={stockItem?.uuid} />
          )}
        </Stack>

        <ButtonSet
          className={classNames(styles.buttonSet, {
            [styles.tablet]: isTablet,
            [styles.desktop]: !isTablet,
          })}
        >
          <Button kind="secondary" onClick={onCloseWorkspace} className={styles.button}>
            {getCoreTranslation('cancel')}
          </Button>
          <Button
            className={styles.button}
            kind="primary"
            name="save"
            onClick={handleSubmit(handleSave)}
            renderIcon={Save}
            type="button"
          >
            {formState.isSubmitting ? <InlineLoading /> : getCoreTranslation('save')}
          </Button>
        </ButtonSet>
      </form>
    );
  },
);

export default StockItemDetails;
