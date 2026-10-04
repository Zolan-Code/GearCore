import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { NAV_ITEMS } from '../app/(dashboard)/navConfig.ts';

test('Inventario: Acceso directo en sidebar y navegación por pestañas superiores', async (t) => {
  const inventarioItem = NAV_ITEMS.find((item) => item.id === 'inventario');

  await t.test('Item de inventario es enlace directo en sidebar (sin menú desplegable/children)', () => {
    assert.ok(inventarioItem, 'Debe existir el item inventario en NAV_ITEMS');
    assert.equal(inventarioItem.href, '/inventario', 'Debe apuntar directamente a /inventario');
    assert.equal(inventarioItem.children, undefined, 'No debe tener submenús children para no desplegar dropdown');
  });

  await t.test('InventarioView define pestañas superiores para General, Repuestos e Insumos', () => {
    const viewContent = fs.readFileSync(
      path.join(process.cwd(), 'app/components/InventarioView.tsx'),
      'utf-8'
    );
    assert.ok(viewContent.includes('/inventario?tipo=TODOS'), 'Debe incluir pestaña a /inventario?tipo=TODOS');
    assert.ok(viewContent.includes('/inventario?tipo=REPUESTO'), 'Debe incluir pestaña a /inventario?tipo=REPUESTO');
    assert.ok(viewContent.includes('/inventario?tipo=INSUMO'), 'Debe incluir pestaña a /inventario?tipo=INSUMO');
  });
});

