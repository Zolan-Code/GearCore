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

  await t.test('UsuariosSeguridadView y AuditoriaView utilizan DataTable con storageKey', () => {
    const usuariosViewPath = path.resolve('app/components/UsuariosSeguridadView.tsx');
    const usuariosViewCode = fs.readFileSync(usuariosViewPath, 'utf8');

    assert.ok(usuariosViewCode.includes("import DataTable from './DataTable'"), 'UsuariosView debe importar DataTable');
    assert.ok(usuariosViewCode.includes('<DataTable<Usuario>'), 'UsuariosView debe usar DataTable tipado con Usuario');
    assert.ok(usuariosViewCode.includes('storageKey="usuarios-table-layout"'), 'UsuariosView debe usar storageKey para tabla usuarios');

    const auditoriaViewPath = path.resolve('app/components/AuditoriaView.tsx');
    const auditoriaViewCode = fs.readFileSync(auditoriaViewPath, 'utf8');

    assert.ok(auditoriaViewCode.includes("import DataTable from './DataTable'"), 'AuditoriaView debe importar DataTable');
    assert.ok(auditoriaViewCode.includes('<DataTable<RegistroAuditoria>'), 'AuditoriaView debe usar DataTable tipado con RegistroAuditoria');
    assert.ok(auditoriaViewCode.includes('storageKey="auditoria-table-layout"'), 'AuditoriaView debe usar storageKey para tabla auditoría');
  });

  await t.test('InventarioView y CotizacionesView utilizan DataTable con storageKey', () => {
    const inventarioViewPath = path.resolve('app/components/InventarioView.tsx');
    const inventarioViewCode = fs.readFileSync(inventarioViewPath, 'utf8');

    assert.ok(inventarioViewCode.includes("import DataTable from './DataTable'"), 'InventarioView debe importar DataTable');
    assert.ok(inventarioViewCode.includes('<DataTable<Repuesto>'), 'InventarioView debe usar DataTable tipado con Repuesto');
    assert.ok(inventarioViewCode.includes('storageKey="inventario-table-layout"'), 'InventarioView debe usar storageKey para tabla inventario');

    const cotizacionesViewPath = path.resolve('app/components/CotizacionesView.tsx');
    const cotizacionesViewCode = fs.readFileSync(cotizacionesViewPath, 'utf8');

    assert.ok(cotizacionesViewCode.includes("import DataTable"), 'CotizacionesView debe importar DataTable');
    assert.ok(cotizacionesViewCode.includes('<DataTable<Cotizacion>'), 'CotizacionesView debe usar DataTable tipado con Cotizacion');
    assert.ok(cotizacionesViewCode.includes('storageKey="cotizaciones-table-layout"'), 'CotizacionesView debe usar storageKey para tabla cotizaciones');
    assert.ok(cotizacionesViewCode.includes('className={styles.btnTablePrimary}'), 'CotizacionesView debe usar btnTablePrimary para el boton de nueva cotizacion');
  });

  await t.test('ClientesVehiculosView utiliza DataTable con storageKey', () => {
    const clientesViewPath = path.resolve('app/components/ClientesVehiculosView.tsx');
    const clientesViewCode = fs.readFileSync(clientesViewPath, 'utf8');

    assert.ok(clientesViewCode.includes("import DataTable from './DataTable'"), 'ClientesVehiculosView debe importar DataTable');
    assert.ok(clientesViewCode.includes('<DataTable<Cliente>'), 'ClientesVehiculosView debe usar DataTable tipado con Cliente');
    assert.ok(clientesViewCode.includes('storageKey="clientes-table-layout"'), 'ClientesVehiculosView debe usar storageKey para tabla clientes');
    assert.ok(clientesViewCode.includes('className={styles.btnTablePrimary}'), 'ClientesVehiculosView debe usar btnTablePrimary para el boton de nuevo cliente');
  });

  await t.test('OrdenesTrabajoView utiliza DataTable con storageKey', () => {
    const ordenesViewPath = path.resolve('app/components/OrdenesTrabajoView.tsx');
    const ordenesViewCode = fs.readFileSync(ordenesViewPath, 'utf8');

    assert.ok(ordenesViewCode.includes("import DataTable"), 'OrdenesTrabajoView debe importar DataTable');
    assert.ok(ordenesViewCode.includes('<DataTable<OrdenTrabajo>'), 'OrdenesTrabajoView debe usar DataTable tipado con OrdenTrabajo');
    assert.ok(ordenesViewCode.includes('storageKey="ordenes-table-layout"'), 'OrdenesTrabajoView debe usar storageKey para tabla órdenes');
  });
});
