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

export interface ColumnPreset {
  id: string;
  name: string;
  order: string[];
  visible: string[];
  pageSize?: number;
  createdAt: string;
}

function parseStoredLayout(
  raw: string,
  defaultColumnIds: string[]
): { presets: ColumnPreset[]; activePresetId: string | null } {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.presets)) {
      const validPresets: ColumnPreset[] = parsed.presets.map((p: any, idx: number) => {
        const validOrder = Array.isArray(p.order)
          ? p.order.filter((id: string) => defaultColumnIds.includes(id))
          : [];
        const missing = defaultColumnIds.filter((id) => !validOrder.includes(id));
        const validVisible = Array.isArray(p.visible)
          ? p.visible.filter((id: string) => defaultColumnIds.includes(id))
          : defaultColumnIds;
        return {
          id: p.id || `preset-${idx + 1}`,
          name: p.name || `Vista ${idx + 1}`,
          order: [...validOrder, ...missing],
          visible: validVisible.length > 0 ? validVisible : defaultColumnIds,
          pageSize: p.pageSize,
          createdAt: p.createdAt || new Date().toISOString(),
        };
      });
      return {
        presets: validPresets,
        activePresetId: parsed.activePresetId || null,
      };
    } else if (parsed && (parsed.order || parsed.visible)) {
      const validOrder = Array.isArray(parsed.order)
        ? parsed.order.filter((id: string) => defaultColumnIds.includes(id))
        : [];
      const missing = defaultColumnIds.filter((id) => !validOrder.includes(id));
      const validVisible = Array.isArray(parsed.visible)
        ? parsed.visible.filter((id: string) => defaultColumnIds.includes(id))
        : defaultColumnIds;
      const legacyPreset: ColumnPreset = {
        id: 'preset-migrated',
        name: 'Vista personalizada',
        order: [...validOrder, ...missing],
        visible: validVisible.length > 0 ? validVisible : defaultColumnIds,
        pageSize: parsed.pageSize,
        createdAt: new Date().toISOString(),
      };
      return {
        presets: [legacyPreset],
        activePresetId: legacyPreset.id,
      };
    }
  } catch (e) {
    console.warn('Error al parsear layout de localStorage:', e);
  }
  return { presets: [], activePresetId: null };
}

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

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
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
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
  const [presets, setPresets] = useState<ColumnPreset[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [isCreatingPreset, setIsCreatingPreset] = useState<boolean>(false);
  const [newPresetName, setNewPresetName] = useState<string>('');

  // Popovers abiertos
  const [showColumnPopover, setShowColumnPopover] = useState<boolean>(false);
  const [showSavedLayoutPopover, setShowSavedLayoutPopover] = useState<boolean>(false);
  const [activeFilterPopover, setActiveFilterPopover] = useState<string | null>(null);

  // Drag state para reordenar columnas
  const [draggedColId, setDraggedColId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  // Referencias para cerrar popovers al hacer click fuera y control de carga única
  const columnPopoverRef = useRef<HTMLDivElement>(null);
  const savedLayoutPopoverRef = useRef<HTMLDivElement>(null);
  const filterPopoverRef = useRef<HTMLDivElement>(null);
  const lastLoadedKeyRef = useRef<string | null>(null);

  // Cargar layout desde localStorage una sola vez al montar o si cambia storageKey
  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return;
    if (lastLoadedKeyRef.current === storageKey) return;
    lastLoadedKeyRef.current = storageKey;

    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const { presets: loadedPresets, activePresetId: loadedActiveId } = parseStoredLayout(
          saved,
          defaultColumnIds
        );
        if (loadedPresets.length > 0) {
          setPresets(loadedPresets);
          setHasSavedLayoutInStorage(true);

          if (loadedActiveId) {
            const active = loadedPresets.find((p) => p.id === loadedActiveId);
            if (active) {
              setActivePresetId(active.id);
              setColumnOrder(active.order);
              setVisibleColumns(active.visible);
              if (active.pageSize && pageSizeOptions.includes(active.pageSize)) {
                setPageSize((prev) => (prev === active.pageSize ? prev : active.pageSize!));
              }
            }
          } else {
            setActivePresetId(null);
          }
        } else {
          setPresets([]);
          setActivePresetId(null);
          setHasSavedLayoutInStorage(false);
        }
      } else {
        setPresets([]);
        setActivePresetId(null);
        setHasSavedLayoutInStorage(false);
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
        setIsCreatingPreset(false);
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

  // Preset actualmente activo
  const activePreset = useMemo(
    () => presets.find((p) => p.id === activePresetId) || null,
    [presets, activePresetId]
  );

  // Detectar si el layout ha sido modificado respecto al predeterminado
  const isModifiedFromDefault =
    columnOrder.some((id, index) => id !== defaultColumnIds[index]) ||
    visibleColumns.length !== defaultColumnIds.length ||
    visibleColumns.some((id) => !defaultColumnIds.includes(id));

  // Detectar si el preset activo tiene modificaciones pendientes sin guardar
  const isActivePresetModified = activePreset
    ? columnOrder.some((id, idx) => id !== activePreset.order[idx]) ||
      visibleColumns.length !== activePreset.visible.length ||
      visibleColumns.some((id) => !activePreset.visible.includes(id)) ||
      (activePreset.pageSize && pageSize !== activePreset.pageSize)
    : false;

  // Estado modificado global
  const isLayoutDirty = activePreset ? isActivePresetModified : isModifiedFromDefault;

  // Guardar layout en localStorage (permite nombre personalizado)
  function saveLayout(customName?: string) {
    if (!storageKey || typeof window === 'undefined') return;
    try {
      let updatedPresets: ColumnPreset[];
      let targetActiveId: string;

      const trimmedName = customName?.trim();

      if (activePreset && !trimmedName) {
        // Actualizar preset activo existente
        targetActiveId = activePreset.id;
        updatedPresets = presets.map((p) =>
          p.id === activePreset.id
            ? { ...p, order: columnOrder, visible: visibleColumns, pageSize }
            : p
        );
      } else {
        // Crear un nuevo preset
        targetActiveId = `preset-${Date.now()}`;
        const newPreset: ColumnPreset = {
          id: targetActiveId,
          name: trimmedName || `Vista ${presets.length + 1}`,
          order: columnOrder,
          visible: visibleColumns,
          pageSize,
          createdAt: new Date().toISOString(),
        };
        updatedPresets = [...presets, newPreset];
      }

      const payload = {
        presets: updatedPresets,
        activePresetId: targetActiveId,
        order: columnOrder,
        visible: visibleColumns,
        pageSize,
      };

      window.localStorage.setItem(storageKey, JSON.stringify(payload));
      setPresets(updatedPresets);
      setActivePresetId(targetActiveId);
      setLayoutSaved(true);
      setHasSavedLayoutInStorage(true);
      setIsCreatingPreset(false);
      setNewPresetName('');
      setTimeout(() => setLayoutSaved(false), 2000);
    } catch (e) {
      console.error(`Error al guardar layout (${storageKey}):`, e);
    }
  }

  // Activar un preset existente
  function applyPreset(preset: ColumnPreset) {
    setColumnOrder(preset.order);
    setVisibleColumns(preset.visible);
    if (preset.pageSize && pageSizeOptions.includes(preset.pageSize)) {
      setPageSize(preset.pageSize);
    }
    setActivePresetId(preset.id);
    setPage(1);

    if (storageKey && typeof window !== 'undefined') {
      try {
        const payload = {
          presets,
          activePresetId: preset.id,
          order: preset.order,
          visible: preset.visible,
          pageSize: preset.pageSize || pageSize,
        };
        window.localStorage.setItem(storageKey, JSON.stringify(payload));
      } catch (e) {
        console.warn(`Error al actualizar preset activo en localStorage:`, e);
      }
    }
    setShowSavedLayoutPopover(false);
  }

  // Activar vista predeterminada inicial
  function applyDefaultPreset() {
    setColumnOrder(defaultColumnIds);
    setVisibleColumns(defaultColumnIds);
    setActivePresetId(null);
    setPage(1);

    if (storageKey && typeof window !== 'undefined') {
      try {
        const payload = {
          presets,
          activePresetId: null,
          order: defaultColumnIds,
          visible: defaultColumnIds,
          pageSize,
        };
        window.localStorage.setItem(storageKey, JSON.stringify(payload));
      } catch (e) {
        console.warn(`Error al actualizar preset activo en localStorage:`, e);
      }
    }
    setShowSavedLayoutPopover(false);
  }

  // Eliminar un preset específico
  function deletePreset(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const updatedPresets = presets.filter((p) => p.id !== id);
    const wasActive = activePresetId === id;
    const nextActiveId = wasActive ? null : activePresetId;

    if (wasActive) {
      setColumnOrder(defaultColumnIds);
      setVisibleColumns(defaultColumnIds);
      setActivePresetId(null);
    }
    setPresets(updatedPresets);

    if (storageKey && typeof window !== 'undefined') {
      try {
        if (updatedPresets.length === 0) {
          window.localStorage.removeItem(storageKey);
          setHasSavedLayoutInStorage(false);
        } else {
          const payload = {
            presets: updatedPresets,
            activePresetId: nextActiveId,
          };
          window.localStorage.setItem(storageKey, JSON.stringify(payload));
        }
      } catch (e) {
        console.warn(`Error al eliminar preset en localStorage:`, e);
      }
    }
  }

  // Restablecer layout predeterminado (elimina todas las vistas y vuelve al inicio)
  function resetLayout() {
    if (storageKey && typeof window !== 'undefined') {
      window.localStorage.removeItem(storageKey);
    }
    setPresets([]);
    setActivePresetId(null);
    setIsCreatingPreset(false);
    setNewPresetName('');
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

            {/* Menú de Vistas Personalizadas (Presets de Columnas) */}
            {storageKey && (
              <div className={styles.popoverWrapper} ref={savedLayoutPopoverRef}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setShowSavedLayoutPopover((prev) => !prev)}
                    className={`${styles.btnAction} ${
                      activePreset
                        ? styles.btnSavedActive
                        : isLayoutDirty
                        ? styles.btnActionHighlight
                        : ''
                    } ${layoutSaved ? styles.btnActionSuccess : ''}`}
                    title="Vistas de columnas personalizadas con nombre"
                    aria-expanded={showSavedLayoutPopover}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                    <span>
                      {layoutSaved
                        ? '¡Vista guardada!'
                        : activePreset
                        ? activePreset.name
                        : presets.length > 0
                        ? `Vistas (${presets.length})`
                        : 'Vistas guardadas'}
                    </span>
                    {activePreset && (
                      <span
                        className={styles.savedDot}
                        title={
                          isActivePresetModified
                            ? 'Vista activa con cambios pendientes'
                            : 'Vista personalizada activa'
                        }
                        style={
                          isActivePresetModified
                            ? { backgroundColor: '#f59e0b' }
                            : undefined
                        }
                      />
                    )}
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {(activePreset || isLayoutDirty) && (
                    <button
                      type="button"
                      onClick={applyDefaultPreset}
                      className={`${styles.btnAction} ${styles.btnIconOnly}`}
                      title="Volver a la vista predeterminada"
                      aria-label="Vista predeterminada"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="1 4 1 10 7 10" />
                        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                      </svg>
                    </button>
                  )}
                </div>

                {showSavedLayoutPopover && (
                  <div className={styles.popoverContent} style={{ width: '310px' }}>
                    <div className={styles.popoverHeader}>
                      <span className={styles.popoverTitle}>Vistas de Columnas</span>
                      <span className={styles.popoverSubtitle}>
                        Selecciona o administra tus configuraciones personalizadas
                      </span>
                    </div>

                    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {/* Alerta de cambios no guardados en la vista activa */}
                      {activePreset && isActivePresetModified && (
                        <div
                          style={{
                            padding: '8px 10px',
                            background: 'rgba(245, 158, 11, 0.1)',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            borderRadius: '6px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                          }}
                        >
                          <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                            Has modificado columnas en <strong>{activePreset.name}</strong>.
                          </span>
                          <button
                            type="button"
                            onClick={() => saveLayout()}
                            className={`${styles.btnAction} ${styles.btnActionSuccess}`}
                            style={{ height: '28px', fontSize: '11.5px', justifyContent: 'center', width: '100%' }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                              <polyline points="17 21 17 13 7 13 7 21" />
                            </svg>
                            Guardar cambios en esta vista
                          </button>
                        </div>
                      )}

                      {/* Lista de presets */}
                      <div className={styles.presetList}>
                        {/* 1. Vista Predeterminada */}
                        <div
                          className={`${styles.presetItem} ${
                            !activePreset && !isModifiedFromDefault ? styles.presetItemActive : ''
                          }`}
                          onClick={applyDefaultPreset}
                          role="button"
                          tabIndex={0}
                        >
                          <div className={styles.presetItemLeft}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                              <line x1="3" y1="9" x2="21" y2="9" />
                              <line x1="9" y1="21" x2="9" y2="9" />
                            </svg>
                            <div className={styles.presetInfo}>
                              <span className={styles.presetName}>Vista predeterminada</span>
                              <span className={styles.presetMeta}>
                                Todas las columnas ({defaultColumnIds.length})
                              </span>
                            </div>
                          </div>
                          {!activePreset && !isModifiedFromDefault && (
                            <span className={styles.presetActiveBadge}>Activa</span>
                          )}
                        </div>

                        {/* 2. Presets Guardados */}
                        {presets.map((preset) => {
                          const isCurrent = activePreset?.id === preset.id;
                          return (
                            <div
                              key={preset.id}
                              className={`${styles.presetItem} ${isCurrent ? styles.presetItemActive : ''}`}
                              onClick={() => applyPreset(preset)}
                              role="button"
                              tabIndex={0}
                            >
                              <div className={styles.presetItemLeft}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                                </svg>
                                <div className={styles.presetInfo}>
                                  <span className={styles.presetName} title={preset.name}>
                                    {preset.name}
                                  </span>
                                  <span className={styles.presetMeta}>
                                    {preset.visible.length} columnas visibles
                                  </span>
                                </div>
                              </div>

                              <div className={styles.presetActionsRight}>
                                {isCurrent && (
                                  <span className={styles.presetActiveBadge}>Activa</span>
                                )}
                                <button
                                  type="button"
                                  className={styles.presetDeleteBtn}
                                  onClick={(e) => deletePreset(preset.id, e)}
                                  title={`Eliminar vista "${preset.name}"`}
                                  aria-label={`Eliminar vista ${preset.name}`}
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Sección para crear nueva vista con nombre */}
                      <div className={styles.presetCreateBox}>
                        {isCreatingPreset ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              saveLayout(newPresetName);
                            }}
                            style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                          >
                            <input
                              type="text"
                              value={newPresetName}
                              onChange={(e) => setNewPresetName(e.target.value)}
                              placeholder={`Nombre de vista (ej. Vista ${presets.length + 1})`}
                              className={styles.presetInput}
                              autoFocus
                              maxLength={40}
                            />
                            <div className={styles.presetCreateActions}>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsCreatingPreset(false);
                                  setNewPresetName('');
                                }}
                                className={styles.btnPresetCancel}
                              >
                                Cancelar
                              </button>
                              <button
                                type="submit"
                                className={styles.btnPresetSave}
                              >
                                Guardar
                              </button>
                            </div>
                          </form>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setIsCreatingPreset(true);
                              setNewPresetName(`Vista ${presets.length + 1}`);
                            }}
                            className={styles.btnCreatePresetTrigger}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="5" x2="12" y2="19" />
                              <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Guardar vista actual con nombre
                          </button>
                        )}
                      </div>
                    </div>

                    <div className={styles.popoverFooter}>
                      <button
                        type="button"
                        onClick={resetLayout}
                        className={styles.btnResetLayout}
                        title="Borrar todas las vistas guardadas y volver al origen"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="1 4 1 10 7 10" />
                          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                        </svg>
                        Restablecer todo
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
                    onClick={
                      onRowClick
                        ? (e) => {
                            const target = e.target as HTMLElement | null;
                            if (
                              target &&
                              target.closest(
                                'button:not([data-row-click="true"]), a:not([data-row-click="true"]), input, select, textarea, [data-prevent-row-click="true"]'
                              )
                            ) {
                              return;
                            }
                            onRowClick(row, globalIdx);
                          }
                        : undefined
                    }
                    role={isClickable ? 'button' : undefined}
                    tabIndex={isClickable ? 0 : undefined}
                    onKeyDown={
                      isClickable
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onRowClick(row, globalIdx);
                            }
                          }
                        : undefined
                    }
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
