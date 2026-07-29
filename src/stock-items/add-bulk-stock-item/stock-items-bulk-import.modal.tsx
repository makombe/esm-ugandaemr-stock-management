import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Form,
  ModalBody,
  ModalFooter,
  ModalHeader,
  FileUploader,
  InlineLoading,
  InlineNotification,
  UnorderedList,
  ListItem,
} from '@carbon/react';
import { getCoreTranslation, restBaseUrl, showSnackbar } from '@openmrs/esm-framework';
import { uploadStockItems } from './stock-items-bulk-import.resource';

export interface ImportBulkStockItemsModalProps {
  closeModal: () => void;
}

/**
 * Shape returned by the /stockitemimport POST endpoint
 * (org.openmrs.module.stockmanagement.api.dto.ImportResult). The backend
 * responds with HTTP 200 and this payload even when the import itself
 * failed or partially failed — success/errors/hasErrorFile need to be read
 * from the body, not inferred from the HTTP status.
 */
interface ImportResult {
  createdCount?: number;
  updatedCount?: number;
  notChangedCount?: number;
  uploadSessionId?: string;
  hasErrorFile?: boolean;
  success?: boolean;
  errors?: Array<string>;
}

const ImportBulkStockItemsModal: React.FC<ImportBulkStockItemsModalProps> = ({ closeModal }) => {
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importErrors, setImportErrors] = useState<Array<string>>([]);
  const [errorReportSessionId, setErrorReportSessionId] = useState<string | null>(null);

  const onConfirmUpload = () => {
    // Validate a file was actually selected instead of silently no-op'ing —
    // surfaces a clear reason nothing happened when Upload is clicked blind.
    if (!selectedFile) {
      setFileError(t('selectFileBeforeUploading', 'Please select a CSV file before uploading.'));
      return;
    }

    setFileError(null);
    setImportErrors([]);
    setErrorReportSessionId(null);
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', selectedFile, 'Import_Stock_Items.csv');
    formData.append('hasHeader', 'true');

    uploadStockItems(formData).then(
      (response: { data: ImportResult }) => {
        setIsUploading(false);
        const result = response?.data;

        if (result?.success) {
          showSnackbar({
            kind: 'success',
            title: t('stockItemsUploadedSuccessfully', 'Stock items uploaded successfully'),
            subtitle: t(
              'stockItemsImportSummary',
              '{{created}} created, {{updated}} updated, {{unchanged}} unchanged',
              {
                created: result.createdCount ?? 0,
                updated: result.updatedCount ?? 0,
                unchanged: result.notChangedCount ?? 0,
              },
            ),
          });
          closeModal();
          return;
        }

        // The request succeeded at the HTTP level but the import itself
        // failed or only partially completed — show what went wrong inline
        // rather than only a generic snackbar, and keep the modal open so
        // the user can pick a corrected file and retry without re-opening it.
        setImportErrors(result?.errors?.length ? result.errors : [t('unknownImportError', 'Unknown error occurred')]);
        if (result?.hasErrorFile && result?.uploadSessionId) {
          setErrorReportSessionId(result.uploadSessionId);
        }
        showSnackbar({
          kind: 'error',
          isLowContrast: false,
          title: t('errorUploadingItems', 'An error occurred uploading stock items'),
          subtitle: result?.errors?.[0],
        });
      },
      (err) => {
        setIsUploading(false);
        showSnackbar({
          kind: 'error',
          isLowContrast: false,
          subtitle: err?.message,
          title: t('errorUploadingItems', 'An error occurred uploading stock items'),
        });
      },
    );
  };

  const onFileChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event?.target?.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFileError(null);
      // A fresh file selection supersedes any previous failed attempt's
      // leftover error state.
      setImportErrors([]);
      setErrorReportSessionId(null);
    } else {
      event.preventDefault();
    }
  };

  const downloadErrorReport = () => {
    if (!errorReportSessionId) {
      return;
    }
    window.open(`${restBaseUrl}/stockmanagement/stockitemimport?id=${errorReportSessionId}`, '_blank');
  };

  return (
    <div>
      <Form>
        <ModalHeader closeModal={closeModal} title={t('importStockItems', 'Import stock items')} />
        <ModalBody>
          <FileUploader
            accept={['.csv']}
            buttonLabel={t('selectFile', 'Select file')}
            filenameStatus="edit"
            labelDescription={t('onlyCsvFilesAt2mbOrLess', 'Only .csv files at 2MB or less')}
            labelTitle=""
            multiple={false}
            name="file"
            onChange={onFileChanged}
            size="sm"
            disabled={isUploading}
          />

          {fileError && (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              title={t('noFileSelected', 'No file selected')}
              subtitle={fileError}
            />
          )}

          {isUploading && (
            <InlineLoading description={t('uploadingStockItems', 'Uploading and processing stock items...')} />
          )}

          {importErrors.length > 0 && (
            <>
              <InlineNotification
                kind="error"
                lowContrast
                hideCloseButton
                title={t('importFailed', 'Import failed')}
                subtitle={
                  importErrors.length === 1
                    ? importErrors[0]
                    : t('importFailedWithCount', '{{count}} issues found', { count: importErrors.length })
                }
              />
              {importErrors.length > 1 && (
                <UnorderedList>
                  {importErrors.slice(0, 10).map((error, index) => (
                    <ListItem key={index}>{error}</ListItem>
                  ))}
                  {importErrors.length > 10 && (
                    <ListItem>
                      {t('andMoreErrors', '...and {{count}} more', { count: importErrors.length - 10 })}
                    </ListItem>
                  )}
                </UnorderedList>
              )}
              {errorReportSessionId && (
                <Button kind="ghost" size="sm" onClick={downloadErrorReport}>
                  {t('downloadErrorReport', 'Download full error report')}
                </Button>
              )}
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={closeModal} disabled={isUploading}>
            {getCoreTranslation('cancel')}
          </Button>
          <Button type="button" onClick={onConfirmUpload} disabled={isUploading}>
            {isUploading ? (
              <InlineLoading description={t('uploading', 'Uploading...')} />
            ) : (
              t('uploadStockItems', 'Upload stock items')
            )}
          </Button>
        </ModalFooter>
      </Form>
    </div>
  );
};

export default ImportBulkStockItemsModal;
