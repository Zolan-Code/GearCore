import test from 'node:test';
import assert from 'node:assert/strict';
import { NAV_ITEMS } from '../app/(dashboard)/navConfig.ts';

test('Inventario Dual: Repuestos e Insumos de Taller', async (t) => {
  const inventarioItem = NAV_ITEMS.find((item) => item.id === 'inventario');

  await t.test('Item de inventario tiene submenús configurados (children)', () => {
    assert.ok(inventarioItem, 'Debe existir el item inventario en NAV_ITEMS');
    assert.ok(inventarioItem.children, 'Debe tener arreglo children');
    assert.equal(inventarioItem.children.length, 3, 'Debe tener exactamente 3 submenús');
  });

  await t.test('Submenú de Inventario General apunta a /inventario?tipo=TODOS', () => {
    const subGeneral = inventarioItem?.children?.find((c) => c.id === 'inventario-general');
    assert.ok(subGeneral, 'Debe existir el submenú inventario-general');
    assert.equal(subGeneral.label, 'Inventario General (Insumos + Repuestos)');
    assert.equal(subGeneral.href, '/inventario?tipo=TODOS');
  });

  await t.test('Submenú de Repuestos apunta a /inventario?tipo=REPUESTO', () => {
    const subRepuestos = inventarioItem?.children?.find((c) => c.id === 'repuestos');
    assert.ok(subRepuestos, 'Debe existir el submenú repuestos');
    assert.equal(subRepuestos.label, 'Repuestos');
    assert.equal(subRepuestos.href, '/inventario?tipo=REPUESTO');
  });

  await t.test('Submenú de Insumos apunta a /inventario?tipo=INSUMO', () => {
    const subInsumos = inventarioItem?.children?.find((c) => c.id === 'insumos');
    assert.ok(subInsumos, 'Debe existir el submenú insumos');
    assert.equal(subInsumos.label, 'Insumos de Taller');
    assert.equal(subInsumos.href, '/inventario?tipo=INSUMO');
  });
});
