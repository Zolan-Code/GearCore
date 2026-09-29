import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Dashboard: Consistencia con Inventario Dual (Repuestos e Insumos)', async (t) => {
  const dashboardPath = path.resolve(process.cwd(), 'app/(dashboard)/page.tsx');
  const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

  await t.test('Dashboard consume hook useRepuestos para inventario en vivo', () => {
    assert.ok(
      dashboardContent.includes('useRepuestos'),
      'DashboardPage debe importar y usar useRepuestos'
    );
    assert.ok(
      dashboardContent.includes('totalRepuestos') && dashboardContent.includes('totalInsumos'),
      'DashboardPage debe calcular el desglose de totalRepuestos y totalInsumos'
    );
  });

  await t.test('Tarjeta 4 de resumen enlaza a Inventario General, Repuestos e Insumos', () => {
    assert.ok(
      dashboardContent.includes('/inventario?tipo=TODOS'),
      'Debe contener enlace a Inventario General (/inventario?tipo=TODOS)'
    );
    assert.ok(
      dashboardContent.includes('/inventario?tipo=REPUESTO'),
      'Debe contener enlace a Repuestos (/inventario?tipo=REPUESTO)'
    );
    assert.ok(
      dashboardContent.includes('/inventario?tipo=INSUMO'),
      'Debe contener enlace a Insumos (/inventario?tipo=INSUMO)'
    );
  });

  await t.test('Ranking de BI distingue entre Repuestos e Insumos con badges', () => {
    assert.ok(
      dashboardContent.includes('badgeInsumo') && dashboardContent.includes('badgeRepuesto'),
      'El ranking debe incluir badges visuales para Repuesto e Insumo'
    );
    assert.ok(
      dashboardContent.includes('/inventario?tipo=TODOS&search='),
      'El clic en un ítem del ranking debe buscar en el catálogo general'
    );
  });
});
