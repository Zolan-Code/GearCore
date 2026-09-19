import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { isRouteAllowed, NAV_ITEMS } from '../app/(dashboard)/navConfig.ts';

test('Fase 2: Módulo Órdenes de Trabajo (/ordenes)', async (t) => {
  await t.test('Control de acceso RBAC a la ruta /ordenes (todos los roles)', () => {
    assert.equal(isRouteAllowed('/ordenes', 'ADMINISTRADOR'), true);
    assert.equal(isRouteAllowed('/ordenes', 'RECEPCIONISTA'), true);
    assert.equal(isRouteAllowed('/ordenes', 'MECANICO'), true);
  });

  await t.test('Ruta /ordenes está registrada en NAV_ITEMS', () => {
    const item = NAV_ITEMS.find((i) => i.href === '/ordenes');
    assert.ok(item, 'Debe existir un ítem de navegación con href /ordenes');
    assert.equal(item?.id, 'ordenes-trabajo');
  });

  await t.test('Archivo app/(dashboard)/ordenes/page.tsx existe y pasa userRole y userId', () => {
    const pagePath = path.resolve('app/(dashboard)/ordenes/page.tsx');
    assert.ok(fs.existsSync(pagePath), 'El archivo page.tsx de /ordenes debe existir');
    const content = fs.readFileSync(pagePath, 'utf8');
    assert.ok(content.includes('export default function OrdenesPage'), 'Debe exportar OrdenesPage');
    assert.ok(content.includes('<OrdenesTrabajoView'), 'Debe renderizar OrdenesTrabajoView');
    assert.ok(content.includes('userId={user?.id}'), 'Debe pasar userId');
  });
});
