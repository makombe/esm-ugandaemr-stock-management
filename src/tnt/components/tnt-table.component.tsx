import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DataTable,
  DataTableSkeleton,
  Table,
  TableBatchActions,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
} from '@carbon/react';
import { View } from '@carbon/react/icons';
import { ErrorState, formatDatetime, parseDate } from '@openmrs/esm-framework';
import { useTntEvents } from '../track-and-trace.resource';
import TntStatusFilter from './tnt-status-filter.component';
import TntStepFilter from './tnt-step-filter.component';
import TntMessageViewAction from './tnt-view-message-action.component';

const TntTable = () => {
  const { error, events, isLoading } = useTntEvents();
  const { t } = useTranslation();
  const headers = useMemo(
    () => [
      { key: 'eventId', header: t('eventId', 'Event ID') },
      { key: 'eventType', header: t('type', 'Type') },
      { key: 'bizType', header: t('bizStep', 'Biz Step') },
      { key: 'status', header: t('status', 'Status') },
      { key: 'reference', header: t('reference', 'Reference') },
      { key: 'eventTime', header: t('eventTime', 'Event time') },
      { key: 'actions', header: t('actions', 'Actions') },
    ],
    [t],
  );

  const rows = useMemo(
    () =>
      events.map((event) => ({
        id: event.uuid,
        ...event,
        bizType: event.bizType ?? '--',
        eventTime: event.eventTime ? formatDatetime(parseDate(event.eventTime)) : '--',
        actions: <TntMessageViewAction event={event} />,
      })),
    [events],
  );

  if (isLoading) return <DataTableSkeleton />;
  if (error) return <ErrorState headerTitle={t('trackAndTrace', 'Track and Trace')} error={error} />;

  return (
    <DataTable rows={rows} headers={headers}>
      {({ rows, headers, getTableProps, getHeaderProps, getRowProps, getCellProps, getBatchActionProps }) => (
        <TableContainer>
          <TableToolbar
            style={{
              position: 'static',
              overflow: 'visible',
              backgroundColor: 'color',
            }}
          >
            <TableBatchActions {...getBatchActionProps()} />
            <TableToolbarContent
              style={{
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <TableToolbarSearch
                // onChange={(e) => handleSearch(e.target.value)}
                persistent
                placeholder={t('searchEvents', 'Search events')}
                // value={searchInput}
              />
              <TntStepFilter />
              <TntStatusFilter />
            </TableToolbarContent>
          </TableToolbar>
          <Table {...getTableProps()}>
            <TableHead>
              <TableRow>
                {headers.map((header) => (
                  <TableHeader {...getHeaderProps({ header })}>{header.header}</TableHeader>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow {...getRowProps({ row })}>
                  {row.cells.map((cell) => (
                    <TableCell {...getCellProps({ cell })}>{cell.value}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </DataTable>
  );
};

export default TntTable;
