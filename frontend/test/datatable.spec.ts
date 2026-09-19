import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Componente Global DataTable y Patrón de Tablas Avanzado (Mockup Specifications)', async (t) => {
  await t.test('Archivos de DataTable existen en app/components/', () => {
    const componentPath = path.resolve('app/components/DataTable.tsx');
    const cssPath = path.resolve('app/components/data-table.module.css');

    assert.ok(fs.existsSync(componentPath), 'Debe existir app/components/DataTable.tsx');
    assert.ok(fs.existsSync(cssPath), 'Debe existir app/components/data-table.module.css');

    const code = fs.readFileSync(componentPath, 'utf8');
    assert.ok(code.includes('export default function DataTable'), 'Debe exportar DataTable por defecto');
    assert.ok(code.includes('export interface Column'), 'Debe exportar interfaz Column');
    assert.ok(code.includes('export interface DataTableProps'), 'Debe exportar interfaz DataTableProps');
  });

  await t.test('DataTable implementa todas las especificaciones del mockup', () => {
    const code = fs.readFileSync(path.resolve('app/components/DataTable.tsx'), 'utf8');

    // Estados base
    assert.ok(code.includes('errorAlert'), 'Debe contemplar render de error');
    assert.ok(code.includes('onRetry'), 'Debe contemplar callback de reintento');
    assert.ok(code.includes('loadingWrapper'), 'Debe contemplar estado de carga');
    assert.ok(code.includes('emptyWrapper'), 'Debe contemplar estado vacío');
    assert.ok(code.includes('keyExtractor'), 'Debe requerir keyExtractor para llaves de fila');

    // Especificaciones del mockup:
    // 1. Guardado en LocalStorage
    assert.ok(code.includes('storageKey'), 'Debe soportar storageKey para persistencia');
    assert.ok(code.includes('window.localStorage.setItem'), 'Debe persistir en localStorage');
    assert.ok(code.includes('window.localStorage.getItem'), 'Debe cargar desde localStorage');
    assert.ok(code.includes('saveLayout'), 'Debe incluir función para guardar layout');
    assert.ok(code.includes('resetLayout'), 'Debe incluir función para restablecer layout');

    // 2. Ordenamiento (Sort)
    assert.ok(code.includes('handleSort'), 'Debe incluir ordenamiento de columnas');
    assert.ok(code.includes('sort.direction'), 'Debe alternar dirección asc/desc');

    // 3. Filtros por columna y búsqueda global
    assert.ok(code.includes('headerFilterPopover') || code.includes('btnHeaderFilter'), 'Debe incluir popover de filtros por columna');
    assert.ok(code.includes('setFilters'), 'Debe manejar filtros por columna');
    assert.ok(code.includes('setQuery'), 'Debe manejar búsqueda general');

    // 4. Paginación
    assert.ok(code.includes('paginationBar'), 'Debe renderizar barra de paginación');
    assert.ok(code.includes('pageSizeSelect'), 'Debe permitir seleccionar filas por página');
    assert.ok(code.includes('btnPageNav'), 'Debe incluir navegación de páginas anterior/siguiente');

    // 5. Visibilidad y reordenamiento de columnas
    assert.ok(code.includes('toggleColumn'), 'Debe permitir ocultar/mostrar columnas');
    assert.ok(code.includes('handleDragStart') || code.includes('moveColumn'), 'Debe permitir reordenar columnas');
  });

  await t.test('UsuariosSeguridadView utiliza DataTable con storageKey', () => {
    const viewPath = path.resolve('app/components/UsuariosSeguridadView.tsx');
    const viewCode = fs.readFileSync(viewPath, 'utf8');

    assert.ok(viewCode.includes("import DataTable from './DataTable'"), 'Debe importar DataTable');
    assert.ok(viewCode.includes('<DataTable<Usuario>'), 'Debe usar DataTable tipado con Usuario');
    assert.ok(viewCode.includes('storageKey="usuarios-table-layout"'), 'Debe usar storageKey para tabla usuarios');
    assert.ok(viewCode.includes('<DataTable<RegistroAuditoria>'), 'Debe usar DataTable tipado con RegistroAuditoria');
    assert.ok(viewCode.includes('storageKey="auditoria-table-layout"'), 'Debe usar storageKey para tabla auditoría');
  });
});
