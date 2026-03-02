import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWR from 'swr';
import type { PageableResult } from '../../core/api/types/PageableResult';
import type { StockItemDTO } from '../../core/api/types/stockItem/StockItem';
import type { StockOperationDTO } from '../../core/api/types/stockOperation/StockOperationDTO';
import { useCallback } from 'react';
import type { StatusResponseData } from '../stock-operations.resource';
import type { StockOperationItemDTO } from '../../core/api/types/stockOperation/StockOperationItemDTO';
import { MAIN_STORE_LOCATION_TAG, RECEIPT_UUID } from '../../constants';
import { getStockOperationUniqueId } from '../stock-operation.utils';

export const usePurchaseOrderItems = (productCodes: string[]) => {
  const {
    data: stockItems = [],
    error,
    isLoading,
  } = useSWR(`${restBaseUrl}/purchase-order-items?items=${productCodes.join(',')}`, async (_) => {
    const tasks = await Promise.allSettled(
      productCodes.map(async (productCode) => {
        const apiUrl = `${restBaseUrl}/stockmanagement/stockitem?v=full&q=${productCode}`;
        const res = await openmrsFetch<PageableResult<StockItemDTO>>(apiUrl);
        return res?.data?.results ?? [];
      }),
    );
    const items = tasks.reduce<Array<StockItemDTO>>((prev, curr) => {
      if (curr.status === 'rejected' || curr.value.some((item) => !productCodes.includes(item.etcdProductId))) {
        return prev;
      }
      prev.push(...curr.value);
      return prev;
    }, []);
    return items;
  });

  const createReceiptPayload = useCallback(
    (items: StatusResponseData['requisition']['items']) => {
      return {
        operationDate: new Date().toISOString(),
        sourceUuid: undefined,
        destinationUuid: undefined,
        responsiblePersonUuid: undefined,
        responsiblePersonOther: undefined,
        remarks: undefined,
        operationTypeUuid: RECEIPT_UUID,
        stockOperationItems: items.map((_item) => {
          const currStockItem = stockItems.find(
            (item) => item.etcdProductId === _item.productCode || item.genericConceptCode === _item.genericConceptCode,
          );
          const uomUuid = currStockItem?.packagingUnits?.find(
            (unit) => unit?.packagingUomName?.toLowerCase() === _item.uom?.toLowerCase(),
          )?.uuid;
          const stockOperationItem = {
            stockItemUuid: currStockItem?.uuid,
            stockItemPackagingUOMUuid: uomUuid,
            batchNo: undefined,
            expiration: undefined,
            quantity: _item.quantityApproved,
            purchasePrice: undefined,
            hasExpiration: false,
            id: undefined,
            uuid: `new-item-${getStockOperationUniqueId()}`,
            brandName: undefined,
            manufacturerName: undefined,
            isOutOfStock: false,
          };
          return stockOperationItem;
        }),
        approvalRequired: true,
      };
    },
    [stockItems],
  );
  return {
    stockItems,
    error,
    isLoading,
    createReceiptPayload,
  };
};
