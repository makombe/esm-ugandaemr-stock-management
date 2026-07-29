import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { type FetchResponse, showSnackbar } from '@openmrs/esm-framework';
import { uploadStockItems } from './stock-items-bulk-import.resource';
import ImportBulkStockItemsModal from './stock-items-bulk-import.modal';

const mockShowSnackbar = jest.mocked(showSnackbar);
const mockUploadStockItems = jest.mocked(uploadStockItems);

jest.mock('./stock-items-bulk-import.resource', () => ({
  uploadStockItems: jest.fn(),
}));

describe('ImportBulkStockItemsModal', () => {
  const mockCloseModal = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with initial state and UI elements', () => {
    render(<ImportBulkStockItemsModal closeModal={mockCloseModal} />);

    expect(screen.getByText(/import stock items/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /select file/i })).toBeInTheDocument();
    expect(screen.getByText(/only .csv files at 2mb or less/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upload stock items/i })).toBeInTheDocument();
  });

  it('allows only CSV files', async () => {
    render(<ImportBulkStockItemsModal closeModal={mockCloseModal} />);

    const fileInput = screen.getByLabelText(/select file/i) as HTMLInputElement;
    expect(fileInput.accept).toBe('.csv');
  });

  it('closes modal when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<ImportBulkStockItemsModal closeModal={mockCloseModal} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);
    expect(mockCloseModal).toHaveBeenCalledTimes(1);
  });

  it('shows an inline validation error when upload is clicked without a file', async () => {
    const user = userEvent.setup();
    render(<ImportBulkStockItemsModal closeModal={mockCloseModal} />);

    const uploadButton = screen.getByRole('button', { name: /upload stock items/i });
    await user.click(uploadButton);

    // Nothing gets submitted...
    expect(uploadStockItems).not.toHaveBeenCalled();
    expect(mockShowSnackbar).not.toHaveBeenCalled();
    expect(mockCloseModal).not.toHaveBeenCalled();
    // ...but the user now sees why, instead of the click silently doing nothing.
    expect(screen.getByText(/please select a csv file before uploading/i)).toBeInTheDocument();
  });

  it('shows a loading state while the upload request is in flight', async () => {
    const user = userEvent.setup();

    let resolveUpload: (value: FetchResponse<unknown>) => void;
    mockUploadStockItems.mockReturnValue(
      new Promise((resolve) => {
        resolveUpload = resolve;
      }) as Promise<FetchResponse<unknown>>,
    );

    render(<ImportBulkStockItemsModal closeModal={mockCloseModal} />);

    const validFile = new File(['test content'], 'valid.csv', { type: 'text/csv' });
    const fileInput = screen.getByLabelText(/select file/i) as HTMLInputElement;
    await userEvent.upload(fileInput, validFile);

    const uploadButton = screen.getByRole('button', { name: /upload stock items/i });
    await user.click(uploadButton);

    // Spinner visible and interaction disabled while the request is pending.
    expect(screen.getByText(/uploading and processing stock items/i)).toBeInTheDocument();
    expect(uploadButton).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();

    resolveUpload({
      data: { success: true, createdCount: 1, updatedCount: 0, notChangedCount: 0 },
      status: 200,
      ok: true,
    } as FetchResponse<unknown>);

    await waitFor(() => expect(mockCloseModal).toHaveBeenCalledTimes(1));
  });

  it('uploads file successfully and shows success snackbar', async () => {
    const user = userEvent.setup();

    mockUploadStockItems.mockResolvedValue({
      data: { success: true, createdCount: 2, updatedCount: 1, notChangedCount: 0 },
      status: 200,
      ok: true,
    } as FetchResponse<unknown>);
    render(<ImportBulkStockItemsModal closeModal={mockCloseModal} />);

    const validFile = new File(['test content'], 'valid.csv', { type: 'text/csv' });
    const fileInput = screen.getByLabelText('Select file') as HTMLInputElement;
    await userEvent.upload(fileInput, validFile);

    const uploadButton = screen.getByRole('button', { name: /upload stock items/i });
    await user.click(uploadButton);

    await waitFor(() => expect(uploadStockItems).toHaveBeenCalled());
    expect(mockShowSnackbar).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'success',
        title: 'Stock items uploaded successfully',
      }),
    );
    await waitFor(() => expect(mockCloseModal).toHaveBeenCalledTimes(1));
  });

  it('shows error snackbar on network/HTTP failure', async () => {
    const user = userEvent.setup();

    mockUploadStockItems.mockRejectedValue(new Error('Upload failed'));
    render(<ImportBulkStockItemsModal closeModal={mockCloseModal} />);

    const validFile = new File(['test content'], 'valid.csv', { type: 'text/csv' });
    const fileInput = screen.getByLabelText(/select file/i) as HTMLInputElement;
    await userEvent.upload(fileInput, validFile);

    const uploadButton = screen.getByRole('button', { name: /upload stock items/i });
    await user.click(uploadButton);

    await waitFor(() =>
      expect(mockShowSnackbar).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'error',
          title: 'An error occurred uploading stock items',
        }),
      ),
    );
    expect(mockCloseModal).not.toHaveBeenCalled();
  });

  it('shows inline errors and keeps the modal open on a business-level import failure', async () => {
    const user = userEvent.setup();

    // The backend returns HTTP 200 even when the import itself failed —
    // success:false with a populated errors[] is the failure signal.
    mockUploadStockItems.mockResolvedValue({
      data: {
        success: false,
        errors: ['Row 3: drug_id required', 'Row 7: invalid concept_id'],
        hasErrorFile: true,
        uploadSessionId: '1_abc123',
      },
      status: 200,
      ok: true,
    } as FetchResponse<unknown>);
    render(<ImportBulkStockItemsModal closeModal={mockCloseModal} />);

    const validFile = new File(['test content'], 'valid.csv', { type: 'text/csv' });
    const fileInput = screen.getByLabelText(/select file/i) as HTMLInputElement;
    await userEvent.upload(fileInput, validFile);

    const uploadButton = screen.getByRole('button', { name: /upload stock items/i });
    await user.click(uploadButton);

    await screen.findByText(/import failed/i);
    expect(screen.getByText(/row 3: drug_id required/i)).toBeInTheDocument();
    expect(screen.getByText(/row 7: invalid concept_id/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download full error report/i })).toBeInTheDocument();
    expect(mockShowSnackbar).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'error',
        title: 'An error occurred uploading stock items',
      }),
    );
    expect(mockCloseModal).not.toHaveBeenCalled();
  });

  it('clears previous errors when a new file is selected after a failed attempt', async () => {
    const user = userEvent.setup();

    mockUploadStockItems.mockResolvedValue({
      data: { success: false, errors: ['Row 3: drug_id required'] },
      status: 200,
      ok: true,
    } as FetchResponse<unknown>);
    render(<ImportBulkStockItemsModal closeModal={mockCloseModal} />);

    const firstFile = new File(['test content'], 'bad.csv', { type: 'text/csv' });
    const fileInput = screen.getByLabelText(/select file/i) as HTMLInputElement;
    await userEvent.upload(fileInput, firstFile);
    await user.click(screen.getByRole('button', { name: /upload stock items/i }));

    await screen.findByText(/row 3: drug_id required/i);

    const secondFile = new File(['test content'], 'fixed.csv', { type: 'text/csv' });
    await userEvent.upload(fileInput, secondFile);

    expect(screen.queryByText(/row 3: drug_id required/i)).not.toBeInTheDocument();
  });
});
