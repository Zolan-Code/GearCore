import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('Inventario: Navegación por tipo, KPIs 2x2 y tarjetas móviles en DataTable', () => {
  const inventarioTsx = fs.readFileSync(
    path.join(process.cwd(), 'app/components/InventarioView.tsx'),
    'utf-8'
  );
  const inventarioCss = fs.readFileSync(
    path.join(process.cwd(), 'app/components/inventario.module.css'),
    'utf-8'
  );

  // 1. Pestañas de navegación rápida por tipo (General, Repuestos, Insumos)
  assert.ok(
    inventarioTsx.includes('TABS_INVENTARIO'),
    'InventarioView debe definir las pestañas de navegación TABS_INVENTARIO'
  );
  assert.ok(
    inventarioTsx.includes('styles.tipoTabsGroup'),
    'InventarioView debe renderizar el grupo de pestañas de tipo'
  );
  assert.ok(
    inventarioTsx.includes('/inventario?tipo=TODOS') &&
      inventarioTsx.includes('/inventario?tipo=REPUESTO') &&
      inventarioTsx.includes('/inventario?tipo=INSUMO'),
    'TABS_INVENTARIO debe cubrir las 3 rutas del módulo'
  );

  // 2. DataTable recibe renderCard para tarjetas móviles
  assert.ok(
    inventarioTsx.includes('renderCard={(r) => {'),
    'InventarioView debe pasar renderCard a DataTable'
  );
  assert.ok(
    inventarioTsx.includes('className={styles.repuestoCard}'),
    'renderCard debe renderizar repuestoCard'
  );
  assert.ok(
    inventarioTsx.includes('abrirAjusteModal(r)'),
    'renderCard debe incluir botón de ajuste rápido de stock'
  );
  assert.ok(
    inventarioTsx.includes('abrirHistorial(r)'),
    'renderCard debe permitir abrir el historial de movimientos'
  );

  // 3. CSS define las tarjetas móviles y las pestañas
  assert.ok(
    inventarioCss.includes('.tipoTabsContainer {'),
    'inventario.module.css debe definir .tipoTabsContainer'
  );
  assert.ok(
    inventarioCss.includes('.repuestoCard {'),
    'inventario.module.css debe definir .repuestoCard'
  );
  assert.ok(
    inventarioCss.includes('.repCardPricesRow {'),
    'inventario.module.css debe definir fila de precios y margen'
  );

  // 4. CSS define KPIs compactos en grilla 2x2 para móvil (<= 640px)
  assert.ok(
    inventarioCss.includes('@media (max-width: 640px)'),
    'inventario.module.css debe incluir breakpoint móvil 640px'
  );
  assert.ok(
    inventarioCss.includes('grid-template-columns: repeat(2, 1fr)'),
    'kpiGrid debe ser 2x2 en pantallas móviles'
  );
  assert.ok(
    inventarioCss.includes('height: 100dvh'),
    'modalContent debe adaptarse a 100dvh en pantallas móviles'
  );
  assert.ok(
    inventarioCss.includes('overflow-x: hidden'),
    'modalBody debe tener overflow-x hidden para evitar desplazamiento horizontal'
  );
  assert.ok(
    inventarioCss.includes('.rowCompactCols {'),
    'inventario.module.css debe definir .rowCompactCols con minmax(0, 1fr)'
  );
});
