import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('Cotizaciones y Facturación: Optimización móvil con renderCard y grilla 2x2', () => {
  const cotizacionesTsx = fs.readFileSync(
    path.join(process.cwd(), 'app/components/CotizacionesView.tsx'),
    'utf-8'
  );
  const cotizacionesCss = fs.readFileSync(
    path.join(process.cwd(), 'app/components/cotizaciones.module.css'),
    'utf-8'
  );

  // 1. DataTable recibe renderCard para activar vista móvil de tarjetas
  assert.ok(
    cotizacionesTsx.includes('renderCard={(c) => {'),
    'CotizacionesView debe pasar renderCard a DataTable'
  );
  assert.ok(
    cotizacionesTsx.includes('className={styles.cotizacionCard}'),
    'renderCard debe renderizar cotizacionCard'
  );
  assert.ok(
    cotizacionesTsx.includes('handleDescargarPdf(c)'),
    'renderCard debe proveer botón de descarga de PDF'
  );
  assert.ok(
    cotizacionesTsx.includes('handleAbrirEdicion(c)'),
    'renderCard debe permitir abrir la edición de la cotización'
  );

  // 2. CSS define tarjeta móvil de cotización
  assert.ok(
    cotizacionesCss.includes('.cotizacionCard {'),
    'cotizaciones.module.css debe definir .cotizacionCard'
  );
  assert.ok(
    cotizacionesCss.includes('.otBadge {'),
    'cotizaciones.module.css debe definir .otBadge'
  );
  assert.ok(
    cotizacionesCss.includes('.cotCardAmountsRow {'),
    'cotizaciones.module.css debe definir fila de montos y margen'
  );

  // 3. CSS define KPIs compactos en grilla 2x2 y modales 100dvh para móvil (<= 640px)
  assert.ok(
    cotizacionesCss.includes('@media (max-width: 640px)'),
    'cotizaciones.module.css debe incluir breakpoint móvil 640px'
  );
  assert.ok(
    cotizacionesCss.includes('grid-template-columns: repeat(2, 1fr)'),
    'kpisGrid debe ser 2x2 en pantallas móviles'
  );
  assert.ok(
    cotizacionesCss.includes('height: 100dvh'),
    'modalContent debe adaptarse a 100dvh en pantallas móviles'
  );

  // 4. Modal de cotización: tabla con scroll y rentabilidad compacta
  assert.ok(
    cotizacionesTsx.includes('styles.modalTableWrapper'),
    'CotizacionesView debe envolver la tabla en modalTableWrapper'
  );
  assert.ok(
    cotizacionesCss.includes('.modalTableWrapper {'),
    'cotizaciones.module.css debe definir .modalTableWrapper'
  );
  assert.ok(
    cotizacionesCss.includes('min-width: 480px'),
    'modalTable debe tener min-width para garantizar scroll de columnas'
  );
  assert.ok(
    cotizacionesTsx.includes('styles.formGrid2Col'),
    'CotizacionesView debe usar formGrid2Col para adaptación móvil de inputs'
  );
});

