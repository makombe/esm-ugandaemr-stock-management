import React, { useState } from "react";
import { Button, InlineLoading } from "@carbon/react";
import { useTranslation } from "react-i18next";
import { TrashCan } from "@carbon/react/icons";
import { deleteStockSource } from "../stock-sources.resource";
import { showModal, showNotification, showToast } from "@openmrs/esm-framework";

interface StockSourcesDeleteActionMenuProps {
  uuid: string;
}

const StockSourcesDeleteActionMenu: React.FC<
  StockSourcesDeleteActionMenuProps
> = ({ uuid }) => {
  const { t } = useTranslation();

  const [deletingSource, setDeletingSource] = useState(false);

  const handleDeleteStockSource = React.useCallback(() => {
    const close = showModal("delete-stock-modal", {
      close: () => close(),
      uuid: uuid,
      onConfirmation: () => {
        const ids = [];
        ids.push(uuid);
        deleteStockSource(ids)
          .then(
            () => {
              setDeletingSource(false);
              showToast({
                critical: true,
                title: t("deletingSource", "Delete Source"),
                kind: "success",
                description: t(
                  "stocksourcedeletedsuccessfully",
                  "Stock Source Deleted Successfully"
                ),
              });
            },
            (error) => {
              setDeletingSource(false);
              showNotification({
                title: t(`errorDeletingSource', 'error deleting a source`),
                kind: "error",
                critical: true,
                description: error?.message,
              });
            }
          )
          .catch();
        close();
      },
    });
  }, [t, uuid]);

  const deleteButton = (
    <Button
      kind="ghost"
      size="md"
      onClick={handleDeleteStockSource}
      iconDescription={t("deleteSource", "Delete Source")}
      renderIcon={(props) => <TrashCan size={16} {...props} />}
    />
  );

  return deletingSource ? <InlineLoading /> : deleteButton;
};

export default StockSourcesDeleteActionMenu;
