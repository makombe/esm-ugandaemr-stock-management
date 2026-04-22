export interface RadioOption {
  label: string;
  value: string; // changed from boolean to string to hold ItemType enum values
}

/**
 * Canonical item type enum – mirrors the Java ItemType enum values.
 * Values are the string names sent to / received from the REST API.
 */
export enum StockItemType {
  PHARMACEUTICAL = 'PHARMACEUTICAL',
  NON_PHARMACEUTICAL = 'NON_PHARMACEUTICAL',
  LAB_COMMODITY = 'LAB_COMMODITY',
}

/**
 * Derives a StockItemType from the legacy isDrug boolean that may be present
 * on older DTO objects loaded before the itemType field was introduced.
 * Returns null when neither field is available.
 */
export function resolveItemType(itemType?: string | null, isDrug?: boolean | null): StockItemType | null {
  if (itemType) {
    // Validate it's a known value before returning
    if (Object.values(StockItemType).includes(itemType as StockItemType)) {
      return itemType as StockItemType;
    }
  }
  // Fall back to legacy isDrug boolean for backward compatibility
  if (isDrug === true) return StockItemType.PHARMACEUTICAL;
  if (isDrug === false) return StockItemType.NON_PHARMACEUTICAL;
  return null;
}

/**
 * Maps a StockItemType back to the legacy isDrug boolean so components
 * that still read isDrug (e.g. launchAddOrEditStockItemWorkspace) continue
 * to work correctly during the migration period.
 *
 * @deprecated Remove once all consumers use itemType directly.
 */
export function itemTypeToIsDrug(itemType: StockItemType | null): boolean | null {
  if (itemType === StockItemType.PHARMACEUTICAL) return true;
  if (itemType === StockItemType.NON_PHARMACEUTICAL || itemType === StockItemType.LAB_COMMODITY) return false;
  return null;
}
