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

  await t.test('Hook useDecodificarVin y UI de autocompletado por VIN existen', () => {
    const hookPath = path.resolve('hooks/clientes/useClientes.ts');
    const hookContent = fs.readFileSync(hookPath, 'utf8');
    assert.ok(hookContent.includes('export function useDecodificarVin'), 'Debe exportar useDecodificarVin');
    assert.ok(hookContent.includes('/vehiculos/decodificar-vin/'), 'Debe apuntar al endpoint de decodificación');

    const viewPath = path.resolve('app/components/ClientesVehiculosView.tsx');
    const viewContent = fs.readFileSync(viewPath, 'utf8');
    assert.ok(viewContent.includes('useDecodificarVin'), 'Debe importar y usar useDecodificarVin');
    assert.ok(viewContent.includes('handleDecodificarVin'), 'Debe contener la función handleDecodificarVin');
    assert.ok(viewContent.includes('Autocompletar'), 'Debe renderizar el botón de Autocompletar');
  });
});

