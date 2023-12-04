import React from "react";
import { ConfigurableLink } from "@openmrs/esm-framework";
import { useTranslation } from "react-i18next";

export default function StockManagementLink() {
  const { t } = useTranslation();
  return (
    <ConfigurableLink to={window.getOpenmrsSpaBase() + "stock-management"}>
      {t("stockManagement", "Stock management")}
    </ConfigurableLink>
  );
}
