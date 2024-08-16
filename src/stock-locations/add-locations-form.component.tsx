import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { showSnackbar } from "@openmrs/esm-framework";
import { saveLocation } from "./stock-locations-table.resource";
import { locationData, LocationMutator } from "../stock-items/types";
import LocationAdministrationForm from "./location-admin-form.component";

interface LocationFormProps {
  showModal: boolean;
  onModalChange: (showModal: boolean) => void;
  mutate: LocationMutator;
}

const NewLocationForm: React.FC<LocationFormProps> = ({
  showModal,
  onModalChange,
  mutate,
}) => {
  const { t } = useTranslation();
  const headerTitle = t("addLocation", "Create new Location");

  const initialData: locationData = {
    uuid: "",
    name: "",
    tags: [],
  };

  const handleCreateQuestion = useCallback(
    (formData: locationData) => {
      const { name, tags } = formData;

      const locationbject = {
        name,
        tags,
      };
      saveLocation({ locationPayload: locationbject })
        .then(() => {
          showSnackbar({
            title: t("formCreated", "Add Location"),
            kind: "success",
            isLowContrast: true,
            subtitle: t(`Location ${name} was created successfully.`),
          });

          mutate();
          onModalChange(false);
        })
        .catch((error) => {
          showSnackbar({
            title: t("errorCreatingForm", "Error creating location"),
            kind: "error",
            isLowContrast: true,
            subtitle: error?.message,
          });
          onModalChange(false);
        });
      onModalChange(false);
    },
    [onModalChange, mutate, t]
  );

  return (
    <>
      <LocationAdministrationForm
        onModalChange={onModalChange}
        showModal={showModal}
        handleCreateQuestion={handleCreateQuestion}
        headerTitle={headerTitle}
        initialData={initialData}
      />
    </>
  );
};
export default NewLocationForm;
