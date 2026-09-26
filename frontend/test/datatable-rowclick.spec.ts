import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('DataTable: Soporte de filas clicables en toda su extensión (onRowClick)', async (t) => {
  const componentPath = path.resolve('app/components/DataTable.tsx');
  const cssPath = path.resolve('app/components/data-table.module.css');
  const clientesViewPath = path.resolve('app/components/ClientesVehiculosView.tsx');
  const ordenesViewPath = path.resolve('app/components/OrdenesTrabajoView.tsx');
  const cotizacionesViewPath = path.resolve('app/components/CotizacionesView.tsx');
  const inventarioViewPath = path.resolve('app/components/InventarioView.tsx');

  const code = fs.readFileSync(componentPath, 'utf8');
  const css = fs.readFileSync(cssPath, 'utf8');
  const clientesCode = fs.readFileSync(clientesViewPath, 'utf8');
  const ordenesCode = fs.readFileSync(ordenesViewPath, 'utf8');
  const cotizacionesCode = fs.readFileSync(cotizacionesViewPath, 'utf8');
  const inventarioCode = fs.readFileSync(inventarioViewPath, 'utf8');

  await t.test('DataTable implementa trClickable y manejo inteligente de onRowClick', () => {
    assert.ok(code.includes('onRowClick'), 'DataTable debe soportar prop onRowClick');
    assert.ok(code.includes('trClickable'), 'DataTable debe aplicar clase trClickable');
    assert.ok(css.includes('.trClickable'), 'CSS debe definir .trClickable');
    assert.ok(css.includes('cursor: pointer'), 'CSS debe tener cursor pointer');
  });

  await t.test('ClientesVehiculosView conecta onRowClick para abrir ficha del cliente', () => {
    assert.ok(clientesCode.includes('onRowClick={(c) => handleOpenClienteModal(c.id)}'), 'ClientesView debe pasar onRowClick');
  });

  await t.test('OrdenesTrabajoView conecta onRowClick para abrir gestión de OT', () => {
    assert.ok(ordenesCode.includes('onRowClick={(ot) => abrirGestionOT(ot, \'tecnico\')}'), 'OrdenesView debe pasar onRowClick');
  });

  await t.test('CotizacionesView conecta onRowClick para abrir detalle de cotización', () => {
    assert.ok(cotizacionesCode.includes('onRowClick={(c) => handleAbrirEdicion(c)}'), 'CotizacionesView debe pasar onRowClick');
  });

  await t.test('InventarioView conecta onRowClick para abrir historial de repuesto', () => {
    assert.ok(inventarioCode.includes('onRowClick={(r) => abrirHistorial(r)}'), 'InventarioView debe pasar onRowClick');
  });
});
