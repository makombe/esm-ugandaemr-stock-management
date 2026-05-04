import { z } from 'zod';
import { StockItemType } from './add-stock-item/stock-item-details/stock-item-details.resource';

const nullableString = z.string().max(255).nullish();

export const stockItemDetailsSchema = z
  .object({
    // NEW: canonical item type field.
    // Must be one of the three known ItemType values when present.
    // Required on create (user must pick a type); optional on update because
    // the type is locked and not re-submitted by the edit form.
    itemType: z
      .enum([
        StockItemType.PHARMACEUTICAL,
        StockItemType.NON_PHARMACEUTICAL,
        StockItemType.LAB_COMMODITY,
        StockItemType.OTHER,
      ])
      .nullish(),

    /**
     * DEPRECATED: legacy isDrug boolean kept for backward compatibility.
     * This field is no longer driven by the radio group; it is derived from
     * itemType before the API payload is sent.  Keeping it in the schema
     * avoids TypeScript errors in any code that still reads formValues.isDrug.
     */
    isDrug: z.boolean().nullish(),

    drugUuid: z.string().nullish(),
    drugName: z.string().nullish(),
    commonName: nullableString,
    acronym: nullableString,
    hasExpiration: z.boolean(),
    expiryNotice: z.coerce.number().nullish(),
    uuid: z.string().nullish(),
    conceptUuid: z.string().nullish(),
    conceptName: z.string().nullish(),
    preferredVendorUuid: z.string().nullish(),
    preferredVendorName: z.string().nullish(),
    purchasePrice: z.coerce.number().nullish(),
    purchasePriceUoMUuid: z.string().nullish(),
    purchasePriceUoMName: z.string().nullish(),
    categoryUuid: z.string().nullish(),
    categoryName: z.string().nullish(),
    dispensingUnitUuid: z.string().nullish(),
    dispensingUnitName: z.string().nullish(),
    dispensingUnitPackagingUoMUuid: z.string().nullish(),
    dispensingUnitPackagingUoMName: z.string().nullish(),
    defaultStockOperationsUoMUuid: z.string().nullish(),
    defaultStockOperationsUoMName: z.string().nullish(),
    reorderLevel: z.coerce.number().nullish(),
    reorderLevelUoMUuid: z.string().nullish(),
    reorderLevelUoMName: z.string().nullish(),
    dateCreated: z.coerce.date().nullish(),
    creatorGivenName: z.string().nullish(),
    creatorFamilyName: z.string().nullish(),
    voided: z.boolean().nullish(),
  })
  // Refinement 1: itemType is required when creating a new item (uuid absent).
  // On edit the field is nullish because the form doesn't re-submit it.
  .refine(
    ({ uuid, itemType }) => {
      // If this is an update (uuid present) the type is already locked server-side
      if (uuid) return true;
      // For new items the user must pick a type
      return !!itemType;
    },
    {
      message: 'Item type required',
      path: ['itemType'],
    },
  )

  // Refinement 2: drugUuid required when itemType is PHARMACEUTICAL.
  // Falls back to the legacy isDrug boolean for backward compatibility
  // with any code path that still populates isDrug instead of itemType.
  .refine(
    ({ itemType, isDrug, drugUuid }) => {
      const isPharmaceutical = itemType === StockItemType.PHARMACEUTICAL || (itemType == null && isDrug === true);
      return isPharmaceutical ? !!drugUuid : true;
    },
    {
      message: 'Drug required',
      path: ['drugUuid'],
    },
  )

  // Refinement 3: conceptUuid required for NON_PHARMACEUTICAL and LAB_COMMODITY.
  // Not required for PHARMACEUTICAL because the drug association provides
  // the concept implicitly.
  .refine(
    ({ itemType, isDrug, conceptUuid, drugUuid }) => {
      const isPharmaceutical = itemType === StockItemType.PHARMACEUTICAL || (itemType == null && isDrug === true);
      // Pharmaceutical items get their concept from the selected drug – no
      // separate concept picker needed.
      if (isPharmaceutical) return true;
      const isConceptBased =
        itemType === StockItemType.NON_PHARMACEUTICAL ||
        itemType === StockItemType.LAB_COMMODITY ||
        itemType === StockItemType.OTHER ||
        (itemType == null && isDrug === false);
      return isConceptBased ? !!conceptUuid : true;
    },
    {
      message: 'Concept required',
      path: ['conceptUuid'],
    },
  )

  // Refinement 4: dispensingUnitUuid required for PHARMACEUTICAL and
  // LAB_COMMODITY items (both need a dispensing unit configuration).
  // Falls back to the legacy isDrug === true check for backward compat.
  .refine(
    ({ itemType, isDrug, dispensingUnitUuid }) => {
      const needsDispensingUnit =
        itemType === StockItemType.PHARMACEUTICAL ||
        itemType === StockItemType.LAB_COMMODITY ||
        (itemType == null && isDrug === true);
      return needsDispensingUnit ? !!dispensingUnitUuid : true;
    },
    {
      message: 'Dispensing Unit required',
      path: ['dispensingUnitUuid'],
    },
  )
  .refine(
    ({ hasExpiration, expiryNotice }) => {
      return hasExpiration ? !!expiryNotice : true;
    },
    {
      message: 'Expiry Notice required',
      path: ['expiryNotice'],
    },
  );

export type StockItemFormData = z.infer<typeof stockItemDetailsSchema>;
