'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './data-table.module.css';

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
  sortable?: boolean; // Por defecto true si tiene accessor o id
  filterable?: boolean; // Por defecto true si tiene accessor o id
  sortFn?: (a: T, b: T) => number;
  filterFn?: (row: T, filterValue: string) => boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string | number;
  storageKey?: string; // Clave de localStorage para guardar layout
  title?: string;
  searchPlaceholder?: string;
  initialQuery?: string;
  enableSearch?: boolean; // Default true
  enableColumnVisibility?: boolean; // Default true
  enablePagination?: boolean; // Default true
  defaultPageSize?: number; // Default 10
  pageSizeOptions?: number[]; // Default [10, 25, 50, 100]
  loading?: boolean;
  loadingMessage?: string;
  error?: Error | null | unknown;
  errorMessage?: string;
  onRetry?: () => void;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  className?: string;
  tableClassName?: string;
  rowClassName?: (row: T, index: number) => string;
  onRowClick?: (row: T, index: number) => void;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  sort?: { id: string; direction: 'asc' | 'desc' } | null;
  onSortChange?: (sort: { id: string; direction: 'asc' | 'desc' }) => void;
}

function getColumnId<T>(col: Column<T>, idx: number): string {
  return col.id || col.key || (typeof col.accessor === 'string' ? col.accessor : `col_${idx}`);
}

export default function DataTable<T>({
  columns,
  data,
  keyExtractor,
  storageKey,
  title,
  searchPlaceholder = 'Buscar en todos los registros...',
  initialQuery = '',
  enableSearch = true,
  enableColumnVisibility = true,
  enablePagination = true,
  defaultPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  loading = false,
  loadingMessage = 'Cargando registros...',
  error = null,
  errorMessage,
  onRetry,
  emptyMessage = 'No se encontraron registros coincidentes.',
  emptyIcon,
  className = '',
  tableClassName = '',
  rowClassName,
  onRowClick,
  actions,
  footer,
  sort: controlledSort,
  onSortChange,
}: DataTableProps<T>) {
  // Lista inicial de IDs de columnas
  const defaultColumnIds = useMemo(() => columns.map(getColumnId), [columns]);

  // Estados de layout
  const [columnOrder, setColumnOrder] = useState<string[]>(defaultColumnIds);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(defaultColumnIds);
  const [pageSize, setPageSize] = useState<number>(defaultPageSize);
  const [page, setPage] = useState<number>(1);
  const [query, setQuery] = useState<string>(initialQuery);

  useEffect(() => {
    if (initialQuery !== undefined) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [internalSort, setInternalSort] = useState<{ id: string; direction: 'asc' | 'desc' } | null>(null);
  const activeSort = controlledSort !== undefined ? controlledSort : internalSort;
  const sort = activeSort;
  const [layoutSaved, setLayoutSaved] = useState<boolean>(false);
  const [hasSavedLayoutInStorage, setHasSavedLayoutInStorage] = useState<boolean>(false);

  // Popovers abiertos
  const [showColumnPopover, setShowColumnPopover] = useState<boolean>(false);
  const [showSavedLayoutPopover, setShowSavedLayoutPopover] = useState<boolean>(false);
  const [activeFilterPopover, setActiveFilterPopover] = useState<string | null>(null);

  // Drag state para reordenar columnas
  const [draggedColId, setDraggedColId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  // Referencias para cerrar popovers al hacer click fuera
  const columnPopoverRef = useRef<HTMLDivElement>(null);
  const savedLayoutPopoverRef = useRef<HTMLDivElement>(null);
  const filterPopoverRef = useRef<HTMLDivElement>(null);

  // Cargar layout desde localStorage al montar
  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as {
          order?: string[];
          visible?: string[];
          pageSize?: number;
        };
        if (Array.isArray(parsed.order) && parsed.order.length > 0) {
          // Filtrar por si hubo cambios de columnas en código
          const validOrder = parsed.order.filter((id) => defaultColumnIds.includes(id));
          const missing = defaultColumnIds.filter((id) => !validOrder.includes(id));
          setColumnOrder([...validOrder, ...missing]);
        }
        if (Array.isArray(parsed.visible) && parsed.visible.length > 0) {
          const validVisible = parsed.visible.filter((id) => defaultColumnIds.includes(id));
          if (validVisible.length > 0) setVisibleColumns(validVisible);
        }
        if (parsed.pageSize && pageSizeOptions.includes(parsed.pageSize)) {
          setPageSize(parsed.pageSize);
        }
        setHasSavedLayoutInStorage(true);
      }
    } catch (e) {
      console.warn(`Error al leer layout de localStorage (${storageKey}):`, e);
    }
  }, [storageKey, defaultColumnIds, pageSizeOptions]);

  // Cerrar popovers al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        columnPopoverRef.current &&
        !columnPopoverRef.current.contains(e.target as Node)
      ) {
        setShowColumnPopover(false);
      }
      if (
        savedLayoutPopoverRef.current &&
        !savedLayoutPopoverRef.current.contains(e.target as Node)
      ) {
        setShowSavedLayoutPopover(false);
      }
      if (
        filterPopoverRef.current &&
        !filterPopoverRef.current.contains(e.target as Node)
      ) {
        setActiveFilterPopover(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Guardar layout en localStorage
  function saveLayout() {
    if (!storageKey || typeof window === 'undefined') return;
    try {
      const payload = {
        order: columnOrder,
        visible: visibleColumns,
        pageSize,
      };
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
      setLayoutSaved(true);
      setHasSavedLayoutInStorage(true);
      setTimeout(() => setLayoutSaved(false), 1800);
    } catch (e) {
      console.error(`Error al guardar layout (${storageKey}):`, e);
    }
  }

  // Restablecer layout predeterminado
  function resetLayout() {
    if (storageKey && typeof window !== 'undefined') {
      window.localStorage.removeItem(storageKey);
    }
    setColumnOrder(defaultColumnIds);
    setVisibleColumns(defaultColumnIds);
    setFilters({});
    setQuery('');
    if (onSortChange) {
      onSortChange({ id: defaultColumnIds[0] || 'creadoEn', direction: 'desc' });
    } else {
      setInternalSort(null);
    }
    setPage(1);
    setHasSavedLayoutInStorage(false);
    setShowColumnPopover(false);
    setShowSavedLayoutPopover(false);
    setActiveFilterPopover(null);
  }

  // Toggle visibilidad de columna
  function toggleColumn(id: string) {
    if (visibleColumns.includes(id) && visibleColumns.length <= 1) return; // Mantener al menos una columna
    setVisibleColumns((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  // Mover columna arriba / abajo en el popover
  function moveColumn(id: string, direction: 'up' | 'down') {
    const idx = columnOrder.indexOf(id);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= columnOrder.length) return;

    const next = [...columnOrder];
    const [moved] = next.splice(idx, 1);
    next.splice(targetIdx, 0, moved);
    setColumnOrder(next);
  }

  // Drag & drop nativo de encabezados de columnas
  function handleDragStart(colId: string) {
    setDraggedColId(colId);
  }

  function handleDragOver(e: React.DragEvent, colId: string) {
    e.preventDefault();
    if (colId !== dragOverColId) {
      setDragOverColId(colId);
    }
  }

  function handleDrop(targetColId: string) {
    if (!draggedColId || draggedColId === targetColId) {
      setDraggedColId(null);
      setDragOverColId(null);
      return;
    }
    setColumnOrder((prev) => {
      const oldIdx = prev.indexOf(draggedColId);
      const newIdx = prev.indexOf(targetColId);
      if (oldIdx === -1 || newIdx === -1) return prev;
      const next = [...prev];
      const [item] = next.splice(oldIdx, 1);
      next.splice(newIdx, 0, item);
      return next;
    });
    setDraggedColId(null);
    setDragOverColId(null);
  }

  // Manejo de ordenamiento (asc <-> desc)
  function handleSort(id: string) {
    const nextDirection: 'asc' | 'desc' =
      sort?.id === id && sort.direction === 'asc' ? 'desc' : 'asc';
    const nextSort = { id, direction: nextDirection };
    if (onSortChange) {
      onSortChange(nextSort);
    } else {
      setInternalSort(nextSort);
    }
    setPage(1);
  }

  // Detectar si el layout ha sido modificado respecto al predeterminado
  const isLayoutDirty =
    hasSavedLayoutInStorage ||
    columnOrder.some((id, index) => id !== defaultColumnIds[index]) ||
    visibleColumns.length !== defaultColumnIds.length ||
    visibleColumns.some((id) => !defaultColumnIds.includes(id));

  // Columnas visibles y ordenadas
  const orderedVisibleColumns = useMemo(() => {
    return columnOrder
      .filter((id) => visibleColumns.includes(id))
      .map((id) => {
        const col = columns.find((c, idx) => getColumnId(c, idx) === id);
        return col ? { ...col, resolvedId: id } : null;
      })
      .filter(Boolean) as (Column<T> & { resolvedId: string })[];
  }, [columnOrder, visibleColumns, columns]);

  // Filtrado y búsqueda
  const filteredData = useMemo(() => {
    if (!data) return [];
    return data.filter((row) => {
      // 1. Filtro global por query
      if (query.trim()) {
        const q = query.toLowerCase().trim();
        const matchesQuery = columns.some((col, idx) => {
          const colId = getColumnId(col, idx);
          if (col.accessor) {
            const val = row[col.accessor];
            if (val != null && String(val).toLowerCase().includes(q)) return true;
          }
          if (col.filterFn) {
            return col.filterFn(row, q);
          }
          // Fallback a propiedades string del objeto
          const rawRow = row as Record<string, any>;
          if (rawRow[colId] != null && String(rawRow[colId]).toLowerCase().includes(q)) {
            return true;
          }
          return false;
        });
        if (!matchesQuery) return false;
      }

      // 2. Filtros específicos por columna
      for (const [colId, filterVal] of Object.entries(filters)) {
        if (!filterVal || !filterVal.trim()) continue;
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
          if (
            rawRow[colId] == null ||
            !String(rawRow[colId]).toLowerCase().includes(valTrimmed)
          ) {
            return false;
          }
        }
      }

      return true;
    });
  }, [data, query, filters, columns]);

  // Ordenamiento
  const sortedData = useMemo(() => {
    // Si el ordenamiento se maneja en backend vía onSortChange, se omite el reordenamiento local
    if (onSortChange || !activeSort) return filteredData;
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
  }, [filteredData, activeSort, columns, onSortChange]);

  // Paginación
  const totalRows = sortedData.length;
  const totalPages = enablePagination ? Math.max(1, Math.ceil(totalRows / pageSize)) : 1;
  const currentPage = Math.min(page, totalPages);
  const paginatedData = enablePagination
    ? sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : sortedData;

  const startRow = totalRows > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endRow = Math.min(currentPage * pageSize, totalRows);
  const activeFiltersCount = Object.values(filters).filter((v) => v && v.trim()).length;
  const hasActiveFilters = !!query.trim() || activeFiltersCount > 0;
  const colSpan = Math.max(1, orderedVisibleColumns.length);

  return (
    <div className={`${styles.wrapper} ${className}`}>
      {/* BARRA SUPERIOR DE HERRAMIENTAS (TOOLBAR) */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarTop}>
          {/* Búsqueda global */}
          {enableSearch && (
            <div className={styles.searchBox}>
              <span className={styles.searchIcon}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={searchPlaceholder}
                className={styles.searchInput}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setPage(1);
                  }}
                  className={styles.searchClearBtn}
                  title="Limpiar búsqueda"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Acciones de la barra (Columnas, Guardar Layout, Reset, Acciones externas) */}
          <div className={styles.toolbarActions}>
            {/* Popover de Columnas */}
            {enableColumnVisibility && (
              <div className={styles.popoverWrapper} ref={columnPopoverRef}>
                <button
                  type="button"
                  onClick={() => setShowColumnPopover((v) => !v)}
                  className={styles.btnAction}
                  title="Configurar visibilidad y orden de columnas"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" y1="21" x2="4" y2="14" />
                    <line x1="4" y1="10" x2="4" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12" y2="3" />
                    <line x1="20" y1="21" x2="20" y2="16" />
                    <line x1="20" y1="12" x2="20" y2="3" />
                    <line x1="1" y1="14" x2="7" y2="14" />
                    <line x1="9" y1="8" x2="15" y2="8" />
                    <line x1="17" y1="16" x2="23" y2="16" />
                  </svg>
                  <span>Columnas ({visibleColumns.length}/{columns.length})</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {showColumnPopover && (
                  <div className={styles.popoverContent}>
                    <div className={styles.popoverHeader}>
                      <span className={styles.popoverTitle}>Columnas Visibles</span>
                      <span className={styles.popoverSubtitle}>
                        Activa columnas y usa las flechas o arrastra para reordenar
                      </span>
                    </div>

                    <div className={styles.columnList}>
                      {columnOrder.map((colId, idx) => {
                        const col = columns.find((c, i) => getColumnId(c, i) === colId);
                        if (!col) return null;
                        const isVisible = visibleColumns.includes(colId);
                        const isFirst = idx === 0;
                        const isLast = idx === columnOrder.length - 1;

                        return (
                          <div key={colId} className={styles.columnItem}>
                            <label className={styles.columnItemLabel}>
                              <input
                                type="checkbox"
                                checked={isVisible}
                                onChange={() => toggleColumn(colId)}
                                className={styles.columnCheckbox}
                              />
                              <span>{typeof col.header === 'string' ? col.header : colId}</span>
                            </label>

                            <div className={styles.columnItemOrderBtns}>
                              <button
                                type="button"
                                disabled={isFirst}
                                onClick={() => moveColumn(colId, 'up')}
                                className={styles.columnOrderBtn}
                                title="Mover columna arriba"
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                disabled={isLast}
                                onClick={() => moveColumn(colId, 'down')}
                                className={styles.columnOrderBtn}
                                title="Mover columna abajo"
                              >
                                ▼
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className={styles.popoverFooter}>
                      <button
                        type="button"
                        onClick={resetLayout}
                        className={styles.btnResetLayout}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="1 4 1 10 7 10" />
                          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                        </svg>
                        Restablecer vista inicial
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Botón de Columnas Personalizadas Guardadas (Persistencia en LocalStorage) */}
            {storageKey && (
              <div className={styles.popoverWrapper} ref={savedLayoutPopoverRef}>
                {hasSavedLayoutInStorage ? (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setShowSavedLayoutPopover((prev) => !prev)}
                      className={`${styles.btnAction} ${styles.btnSavedActive}`}
                      title="Ver estado de columnas personalizadas guardadas"
                      aria-expanded={showSavedLayoutPopover}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                      </svg>
                      <span>Columnas guardadas</span>
                      <span className={styles.savedDot} title="Configuración personalizada activa" />
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      onClick={resetLayout}
                      className={`${styles.btnAction} ${styles.btnIconOnly}`}
                      title="Restablecer columnas a valores iniciales"
                      aria-label="Restablecer layout"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="1 4 1 10 7 10" />
                        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                      </svg>
                    </button>
                  </div>
                ) : isLayoutDirty ? (
                  <button
                    type="button"
                    onClick={saveLayout}
                    className={`${styles.btnAction} ${styles.btnActionHighlight} ${layoutSaved ? styles.btnActionSuccess : ''}`}
                    title="Guardar las columnas actuales como tu vista personalizada"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                    <span>{layoutSaved ? '¡Columnas guardadas!' : 'Guardar columnas personalizadas'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={saveLayout}
                    className={`${styles.btnAction} ${layoutSaved ? styles.btnActionSuccess : ''}`}
                    title="Guardar la configuración actual de columnas como tu vista personalizada"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                    <span>{layoutSaved ? '¡Columnas guardadas!' : 'Columnas personalizadas'}</span>
                  </button>
                )}

                {showSavedLayoutPopover && hasSavedLayoutInStorage && (
                  <div className={styles.popoverContent} style={{ width: '270px' }}>
                    <div className={styles.popoverHeader}>
                      <span className={styles.popoverTitle}>Columnas Personalizadas</span>
                      <span className={styles.popoverSubtitle}>
                        Configuración guardada en este navegador ({visibleColumns.length} de {columns.length} visibles)
                      </span>
                    </div>

                    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {isLayoutDirty && (
                        <button
                          type="button"
                          onClick={() => {
                            saveLayout();
                            setShowSavedLayoutPopover(false);
                          }}
                          className={`${styles.btnAction} ${styles.btnActionSuccess}`}
                          style={{ width: '100%', justifyContent: 'center' }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                            <polyline points="17 21 17 13 7 13 7 21" />
                          </svg>
                          Actualizar guardado actual
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          resetLayout();
                          setShowSavedLayoutPopover(false);
                        }}
                        className={styles.btnResetLayout}
                        style={{ width: '100%', justifyContent: 'center', padding: '8px' }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="1 4 1 10 7 10" />
                          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                        </svg>
                        Restablecer a vista inicial
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Acciones adicionales provistas por la vista */}
            {actions}
          </div>
        </div>

        {/* Indicador de filtros activos */}
        {hasActiveFilters && (
          <div className={styles.activeFiltersRow}>
            <span>
              <strong>{totalRows}</strong> resultado{totalRows === 1 ? '' : 's'} encontrado{totalRows === 1 ? '' : 's'}
              {activeFiltersCount > 0 && ` con ${activeFiltersCount} filtro${activeFiltersCount === 1 ? '' : 's'} de columna`}
            </span>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setFilters({});
                setPage(1);
              }}
              className={styles.btnClearAll}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Limpiar búsqueda y filtros
            </button>
          </div>
        )}
      </div>

      {/* ÁREA DE TABLA */}
      <div className={styles.tableContainer}>
        <table className={`${styles.table} ${tableClassName}`}>
          <thead className={styles.thead}>
            <tr>
              {orderedVisibleColumns.map((col) => {
                const colId = col.resolvedId;
                const isSortable = col.sortable !== false && (!!col.accessor || !!col.sortFn);
                const isFilterable = col.filterable !== false && (!!col.accessor || !!col.filterFn);
                const alignStyle: React.CSSProperties = col.align ? { textAlign: col.align } : {};
                const widthStyle: React.CSSProperties = col.width ? { width: col.width } : {};
                const isDragging = draggedColId === colId;
                const isDragOver = dragOverColId === colId;
                const activeFilterValue = filters[colId] || '';
                const isFilterActive = !!activeFilterValue.trim();

                return (
                  <th
                    key={colId}
                    draggable
                    onDragStart={() => handleDragStart(colId)}
                    onDragOver={(e) => handleDragOver(e, colId)}
                    onDrop={() => handleDrop(colId)}
                    className={`${styles.th} ${col.headerClassName || ''} ${isDragging ? styles.thDragging : ''} ${isDragOver ? styles.thDragOver : ''}`}
                    style={{ ...alignStyle, ...widthStyle, ...col.headerStyle }}
                  >
                    <div className={styles.thContent}>
                      {/* Drag handle */}
                      <span
                        className={styles.dragHandle}
                        title="Arrastra para reordenar columna"
                        aria-label="Arrastrar columna"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="9" cy="5" r="1" />
                          <circle cx="9" cy="12" r="1" />
                          <circle cx="9" cy="19" r="1" />
                          <circle cx="15" cy="5" r="1" />
                          <circle cx="15" cy="12" r="1" />
                          <circle cx="15" cy="19" r="1" />
                        </svg>
                      </span>

                      {/* Botón de Filtro por columna */}
                      {isFilterable && (
                        <div
                          className={styles.headerFilterWrapper}
                          ref={activeFilterPopover === colId ? filterPopoverRef : undefined}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveFilterPopover((curr) => (curr === colId ? null : colId));
                            }}
                            className={`${styles.btnHeaderFilter} ${isFilterActive ? styles.btnHeaderFilterActive : ''}`}
                            title={`Filtrar por ${typeof col.header === 'string' ? col.header : colId}`}
                            aria-label={`Filtrar ${colId}`}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill={isFilterActive ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                            </svg>
                          </button>

                          {activeFilterPopover === colId && (
                            <div
                              className={styles.headerFilterPopover}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className={styles.headerFilterHeader}>
                                <span>Filtrar {typeof col.header === 'string' ? col.header : colId}</span>
                                {isFilterActive && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFilters((prev) => {
                                        const next = { ...prev };
                                        delete next[colId];
                                        return next;
                                      });
                                      setPage(1);
                                    }}
                                    className={styles.headerFilterClearBtn}
                                  >
                                    Limpiar
                                  </button>
                                )}
                              </div>
                              <input
                                type="text"
                                autoFocus
                                value={activeFilterValue}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setFilters((prev) => ({ ...prev, [colId]: val }));
                                  setPage(1);
                                }}
                                placeholder="Escribe para filtrar..."
                                className={styles.headerFilterInput}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Nombre y Ordenamiento */}
                      {isSortable ? (
                        <button
                          type="button"
                          onClick={() => handleSort(colId)}
                          className={`${styles.btnSort} ${activeSort?.id === colId ? styles.btnSortActive : ''}`}
                          title={`Ordenar por ${typeof col.header === 'string' ? col.header : colId}`}
                          aria-label={`Ordenar por ${typeof col.header === 'string' ? col.header : colId}`}
                        >
                          <span>{col.header}</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path
                              d="m7 9 5-5 5 5"
                              stroke={activeSort?.id === colId ? (activeSort.direction === 'asc' ? 'currentColor' : '#cbd5e1') : '#94a3b8'}
                            />
                            <path
                              d="m7 15 5 5 5-5"
                              stroke={activeSort?.id === colId ? (activeSort.direction === 'desc' ? 'currentColor' : '#cbd5e1') : '#94a3b8'}
                            />
                          </svg>
                        </button>
                      ) : (
                        <span>{col.header}</span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {error ? (
              <tr>
                <td colSpan={colSpan} className={styles.stateCell}>
                  <div className={styles.errorAlert}>
                    <div className={styles.errorText}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span>{errorMessage || (error as any)?.message || 'Error al cargar los registros.'}</span>
                    </div>
                    {onRetry && (
                      <button type="button" onClick={onRetry} className={styles.retryBtn}>
                        Reintentar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : loading ? (
              <tr>
                <td colSpan={colSpan} className={styles.stateCell}>
                  <div className={styles.loadingWrapper}>
                    <div className={styles.spinner} />
                    <span>{loadingMessage}</span>
                  </div>
                </td>
              </tr>
            ) : totalRows === 0 ? (
              <tr>
                <td colSpan={colSpan} className={styles.stateCell}>
                  <div className={styles.emptyWrapper}>
                    {emptyIcon || (
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    )}
                    <span>{hasActiveFilters ? 'No se encontraron resultados para los filtros aplicados.' : emptyMessage}</span>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={() => {
                          setQuery('');
                          setFilters({});
                          setPage(1);
                        }}
                        className={styles.btnClearAll}
                        style={{ marginTop: '4px' }}
                      >
                        Limpiar búsqueda
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIdx) => {
                const globalIdx = enablePagination ? (currentPage - 1) * pageSize + rowIdx : rowIdx;
                const isClickable = !!onRowClick;
                const customRowClass = rowClassName ? rowClassName(row, globalIdx) : '';

                return (
                  <tr
                    key={keyExtractor(row, globalIdx)}
                    className={`${styles.tr} ${isClickable ? styles.trClickable : ''} ${customRowClass}`}
                    onClick={onRowClick ? () => onRowClick(row, globalIdx) : undefined}
                  >
                    {orderedVisibleColumns.map((col, colIdx) => {
                      const alignStyle: React.CSSProperties = col.align ? { textAlign: col.align } : {};
                      let cellContent: React.ReactNode = null;

                      if (col.cell) {
                        cellContent = col.cell(row, globalIdx);
                      } else if (col.accessor) {
                        const val = row[col.accessor];
                        cellContent = val != null ? String(val) : '';
                      }

                      return (
                        <td
                          key={col.resolvedId || colIdx}
                          className={`${styles.td} ${col.className || ''}`}
                          style={{ ...alignStyle, ...col.style }}
                        >
                          {cellContent}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* BARRA INFERIOR DE PAGINACIÓN */}
      {enablePagination && totalRows > 0 && (
        <div className={styles.paginationBar}>
          <div className={styles.paginationInfo}>
            Mostrando <strong>{startRow}</strong>–<strong>{endRow}</strong> de <strong>{totalRows}</strong> registros
          </div>

          <div className={styles.paginationControls}>
            <div className={styles.pageSizeSelector}>
              <span>Filas por página:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className={styles.pageSizeSelect}
                aria-label="Filas por página"
              >
                {pageSizeOptions.map((sz) => (
                  <option key={sz} value={sz}>
                    {sz}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.pageNav}>
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={styles.btnPageNav}
                title="Página anterior"
                aria-label="Página anterior"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>

              <span className={styles.pageNavLabel}>
                Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className={styles.btnPageNav}
                title="Página siguiente"
                aria-label="Página siguiente"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer personalizado opcional */}
      {footer && <div className={styles.tableCustomFooter}>{footer}</div>}
    </div>
  );
}
