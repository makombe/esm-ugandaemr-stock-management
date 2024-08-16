import { closeOverlay, launchOverlay } from "../core/components/overlay/hook";
import React from "react";
import {
  FetchResponse,
  restBaseUrl,
  showModal,
  showSnackbar,
} from "@openmrs/esm-framework";
import { StockOperationDTO } from "../core/api/types/stockOperation/StockOperationDTO";
import {
  createStockOperation,
  updateStockOperation,
} from "./stock-operations.resource";
import AddStockOperation from "./add-stock-operation/add-stock-operation.component";
import {
  OperationType,
  StockOperationType,
} from "../core/api/types/stockOperation/StockOperationType";
import { useLocation } from "react-router-dom";
import { extractErrorMessagesFromResponse } from "../constants";
import { handleMutate } from "../utils";
export const addOrEditStockOperation = async (
  stockOperation: StockOperationDTO,
  isEditing: boolean,
  operation?: StockOperationType,
  operations?: StockOperationType[],
  canPrint?: boolean
) => {
  const payload = stockOperation;
  try {
    if (operation.operationType === "requisition") {
      delete payload.destinationName;
    }
    if (operation.operationType === OperationType.STOCK_ISSUE_OPERATION_TYPE) {
      const stockIssueOpsTypeUuid = "66666666-6666-6666-6666-666666666666";
      delete payload.completedDate;
      delete payload.completedBy;
      delete payload.completedByFamilyName;
      delete payload.completedByGivenName;
      delete payload.operationTypeUuid;
      delete payload.permission;
      delete payload.locked;
      payload["operationTypeUuid"] = stockIssueOpsTypeUuid;
    }
    const response: FetchResponse<StockOperationDTO> = await (isEditing
      ? updateStockOperation
      : createStockOperation)(payload);

    if (response?.data) {
      handleMutate(`${restBaseUrl}/stockmanagement/stockoperation`);
      showSnackbar({
        isLowContrast: true,
        title: `${isEditing ? "Edit" : "Add"} Stock Operation`,
        kind: "success",
        subtitle: `Stock Operation ${
          isEditing ? "Edited" : "Added"
        } Successfully`,
      });

      // Close overlay and open edit overlay
      closeOverlay();
    }
  } catch (error) {
    const errorMessages = extractErrorMessagesFromResponse(error);
    showSnackbar({
      subtitle: errorMessages.join(", "),
      title: "Error on saving form",
      kind: "error",
      isLowContrast: true,
    });
  }
};

export const launchAddOrEditDialog = (
  stockOperation: StockOperationDTO,
  isEditing: boolean,
  operation?: StockOperationType,
  operations?: StockOperationType[],
  canPrint?: boolean
) => {
  launchOverlay(
    `${isEditing ? "Edit" : "New: "} ${
      isEditing ? stockOperation?.operationTypeName : operation?.name
    }`,
    <AddStockOperation
      model={stockOperation}
      onSave={(so) =>
        addOrEditStockOperation(so, isEditing, operation, operations, canPrint)
      }
      isEditing={isEditing}
      operation={operation}
      canEdit={
        isEditing ? (stockOperation?.status === "NEW" ? true : false) : true
      }
    />
  );
};

export const useUrlQueryParams = () => {
  return new URLSearchParams(useLocation().search);
};

export function getStockOperationUniqueId() {
  return `${new Date().getTime()}-${Math.random()
    .toString(36)
    .substring(2, 16)}`;
}

export const showActionDialogButton = async (
  title: string,
  requireReason: boolean,
  operation: StockOperationDTO
) => {
  const dispose = showModal("stock-operation-dialog", {
    title: title,
    operation: operation,
    requireReason: requireReason,
    closeModal: () => dispose(),
  });
};
