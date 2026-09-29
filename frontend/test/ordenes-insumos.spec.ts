import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('OTs: Insumos de Taller, Buscador por SKU/Nombre y Evidencia sin URL', async (t) => {
  const otViewPath = path.resolve(process.cwd(), 'app/components/OrdenesTrabajoView.tsx');
  const otViewContent = fs.readFileSync(otViewPath, 'utf8');

  await t.test('Se eliminó la opción de agregar fotos por URL en evidencia', () => {
    assert.ok(
      !otViewContent.includes('placeholder="O pegar URL de imagen..."'),
      'No debe existir el input para pegar URL de imagen'
    );
    assert.ok(
      !otViewContent.includes('+ Agregar URL'),
      'No debe existir el botón + Agregar URL'
    );
    assert.ok(
      otViewContent.includes('Subir desde Dispositivo'),
      'Debe permanecer el botón Subir desde Dispositivo'
    );
  });

  await t.test('Zona dedicada para Insumos de Taller Utilizados en la OT', () => {
    assert.ok(
      otViewContent.includes('insumosSolo') && otViewContent.includes('repuestosSolo'),
      'Debe separar repuestosSolo e insumosSolo'
    );
    assert.ok(
      otViewContent.includes('Insumos y Consumibles de Taller Utilizados'),
      'Debe contener la sección de Insumos de Taller Utilizados'
    );
    assert.ok(
      otViewContent.includes('Piezas y Componentes Vehiculares'),
      'Debe contener la sección de Repuestos Vehiculares'
    );
  });

  await t.test('Buscador predictivo por SKU o Nombre para evitar listas infinitas', () => {
    assert.ok(
      otViewContent.includes('busquedaItemOT'),
      'Debe tener estado de búsqueda por SKU/nombre'
    );
    assert.ok(
      otViewContent.includes('filtroTipoItemOT'),
      'Debe soportar selector de tipo (Todos, Solo Repuestos, Solo Insumos)'
    );
    assert.ok(
      otViewContent.includes('itemDropdownResults'),
      'Debe desplegar resultados predictivos en dropdown'
    );
    assert.ok(
      otViewContent.includes('selectedItemBox'),
      'Debe mostrar ficha de item seleccionado con cantidad y botón de asignación'
    );
  });

  await t.test('Catálogo paginado de 3 vehículos en Base de Datos (Botones 1, 2...)', () => {
    assert.ok(
      otViewContent.includes('useVehiculosPaginados'),
      'Debe utilizar el hook TanStack Query useVehiculosPaginados'
    );
    assert.ok(
      otViewContent.includes('vehiculoStepLayout'),
      'Debe implementar distribución en dos columnas vehiculoStepLayout'
    );
    assert.ok(
      otViewContent.includes('vehiculosCatalogPanel'),
      'Debe contener el panel vehiculosCatalogPanel'
    );
    assert.ok(
      otViewContent.includes('vehiculoCatalogItem'),
      'Debe renderizar los items de vehículos con clase vehiculoCatalogItem'
    );
    assert.ok(
      otViewContent.includes('vehiculoPageBtn'),
      'Debe contener botones de paginación numérica'
    );
  });
});
