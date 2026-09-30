import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('Mejora Móvil: Soporte de tarjetas en DataTable y OrdenesTrabajoView', () => {
  const dataTableTsx = fs.readFileSync(
    path.join(process.cwd(), 'app/components/DataTable.tsx'),
    'utf-8'
  );
  const dataTableCss = fs.readFileSync(
    path.join(process.cwd(), 'app/components/data-table.module.css'),
    'utf-8'
  );
  const ordenesTsx = fs.readFileSync(
    path.join(process.cwd(), 'app/components/OrdenesTrabajoView.tsx'),
    'utf-8'
  );
  const ordenesCss = fs.readFileSync(
    path.join(process.cwd(), 'app/components/ordenes-trabajo.module.css'),
    'utf-8'
  );

  // 1. DataTable soporta prop renderCard
  assert.ok(dataTableTsx.includes('renderCard?: (row: T, index: number) => React.ReactNode;'), 'DataTableProps debe incluir renderCard');
  assert.ok(dataTableTsx.includes('mobileCardsContainer'), 'DataTable debe renderizar mobileCardsContainer');
  assert.ok(dataTableTsx.includes('wrapperWithCards'), 'DataTable debe aplicar wrapperWithCards');

  // 2. data-table.module.css conmuta entre tabla y tarjetas según media query
  assert.ok(dataTableCss.includes('.mobileCardsContainer'), 'data-table.module.css debe declarar .mobileCardsContainer');
  assert.ok(dataTableCss.includes('@media (max-width: 768px)'), 'data-table.module.css debe incluir breakpoint 768px');
  assert.ok(dataTableCss.includes('.desktopOnlyToolbarItem'), 'data-table.module.css debe ocultar selectores desktop redundantes');

  // 3. OrdenesTrabajoView provee renderCard para OTs
  assert.ok(ordenesTsx.includes('renderCard={(ot) => {'), 'OrdenesTrabajoView debe proveer renderCard a DataTable');
  assert.ok(ordenesTsx.includes('styles.otCard'), 'renderCard debe utilizar styles.otCard');

  // 4. ordenes-trabajo.module.css contiene estilos de tarjeta táctil
  assert.ok(ordenesCss.includes('.otCard {'), 'ordenes-trabajo.module.css debe contener .otCard');
  assert.ok(ordenesCss.includes('.btnCardManage'), 'ordenes-trabajo.module.css debe contener botón de acción rápida');
});
