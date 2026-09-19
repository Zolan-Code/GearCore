import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NAV_ITEMS,
  getVisibleNavItems,
  isRouteAllowed,
  getActiveNavHref,
} from '../app/(dashboard)/navConfig.ts';

test('Fase 0: Configuración y visibilidad de rutas por rol', async (t) => {
  await t.test('ADMINISTRADOR tiene acceso a todos los módulos principales', () => {
    const items = getVisibleNavItems('ADMINISTRADOR');
    assert.equal(items.length, 7);
    const ids = items.map((i) => i.id);
    assert.ok(ids.includes('dashboard'));
    assert.ok(ids.includes('clientes-vehiculos'));
    assert.ok(ids.includes('ordenes-trabajo'));
    assert.ok(ids.includes('inventario'));
    assert.ok(ids.includes('cotizaciones'));
    assert.ok(ids.includes('usuarios-seguridad'));
    assert.ok(ids.includes('ajustes'));
  });

  await t.test('RECEPCIONISTA no ve módulos administrativos (usuarios y ajustes)', () => {
    const items = getVisibleNavItems('RECEPCIONISTA');
    assert.equal(items.length, 5);
    const ids = items.map((i) => i.id);
    assert.ok(!ids.includes('usuarios-seguridad'));
    assert.ok(!ids.includes('ajustes'));
    assert.ok(ids.includes('cotizaciones'));
    assert.ok(ids.includes('clientes-vehiculos'));
  });

  await t.test('MECANICO solo ve Dashboard, Órdenes e Inventario', () => {
    const items = getVisibleNavItems('MECANICO');
    assert.equal(items.length, 3);
    const ids = items.map((i) => i.id);
    assert.deepEqual(ids, ['dashboard', 'ordenes-trabajo', 'inventario']);
  });
});

test('Fase 0: Guardias de ruta (isRouteAllowed)', async (t) => {
  await t.test('Rutas universales (/ y /perfil) son permitidas para cualquier rol autenticado', () => {
    assert.equal(isRouteAllowed('/', 'MECANICO'), true);
    assert.equal(isRouteAllowed('/perfil', 'MECANICO'), true);
    assert.equal(isRouteAllowed('/', 'RECEPCIONISTA'), true);
    assert.equal(isRouteAllowed('/', 'ADMINISTRADOR'), true);
  });

  await t.test('Rutas administrativas deniegan a Recepcionista y Mecánico', () => {
    assert.equal(isRouteAllowed('/usuarios', 'RECEPCIONISTA'), false);
    assert.equal(isRouteAllowed('/usuarios', 'MECANICO'), false);
    assert.equal(isRouteAllowed('/usuarios', 'ADMINISTRADOR'), true);

    assert.equal(isRouteAllowed('/ajustes', 'RECEPCIONISTA'), false);
    assert.equal(isRouteAllowed('/ajustes', 'MECANICO'), false);
    assert.equal(isRouteAllowed('/ajustes', 'ADMINISTRADOR'), true);
  });

  await t.test('Mecánico no puede acceder a Cotizaciones ni Clientes', () => {
    assert.equal(isRouteAllowed('/cotizaciones', 'MECANICO'), false);
    assert.equal(isRouteAllowed('/clientes', 'MECANICO'), false);
    assert.equal(isRouteAllowed('/cotizaciones', 'RECEPCIONISTA'), true);
    assert.equal(isRouteAllowed('/clientes', 'RECEPCIONISTA'), true);
  });
});

test('Fase 0: Detección de ruta activa en Sidebar (getActiveNavHref)', () => {
  assert.equal(getActiveNavHref('/'), '/');
  assert.equal(getActiveNavHref('/clientes'), '/clientes');
  assert.equal(getActiveNavHref('/cotizaciones'), '/cotizaciones');
  assert.equal(getActiveNavHref('/cotizaciones/123/detalle'), '/cotizaciones');
  assert.equal(getActiveNavHref('/ordenes/nueva'), '/ordenes');
});
