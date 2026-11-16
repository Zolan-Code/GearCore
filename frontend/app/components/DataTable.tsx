'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './data-table.module.css';
import {
  SearchIcon,
  CloseIcon,
  ColumnsIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BookmarkIcon,
  ResetIcon,
  SaveDiskIcon,
  GridIcon,
  TrashIcon,
  PlusIcon,
  DragGripIcon,
  FilterFunnelIcon,
  SortArrowsIcon,
  AlertCircleIcon,
  EmptySearchIcon,
} from './DataTableIcons';
import { parseStoredLayout } from './dataTableStorage';
import {
  getColumnId,
  filterTableData,
  sortTableData,
} from './dataTableHelpers';

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

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string | number;
  renderCard?: (row: T, index: number) => React.ReactNode;
  storageKey?: string;
  title?: string;
  searchPlaceholder?: string;
  initialQuery?: string;
  enableSearch?: boolean;
  enableColumnVisibility?: boolean;
  enablePagination?: boolean;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
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

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function DataTable<T>({
  columns,
  data,
  keyExtractor,
  renderCard,
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
  const defaultColumnIds = useMemo(() => columns.map(getColumnId), [columns]);

  const [columnOrder, setColumnOrder] = useState<string[]>(defaultColumnIds);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(defaultColumnIds);
  const [pageSize, setPageSize] = useState<number>(defaultPageSize);
  const [page, setPage] = useState<number>(1);
  const [query, setQuery] = useState<string>(initialQuery);

  useEffect(() => {
    if (initialQuery !== undefined) setQuery(initialQuery);
  }, [initialQuery]);

  const [filters, setFilters] = useState<Record<string, string>>({});
  const [internalSort, setInternalSort] = useState<{ id: string; direction: 'asc' | 'desc' } | null>(null);
  const sort = controlledSort !== undefined ? controlledSort : internalSort;

  const [layoutSaved, setLayoutSaved] = useState<boolean>(false);
  const [hasSavedLayoutInStorage, setHasSavedLayoutInStorage] = useState<boolean>(false);
  const [presets, setPresets] = useState<ColumnPreset[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [isCreatingPreset, setIsCreatingPreset] = useState<boolean>(false);
  const [newPresetName, setNewPresetName] = useState<string>('');

  const [showColumnPopover, setShowColumnPopover] = useState<boolean>(false);
  const [showSavedLayoutPopover, setShowSavedLayoutPopover] = useState<boolean>(false);
  const [activeFilterPopover, setActiveFilterPopover] = useState<string | null>(null);

  const [draggedColId, setDraggedColId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  const columnPopoverRef = useRef<HTMLDivElement>(null);
  const savedLayoutPopoverRef = useRef<HTMLDivElement>(null);
  const filterPopoverRef = useRef<HTMLDivElement>(null);
  const lastLoadedKeyRef = useRef<string | null>(null);

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
        }
      }
    } catch (e) {
      console.warn(`Error al leer layout de localStorage (${storageKey}):`, e);
    }
  }, [storageKey, defaultColumnIds, pageSizeOptions]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (columnPopoverRef.current && !columnPopoverRef.current.contains(target)) {
        setShowColumnPopover(false);
      }
      if (savedLayoutPopoverRef.current && !savedLayoutPopoverRef.current.contains(target)) {
        setShowSavedLayoutPopover(false);
        setIsCreatingPreset(false);
      }
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(target)) {
        setActiveFilterPopover(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activePreset = useMemo(
    () => presets.find((p) => p.id === activePresetId) || null,
    [presets, activePresetId]
  );

  const isModifiedFromDefault =
    columnOrder.some((id, index) => id !== defaultColumnIds[index]) ||
    visibleColumns.length !== defaultColumnIds.length ||
    visibleColumns.some((id) => !defaultColumnIds.includes(id));

  const isActivePresetModified = activePreset
    ? columnOrder.some((id, idx) => id !== activePreset.order[idx]) ||
      visibleColumns.length !== activePreset.visible.length ||
      visibleColumns.some((id) => !activePreset.visible.includes(id)) ||
      (activePreset.pageSize && pageSize !== activePreset.pageSize)
    : false;

  const isLayoutDirty = activePreset ? isActivePresetModified : isModifiedFromDefault;

  function saveLayout(customName?: string) {
    if (!storageKey || typeof window === 'undefined') return;
    try {
      let updatedPresets: ColumnPreset[];
      let targetActiveId: string;
      const trimmedName = customName?.trim();

      if (activePreset && !trimmedName) {
        targetActiveId = activePreset.id;
        updatedPresets = presets.map((p) =>
          p.id === activePreset.id
            ? { ...p, order: columnOrder, visible: visibleColumns, pageSize }
            : p
        );
      } else {
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
          window.localStorage.setItem(
            storageKey,
            JSON.stringify({ presets: updatedPresets, activePresetId: nextActiveId })
          );
        }
      } catch (e) {
        console.warn(`Error al eliminar preset en localStorage:`, e);
      }
    }
  }

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

  function toggleColumn(id: string) {
    if (visibleColumns.includes(id) && visibleColumns.length <= 1) return;
    setVisibleColumns((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

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

  function handleDragStart(colId: string) {
    setDraggedColId(colId);
  }

  function handleDragOver(e: React.DragEvent, colId: string) {
    e.preventDefault();
    if (colId !== dragOverColId) setDragOverColId(colId);
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

  const orderedVisibleColumns = useMemo(() => {
    return columnOrder
      .filter((id) => visibleColumns.includes(id))
      .map((id) => {
        const col = columns.find((c, idx) => getColumnId(c, idx) === id);
        return col ? { ...col, resolvedId: id } : null;
      })
      .filter(Boolean) as (Column<T> & { resolvedId: string })[];
  }, [columnOrder, visibleColumns, columns]);

  const filteredData = useMemo(
    () => filterTableData(data, query, filters, columns),
    [data, query, filters, columns]
  );

  const sortedData = useMemo(
    () => sortTableData(filteredData, sort, columns, !!onSortChange),
    [filteredData, sort, columns, onSortChange]
  );

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
    <div className={`${styles.wrapper} ${renderCard ? styles.wrapperWithCards : ''} ${className}`}>
      {/* TOOLBAR */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarTop}>
          {enableSearch && (
            <div className={styles.searchBox}>
              <span className={styles.searchIcon}>
                <SearchIcon />
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
                  <CloseIcon />
                </button>
              )}
            </div>
          )}

          <div className={styles.toolbarActions}>
            {enableColumnVisibility && (
              <div className={`${styles.popoverWrapper} ${styles.desktopOnlyToolbarItem}`} ref={columnPopoverRef}>
                <button
                  type="button"
                  onClick={() => setShowColumnPopover((v) => !v)}
                  className={styles.btnAction}
                  title="Configurar visibilidad y orden de columnas"
                >
                  <ColumnsIcon />
                  <span>Columnas ({visibleColumns.length}/{columns.length})</span>
                  <ChevronDownIcon />
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
                        return (
                          <div key={colId} className={styles.columnItem}>
                            <label className={styles.columnItemLabel}>
                              <input
                                type="checkbox"
                                checked={visibleColumns.includes(colId)}
                                onChange={() => toggleColumn(colId)}
                                className={styles.columnCheckbox}
                              />
                              <span>{typeof col.header === 'string' ? col.header : colId}</span>
                            </label>

                            <div className={styles.columnItemOrderBtns}>
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => moveColumn(colId, 'up')}
                                className={styles.columnOrderBtn}
                                title="Mover columna arriba"
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                disabled={idx === columnOrder.length - 1}
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
                      <button type="button" onClick={resetLayout} className={styles.btnResetLayout}>
                        <ResetIcon />
                        Restablecer vista inicial
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {storageKey && (
              <div className={`${styles.popoverWrapper} ${styles.desktopOnlyToolbarItem}`} ref={savedLayoutPopoverRef}>
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
                    <BookmarkIcon />
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
                        style={isActivePresetModified ? { backgroundColor: '#f59e0b' } : undefined}
                      />
                    )}
                    <ChevronDownIcon size={11} />
                  </button>

                  {(activePreset || isLayoutDirty) && (
                    <button
                      type="button"
                      onClick={applyDefaultPreset}
                      className={`${styles.btnAction} ${styles.btnIconOnly}`}
                      title="Volver a la vista predeterminada"
                      aria-label="Vista predeterminada"
                    >
                      <ResetIcon size={14} />
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
                            <SaveDiskIcon />
                            Guardar cambios en esta vista
                          </button>
                        </div>
                      )}

                      <div className={styles.presetList}>
                        <div
                          className={`${styles.presetItem} ${
                            !activePreset && !isModifiedFromDefault ? styles.presetItemActive : ''
                          }`}
                          onClick={applyDefaultPreset}
                          role="button"
                          tabIndex={0}
                        >
                          <div className={styles.presetItemLeft}>
                            <GridIcon />
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
                                <BookmarkIcon />
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
                                {isCurrent && <span className={styles.presetActiveBadge}>Activa</span>}
                                <button
                                  type="button"
                                  className={styles.presetDeleteBtn}
                                  onClick={(e) => deletePreset(preset.id, e)}
                                  title={`Eliminar vista "${preset.name}"`}
                                  aria-label={`Eliminar vista ${preset.name}`}
                                >
                                  <TrashIcon />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

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
                              <button type="submit" className={styles.btnPresetSave}>
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
                            <PlusIcon />
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
                        <ResetIcon />
                        Restablecer todo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {actions}
          </div>
        </div>

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
              <CloseIcon size={12} />
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
                const activeFilterValue = filters[colId] || '';
                const isFilterActive = !!activeFilterValue.trim();

                return (
                  <th
                    key={colId}
                    draggable
                    onDragStart={() => handleDragStart(colId)}
                    onDragOver={(e) => handleDragOver(e, colId)}
                    onDrop={() => handleDrop(colId)}
                    className={`${styles.th} ${col.headerClassName || ''} ${
                      draggedColId === colId ? styles.thDragging : ''
                    } ${dragOverColId === colId ? styles.thDragOver : ''}`}
                    style={{
                      ...(col.align ? { textAlign: col.align } : {}),
                      ...(col.width ? { width: col.width } : {}),
                      ...col.headerStyle,
                    }}
                  >
                    <div className={styles.thContent}>
                      <span className={styles.dragHandle} title="Arrastra para reordenar columna" aria-label="Arrastrar columna">
                        <DragGripIcon />
                      </span>

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
                            <FilterFunnelIcon active={isFilterActive} />
                          </button>

                          {activeFilterPopover === colId && (
                            <div className={styles.headerFilterPopover} onClick={(e) => e.stopPropagation()}>
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

                      {isSortable ? (
                        <button
                          type="button"
                          onClick={() => handleSort(colId)}
                          className={`${styles.btnSort} ${sort?.id === colId ? styles.btnSortActive : ''}`}
                          title={`Ordenar por ${typeof col.header === 'string' ? col.header : colId}`}
                          aria-label={`Ordenar por ${typeof col.header === 'string' ? col.header : colId}`}
                        >
                          <span>{col.header}</span>
                          <SortArrowsIcon direction={sort?.id === colId ? sort.direction : null} />
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
                      <AlertCircleIcon />
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
              Array.from({ length: Math.min(pageSize, 5) }).map((_, rIdx) => (
                <tr key={`skeleton-row-${rIdx}`} className={`${styles.skeletonRow} ${styles.loadingWrapper}`}>
                  {orderedVisibleColumns.map((col, cIdx) => (
                    <td key={`skeleton-cell-${cIdx}`} className={styles.td}>
                      <div
                        className={styles.skeletonBar}
                        style={{
                          width:
                            cIdx === 0
                              ? '60%'
                              : cIdx === orderedVisibleColumns.length - 1
                              ? '45%'
                              : `${50 + ((rIdx * 7 + cIdx * 13) % 4) * 12}%`,
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : totalRows === 0 ? (
              <tr>
                <td colSpan={colSpan} className={styles.stateCell}>
                  <div className={styles.emptyWrapper}>
                    {emptyIcon || <EmptySearchIcon />}
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
                          style={{
                            ...(col.align ? { textAlign: col.align } : {}),
                            ...col.style,
                          }}
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

      {/* VISTA MÓVIL EN TARJETAS */}
      {renderCard && (
        <div className={styles.mobileCardsContainer}>
          {loading ? (
            <div className={styles.mobileCardsSkeleton}>
              {[1, 2, 3].map((n) => (
                <div key={n} className={styles.mobileCardSkeletonItem}>
                  <div className={styles.skeletonBar} style={{ width: '40%', height: '18px', marginBottom: '8px' }} />
                  <div className={styles.skeletonBar} style={{ width: '80%', height: '14px', marginBottom: '6px' }} />
                  <div className={styles.skeletonBar} style={{ width: '60%', height: '14px' }} />
                </div>
              ))}
            </div>
          ) : totalRows === 0 ? (
            <div className={styles.emptyWrapper} style={{ padding: '32px 16px' }}>
              {emptyIcon || <EmptySearchIcon />}
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
                  style={{ marginTop: '8px' }}
                >
                  Limpiar búsqueda
                </button>
              )}
            </div>
          ) : (
            paginatedData.map((row, rowIdx) => {
              const globalIdx = enablePagination ? (currentPage - 1) * pageSize + rowIdx : rowIdx;
              return (
                <div key={keyExtractor(row, globalIdx)} className={styles.mobileCardWrapper}>
                  {renderCard(row, globalIdx)}
                </div>
              );
            })
          )}
        </div>
      )}

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
                <ChevronLeftIcon />
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
                <ChevronRightIcon />
              </button>
            </div>
          </div>
        </div>
      )}

      {footer && <div className={styles.tableCustomFooter}>{footer}</div>}
    </div>
  );
}
