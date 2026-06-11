import React, { type FC } from 'react';
import { type StockOperationDTO } from '../../../core/api/types/stockOperation/StockOperationDTO';
import { useExternalRequisitionStation, useFacilityCode } from '../../stock-operations.resource';
import { InlineLoading } from '@carbon/react';
import { formatDate } from '@openmrs/esm-framework';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

const ExtrenalRequisitionRemoteStatus: FC<Pick<StockOperationDTO, 'operationNumber' | 'uuid'>> = ({
  operationNumber,
  uuid,
}) => {
  const { t } = useTranslation();
  const { error, status, isLoading } = useExternalRequisitionStation(operationNumber as string, uuid as string);

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
          <span>{`${t('dateApproved', 'Date approved')}: ${status?.data?.requisition?.approvalDate}.`}</span>
          <br />
        </>
      )}
    </div>
  );
};

export default ExtrenalRequisitionRemoteStatus;
