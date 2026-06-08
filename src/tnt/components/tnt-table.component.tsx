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

const TntTable = () => {
  const { error, events, isLoading } = useTntEvents();
  const { t } = useTranslation();
  const headers = useMemo(
    () => [
      { key: 'eventId', header: t('eventId', 'Event ID') },
      { key: 'type', header: t('type', 'Type') },
      { key: 'bizStep', header: t('bizStep', 'Biz Step') },
      { key: 'status', header: t('status', 'Status') },
      { key: 'reference', header: t('reference', 'Reference') },
      { key: 'date', header: t('date', 'Date') },
      { key: 'actions', header: t('actions', 'Actions') },
    ],
    [t],
  );

  const rows = useMemo(
    () =>
      events.map((event) => ({
        id: event.eventId,
        ...event,
        date: formatDatetime(parseDate(event.date)),
        actions: <Button hasIconOnly renderIcon={View} kind="ghost" iconDescription={t('view', 'View')} />,
      })),
    [events, t],
  );

  if (isLoading) return <DataTableSkeleton />;
  if (error) return <ErrorState headerTitle={t('trackAndtrace', 'Track and Trace')} error={error} />;

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
              {/* <FilterStockItems filterType={itemType} changeFilterType={setItemType} />
              <AddStockItemsBulktImportActionButton />
              <TableToolbarMenu data-testid="stock-items-menu">
                <TableToolbarAction className={styles.toolbarAction} onClick={handleRefresh}>
                  {t('refresh', 'Refresh')}
                </TableToolbarAction>
              </TableToolbarMenu>
              <AddStockItemActionButton /> */}
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
