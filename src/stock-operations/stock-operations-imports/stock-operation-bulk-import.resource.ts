import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

export interface OpeningStockImportResult {
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  success: boolean;
  operationsCreated: number;
  itemsImported: number;
  errors: string[];
  uploadSessionId: string;
}

/**
 * POST the CSV file.  Returns immediately with status=PENDING and a
 * sessionId — the actual import runs in a background thread on the server.
 */
export async function uploadOpeningStockItems(body: FormData) {
  return openmrsFetch<OpeningStockImportResult>(`${restBaseUrl}/stockmanagement/openingstockimport`, {
    method: 'POST',
    // Do NOT set Content-Type manually — the browser must set the
    // multipart/form-data boundary automatically when body is FormData.
    body,
  });
}

/**
 * Poll the server for the status of a previously submitted import.
 * Call every few seconds until status is COMPLETED or FAILED.
 */
export async function getOpeningStockImportStatus(sessionId: string) {
  return openmrsFetch<OpeningStockImportResult>(`${restBaseUrl}/stockmanagement/openingstockimport/${sessionId}`);
}
