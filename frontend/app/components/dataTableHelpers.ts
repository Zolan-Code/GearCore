import React from 'react';

export interface Column<T> {
  id?: string;
  key?: string;
  header: React.ReactNode;
  accessor?: keyof T;
  cell?: (row: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string | number;
  className?: string;
  headerClassName?: string;
  style?: React.CSSProperties;
  headerStyle?: React.CSSProperties;
  sortable?: boolean;
  filterable?: boolean;
  sortFn?: (a: T, b: T) => number;
  filterFn?: (row: T, filterValue: string) => boolean;
}

export function getColumnId<T>(col: Column<T>, idx: number): string {
  return col.id || col.key || (typeof col.accessor === 'string' ? col.accessor : `col_${idx}`);
}

export function filterTableData<T>(
  data: T[] | undefined,
  query: string,
  filters: Record<string, string>,
  columns: Column<T>[]
): T[] {
  if (!data) return [];
  const trimmedQuery = query.toLowerCase().trim();
  const activeEntries = Object.entries(filters).filter(([, val]) => val && val.trim());

  if (!trimmedQuery && activeEntries.length === 0) return data;

  return data.filter((row) => {
    if (trimmedQuery) {
      const matchesQuery = columns.some((col, idx) => {
        const colId = getColumnId(col, idx);
        if (col.accessor) {
          const val = row[col.accessor];
          if (val != null && String(val).toLowerCase().includes(trimmedQuery)) return true;
        }
        if (col.filterFn) {
          return col.filterFn(row, trimmedQuery);
        }
        const rawRow = row as Record<string, any>;
        return rawRow[colId] != null && String(rawRow[colId]).toLowerCase().includes(trimmedQuery);
      });
      if (!matchesQuery) return false;
    }

    for (const [colId, filterVal] of activeEntries) {
      const valTrimmed = filterVal.toLowerCase().trim();
      const col = columns.find((c, idx) => getColumnId(c, idx) === colId);
      if (!col) continue;

      if (col.filterFn) {
        if (!col.filterFn(row, valTrimmed)) return false;
      } else if (col.accessor) {
        const val = row[col.accessor];
        if (val == null || !String(val).toLowerCase().includes(valTrimmed)) return false;
      } else {
        const rawRow = row as Record<string, any>;
        if (rawRow[colId] == null || !String(rawRow[colId]).toLowerCase().includes(valTrimmed)) {
          return false;
        }
      }
    }
    return true;
  });
}

export function sortTableData<T>(
  filteredData: T[],
  activeSort: { id: string; direction: 'asc' | 'desc' } | null,
  columns: Column<T>[],
  hasExternalSort: boolean
): T[] {
  if (hasExternalSort || !activeSort) return filteredData;
  const col = columns.find((c, idx) => getColumnId(c, idx) === activeSort.id);
  if (!col) return filteredData;

  return [...filteredData].sort((a, b) => {
    if (col.sortFn) {
      const res = col.sortFn(a, b);
      return activeSort.direction === 'asc' ? res : -res;
    }
    if (col.accessor) {
      const valA = a[col.accessor];
      const valB = b[col.accessor];
      if (valA == null && valB == null) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;
      if (typeof valA === 'number' && typeof valB === 'number') {
        return activeSort.direction === 'asc' ? valA - valB : valB - valA;
      }
      const strA = String(valA);
      const strB = String(valB);
      const cmp = strA.localeCompare(strB, 'es', { sensitivity: 'base' });
      return activeSort.direction === 'asc' ? cmp : -cmp;
    }
    return 0;
  });
}
