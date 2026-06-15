import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  FileUploader,
  Form,
  InlineLoading,
  InlineNotification,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from '@carbon/react';
import { getCoreTranslation, showSnackbar } from '@openmrs/esm-framework';
import {
  getOpeningStockImportStatus,
  type OpeningStockImportResult,
  uploadOpeningStockItems,
} from './stock-operation-bulk-import.resource';

import styles from './opening-stock-bulk-import.scss';

export interface ImportBulkOpeningStockItemsModalProps {
  closeModal: () => void;
}

const POLL_INTERVAL_MS = 3000; // how often to check status while running

const ImportBulkOpeningStockItemsModal: React.FC<ImportBulkOpeningStockItemsModalProps> = ({ closeModal }) => {
  const { t } = useTranslation();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // 'idle' | 'uploading' | 'polling' | 'done'
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'polling' | 'done'>('idle');

  const [statusLabel, setStatusLabel] = useState('');
  const [inlineErrors, setInlineErrors] = useState<string[]>([]);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clear the polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const onFileChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event?.target?.files?.[0] ?? null;
    if (file) {
      setSelectedFile(file);
      setInlineErrors([]);
    } else {
      event.preventDefault();
    }
  };

  const handleFinalResult = (result: OpeningStockImportResult) => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setPhase('done');

    if (result.success) {
      showSnackbar({
        kind: 'success',
        title: t('openingStockUploadSuccess', 'Opening stock imported successfully'),
        subtitle: t(
          'openingStockUploadSuccessDetail',
          '{{ops}} operation(s) created, {{items}} item batch(es) imported.',
          { ops: result.operationsCreated ?? 0, items: result.itemsImported ?? 0 },
        ),
        timeoutInMs: 7000,
      });
      closeModal();
    } else {
      const errors = result.errors?.length
        ? result.errors
        : [t('openingStockUploadUnknownError', 'An unknown error occurred. Please try again.')];

      showSnackbar({
        kind: 'error',
        isLowContrast: false,
        title: t('openingStockUploadFailed', 'Import failed'),
        subtitle: errors[0],
      });
      setInlineErrors(errors);
    }
  };

  const startPolling = (sessionId: string) => {
    setPhase('polling');
    setStatusLabel(t('openingStockProcessing', 'Processing import on server…'));

    pollRef.current = setInterval(async () => {
      try {
        const { data } = await getOpeningStockImportStatus(sessionId);

        if (data.status === 'RUNNING') {
          setStatusLabel(t('openingStockProcessing', 'Processing import on server…'));
          return;
        }

        if (data.status === 'COMPLETED' || data.status === 'FAILED') {
          handleFinalResult(data);
        }
      } catch (err: any) {
        if (pollRef.current) clearInterval(pollRef.current);
        setPhase('done');
        const msg = err?.message ?? t('openingStockNetworkError', 'Network error while checking import status.');
        showSnackbar({
          kind: 'error',
          isLowContrast: false,
          title: t('openingStockUploadFailed', 'Import failed'),
          subtitle: msg,
        });
        setInlineErrors([msg]);
      }
    }, POLL_INTERVAL_MS);
  };

  const onConfirmUpload = async () => {
    if (!selectedFile) return;

    setPhase('uploading');
    setStatusLabel(t('uploadingOpeningStock', 'Uploading file…'));
    setInlineErrors([]);

    const formData = new FormData();
    formData.append('file', selectedFile, selectedFile.name);
    formData.append('hasHeader', 'true');

    try {
      const { data } = await uploadOpeningStockItems(formData);

      if (data.status === 'FAILED' || (!data.uploadSessionId && !data.success)) {
        handleFinalResult(data);
        return;
      }

      // File accepted — start polling
      startPolling(data.uploadSessionId);
    } catch (err: any) {
      setPhase('done');
      const msg =
        err?.responseBody?.error?.message ??
        err?.message ??
        t('openingStockNetworkError', 'A network error occurred. Please try again.');
      showSnackbar({
        kind: 'error',
        isLowContrast: false,
        title: t('openingStockUploadFailed', 'Import failed'),
        subtitle: msg,
      });
      setInlineErrors([msg]);
    }
  };

  const isBusy = phase === 'uploading' || phase === 'polling';
  const canUpload = !!selectedFile && !isBusy;

  return (
    <div>
      <Form>
        <ModalHeader closeModal={closeModal} title={t('importOpeningStockItems', 'Import Opening Stock Items')} />

        <ModalBody>
          {/* File picker */}
          <FileUploader
            accept={['.csv', '.xlsx']}
            buttonLabel={t('selectFile', 'Select file')}
            filenameStatus="edit"
            labelDescription={t('csvOrXlsxFilesAt2mbOrLess', 'CSV or Excel (.xlsx) files at 2 MB or less')}
            labelTitle=""
            multiple={false}
            name="file"
            onChange={onFileChanged}
            size="sm"
            disabled={isBusy}
          />

          {/* Inline loading — shown while uploading or polling */}
          {isBusy && <InlineLoading style={{ marginTop: '1rem' }} description={statusLabel} status="active" />}

          {/* Inline error list */}
          {inlineErrors.length > 0 && !isBusy && (
            <div className={styles.openingStockContainer}>
              <InlineNotification
                kind="error"
                lowContrast
                hideCloseButton={false}
                title={t('openingStockUploadErrors', 'Import errors')}
                subtitle={t(
                  'openingStockUploadErrorsSubtitle',
                  '{{count}} error(s) found. Fix the file and re-upload.',
                  { count: inlineErrors.length },
                )}
                onClose={() => setInlineErrors([])}
              />
              <ul className={styles.ulOpeningStock}>
                {inlineErrors.map((err, i) => (
                  <li key={i} className={styles.openingStockInlineErrors}>
                    {err}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button kind="secondary" onClick={closeModal} disabled={isBusy}>
            {getCoreTranslation('cancel')}
          </Button>
          <Button type="button" onClick={onConfirmUpload} disabled={!canUpload}>
            {phase === 'uploading'
              ? t('uploading', 'Uploading…')
              : phase === 'polling'
              ? t('openingStockProcessing', 'Processing…')
              : t('uploadOpeningStockItems', 'Upload opening stock items')}
          </Button>
        </ModalFooter>
      </Form>
    </div>
  );
};

export default ImportBulkOpeningStockItemsModal;
