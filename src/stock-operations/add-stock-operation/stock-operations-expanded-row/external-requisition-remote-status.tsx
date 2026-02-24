import React, { type FC } from 'react';
import { type StockOperationDTO } from '../../../core/api/types/stockOperation/StockOperationDTO';
import { useExternalRequisitionStation, useFacilityCode } from '../../stock-operations.resource';
import { InlineLoading } from '@carbon/react';
import { formatDate } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

const ExtrenalRequisitionRemoteStatus: FC<Pick<StockOperationDTO, 'operationNumber'>> = ({ operationNumber }) => {
  const { t } = useTranslation();
  const { error, status, isLoading } = useExternalRequisitionStation(operationNumber);

  if (isLoading) return <InlineLoading />;

  return (
    <div>
      <strong>{status?.data?.requisition?.status ?? status?.data?.submissionStatus}:</strong>
      <br />
      {t('sourceSystem', 'Source System')}: {status?.data?.sourceSystem}
      <br />
      {status?.status === 'FAIL' && (
        <>
          <span>{`${t('reason', 'Reason')}: ${status?.data?.requisition?.errorMessage}`}</span>
          <br />
        </>
      )}
      {status?.status === 'SUCCESS' && status?.data?.requisition?.approvalDate && (
        <>
          <span>{`${t('dateApproved', 'Date approved')}: ${formatDate(
            dayjs(status?.data?.requisition?.approvalDate).toDate(),
          )}.`}</span>
          <br />
        </>
      )}
      {status?.status === 'SUCCESS' && status?.data?.requisition?.supplier?.name && (
        <>
          <span>{`${t('supplier', 'Supplier')}: ${status?.data?.requisition?.supplier?.name}.`}</span>
          <br />
        </>
      )}
    </div>
  );
};

export default ExtrenalRequisitionRemoteStatus;
