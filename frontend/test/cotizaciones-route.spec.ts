import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { isRouteAllowed, NAV_ITEMS } from '../app/(dashboard)/navConfig.ts';

test('Fase 4: Módulo Cotizaciones y Facturación (/cotizaciones)', async (t) => {
  await t.test('Control de acceso RBAC a la ruta /cotizaciones (solo Admin y Recepción)', () => {
    assert.equal(isRouteAllowed('/cotizaciones', 'ADMINISTRADOR'), true);
    assert.equal(isRouteAllowed('/cotizaciones', 'RECEPCIONISTA'), true);
    assert.equal(isRouteAllowed('/cotizaciones', 'MECANICO'), false);
  });

  await t.test('Ruta /cotizaciones está registrada en NAV_ITEMS', () => {
    const item = NAV_ITEMS.find((i) => i.href === '/cotizaciones');
    assert.ok(item, 'Debe existir un ítem de navegación con href /cotizaciones');
    assert.equal(item?.id, 'cotizaciones');
  });

  await t.test('Archivo app/(dashboard)/cotizaciones/page.tsx existe y renderiza CotizacionesView', () => {
    const pagePath = path.resolve('app/(dashboard)/cotizaciones/page.tsx');
    assert.ok(fs.existsSync(pagePath), 'El archivo page.tsx de /cotizaciones debe existir');
    const content = fs.readFileSync(pagePath, 'utf8');
    assert.ok(content.includes('export default function CotizacionesPage'), 'Debe exportar CotizacionesPage');
    assert.ok(content.includes('<CotizacionesView'), 'Debe renderizar CotizacionesView');
  });
});
