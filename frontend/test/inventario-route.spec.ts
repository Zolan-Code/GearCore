import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { isRouteAllowed, NAV_ITEMS } from '../app/(dashboard)/navConfig.ts';

test('Fase 3: Módulo Inventario de Repuestos (/inventario)', async (t) => {
  await t.test('Control de acceso RBAC a la ruta /inventario (todos los roles)', () => {
    assert.equal(isRouteAllowed('/inventario', 'ADMINISTRADOR'), true);
    assert.equal(isRouteAllowed('/inventario', 'RECEPCIONISTA'), true);
    assert.equal(isRouteAllowed('/inventario', 'MECANICO'), true);
  });

  await t.test('Ruta /inventario está registrada en NAV_ITEMS', () => {
    const item = NAV_ITEMS.find((i) => i.href === '/inventario');
    assert.ok(item, 'Debe existir un ítem de navegación con href /inventario');
    assert.equal(item?.id, 'inventario');
  });

  await t.test('Archivo app/(dashboard)/inventario/page.tsx existe y renderiza InventarioView', () => {
    const pagePath = path.resolve('app/(dashboard)/inventario/page.tsx');
    assert.ok(fs.existsSync(pagePath), 'El archivo page.tsx de /inventario debe existir');
    const content = fs.readFileSync(pagePath, 'utf8');
    assert.ok(content.includes('export default function InventarioPage'), 'Debe exportar InventarioPage');
    assert.ok(content.includes('<InventarioView'), 'Debe renderizar InventarioView');
  });
});
