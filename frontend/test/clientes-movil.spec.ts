import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('Clientes y Vehículos: Optimización móvil con tarjetas táctiles y grilla 2x2', () => {
  const viewTsx = fs.readFileSync(
    path.join(process.cwd(), 'app/components/ClientesVehiculosView.tsx'),
    'utf-8'
  );
  const css = fs.readFileSync(
    path.join(process.cwd(), 'app/components/clientes-vehiculos.module.css'),
    'utf-8'
  );

  // 1. DataTable recibe renderCard para tarjetas móviles
  assert.ok(
    viewTsx.includes('renderCard={(c) => {'),
    'ClientesVehiculosView debe pasar renderCard a DataTable'
  );
  assert.ok(
    viewTsx.includes('className={styles.clientCard}'),
    'renderCard debe renderizar clientCard'
  );
  assert.ok(
    viewTsx.includes('href={`tel:${c.telefono}`}'),
    'renderCard debe incluir enlace de llamada directa tel:'
  );
  assert.ok(
    viewTsx.includes('styles.vehicleCountPill'),
    'renderCard debe mostrar contador de vehículos asociados'
  );

  // 2. CSS define las tarjetas móviles de clientes
  assert.ok(
    css.includes('.clientCard {'),
    'clientes-vehiculos.module.css debe definir .clientCard'
  );
  assert.ok(
    css.includes('.clientPhoneLink {'),
    'clientes-vehiculos.module.css debe definir .clientPhoneLink'
  );

  // 3. CSS define optimizaciones en breakpoint móvil (<= 640px)
  assert.ok(
    css.includes('@media (max-width: 640px)'),
    'clientes-vehiculos.module.css debe incluir breakpoint 640px'
  );
  assert.ok(
    css.includes('grid-template-columns: repeat(2, 1fr)'),
    'specsGrid debe ser 2x2 en pantallas móviles'
  );
  assert.ok(
    css.includes('height: 100dvh'),
    'modalCard debe adaptarse a 100dvh en pantallas móviles'
  );

  // 4. Selector predictivo de cliente en modal Nuevo Vehículo (Opción 1 /ponytail)
  assert.ok(
    viewTsx.includes('styles.clientSelectedBox'),
    'Modal debe renderizar chip del cliente seleccionado'
  );
  assert.ok(
    viewTsx.includes('styles.clientSuggestionsDropdown'),
    'Modal debe renderizar sugerencias predictivas de clientes por nombre o RUT'
  );
  assert.ok(
    css.includes('.clientSelectedBox {'),
    'CSS debe definir .clientSelectedBox'
  );
  assert.ok(
    css.includes('.clientSuggestionsDropdown {'),
    'CSS debe definir .clientSuggestionsDropdown'
  );
});

