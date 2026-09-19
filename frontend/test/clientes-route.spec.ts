import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { isRouteAllowed, NAV_ITEMS } from '../app/(dashboard)/navConfig.ts';

test('Fase 1: Módulo Clientes y Vehículos (/clientes)', async (t) => {
  await t.test('Control de acceso RBAC a la ruta /clientes', () => {
    assert.equal(isRouteAllowed('/clientes', 'ADMINISTRADOR'), true);
    assert.equal(isRouteAllowed('/clientes', 'RECEPCIONISTA'), true);
    assert.equal(isRouteAllowed('/clientes', 'MECANICO'), false);
  });

  await t.test('Ruta /clientes está registrada en NAV_ITEMS', () => {
    const item = NAV_ITEMS.find((i) => i.href === '/clientes');
    assert.ok(item, 'Debe existir un ítem de navegación con href /clientes');
    assert.equal(item?.id, 'clientes-vehiculos');
  });

  await t.test('Archivo app/(dashboard)/clientes/page.tsx existe y exporta función', () => {
    const pagePath = path.resolve('app/(dashboard)/clientes/page.tsx');
    assert.ok(fs.existsSync(pagePath), 'El archivo page.tsx de /clientes debe existir');
    const content = fs.readFileSync(pagePath, 'utf8');
    assert.ok(content.includes('export default function ClientesPage'), 'Debe exportar ClientesPage');
    assert.ok(content.includes('<ClientesVehiculosView'), 'Debe renderizar ClientesVehiculosView');
  });
});

