import {
  DataTable,
  Pagination,
  Search,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tile,
} from '@carbon/react';
import { formatDate, parseDate, usePagination } from '@openmrs/esm-framework';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type StockOperationItemDTO } from '../../../core/api/types/stockOperation/StockOperationItemDTO';
import styles from './stock-items-table.scss';

type Props = {
  items: Array<StockOperationItemDTO>;
  operationType?: string | null | undefined; // e.g. 'REQUISITION' | 'RECEIPT' | 'ISSUE' etc.
};

const REQUISITION_TYPES = ['requisition', 'externalrequisition'];

const StockItemsTable: React.FC<Props> = ({ items, operationType }) => {
  const { t } = useTranslation();
  const [pageSize, setPageSize] = useState(10);
  const pageSizesOptions = useMemo(() => [5, 10, 20, 50, 100], []);
  const [searchText, setSearchText] = useState<string>();

  const isRequisition = REQUISITION_TYPES.includes(operationType ?? '');

  /**
   * For requisitions show the generic name (displayName).
   * For all other operations show the brand/common name (commonName).
   */
  const getItemName = (item: StockOperationItemDTO): string => {
    if (isRequisition) {
      return item.displayName ?? item.commonName ?? '--';
    }
    return item.commonName ?? item.displayName ?? '--';
  };

  const handleSearch = (item: StockOperationItemDTO) => {
    if (!searchText) return true;
    // Search across both name fields so nothing is missed
    const nameToSearch = getItemName(item).toLowerCase();
    return nameToSearch.includes(searchText.toLowerCase());
  };

  const filtered = items.filter(handleSearch);
  const { results, currentPage, goTo } = usePagination(filtered, pageSize);

  const headers = useMemo(
    () => [
      {
        header: t('item', 'Item'),
        key: 'itemName',
      },
      {
        header: t('batchNo', 'Batch No'),
        key: 'batchNo',
      },
      {
        header: t('expiry', 'Expiry'),
        key: 'expiration',
      },
      {
        header: t('qty', 'Qty'),
        key: 'quantity',
      },
      {
        header: t('uom', 'UoM'),
        key: 'stockItemPackagingUOMName',
      },
    ],
    [t],
  );

  const tableRows = useMemo(
    () =>
      results.map((item, index) => ({
        id: String(index),
        ...item,
        itemName: getItemName(item), // ← resolved name
        expiration: item.expiration ? formatDate(parseDate(`${item.expiration}`)) : '--',
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [results, isRequisition],
  );

  return (
    <Tile className={styles.container}>
      <span className={styles.title}>{t('stockItems', 'Stock items')}</span>
      <Search
        value={searchText}
        onChange={({ target: { value } }) => setSearchText(value)}
        placeholder={t('searchItems', 'Search items...')}
      />
      <DataTable useZebraStyles rows={tableRows} headers={headers}>
        {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
          <Table {...getTableProps()}>
            <TableHead>
              <TableRow>
                {headers.map((header) => (
                  <TableHeader key={header.key} {...getHeaderProps({ header })}>
                    {header.header}
                  </TableHeader>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} {...getRowProps({ row })}>
                  {row.cells.map((cell) => (
                    <TableCell key={cell.id}>{cell.value}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DataTable>
      <Pagination
        page={currentPage}
        pageSize={pageSize}
        pageSizes={pageSizesOptions}
        totalItems={filtered.length}
        onChange={({ page, pageSize }) => {
          goTo(page);
          setPageSize(pageSize);
        }}
      />
    </Tile>
  );
};

export default StockItemsTable;
