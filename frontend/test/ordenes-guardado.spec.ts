import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ordenesTsx = fs.readFileSync(path.resolve('app/components/OrdenesTrabajoView.tsx'), 'utf8');

test('Modal de OT: no se pierden cambios sin guardar', () => {
  // Avanzar de estado guarda primero lo pendiente
  assert.ok(ordenesTsx.includes('async function handleGuardarYAvanzar'), 'Debe existir handleGuardarYAvanzar');
  assert.ok(
    ordenesTsx.includes('handleGuardarYAvanzar(otActual.id, pasoSiguiente.siguiente)'),
    'El botón de avance de estado debe guardar antes de avanzar',
  );

  // Cerrar con cambios pendientes pide confirmación
  assert.ok(ordenesTsx.includes('function cerrarGestionModal'), 'Debe existir cerrarGestionModal');
  assert.ok(ordenesTsx.includes('onClick={cerrarGestionModal}'), 'La X del modal debe usar cerrarGestionModal');

  // Detección de cambios e indicador visible
  assert.ok(ordenesTsx.includes('const hayCambiosSinGuardar'), 'Debe calcular hayCambiosSinGuardar');
  assert.ok(ordenesTsx.includes('Cambios sin guardar'), 'Debe mostrar el aviso de cambios sin guardar');

  // Guardar no cierra el modal
  const guardar = ordenesTsx.slice(
    ordenesTsx.indexOf('async function handleGuardarTecnico'),
    ordenesTsx.indexOf('async function handleGuardarYAvanzar'),
  );
  assert.ok(!guardar.includes('setShowGestionModal(false)'), 'Guardar Cambios no debe cerrar el modal');
});

test('Modal de OT: muestra el estado nuevo apenas cambia (sin esperar la lista)', () => {
  assert.ok(ordenesTsx.includes('const otActual = selectedOT;'), 'El modal debe usar la OT recargada (selectedOT), no la lista en caché');
  const hook = fs.readFileSync(path.resolve('hooks/ordenes-trabajo/useOrdenesTrabajo.ts'), 'utf8');
  assert.ok(hook.includes("setQueryData<OrdenTrabajo[]>(['ordenes-trabajo']"), 'El cambio de estado debe actualizar la lista en caché al instante');
});
