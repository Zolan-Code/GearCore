import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('DataTable: Soporte de Vistas Personalizadas con Nombre (Presets)', async (t) => {
  const componentPath = path.resolve('app/components/DataTable.tsx');
  const cssPath = path.resolve('app/components/data-table.module.css');
  const code = fs.readFileSync(componentPath, 'utf8');
  const css = fs.readFileSync(cssPath, 'utf8');

  await t.test('Tipos y estructura de datos para ColumnPreset', () => {
    assert.ok(code.includes('export interface ColumnPreset'), 'Debe exportar la interfaz ColumnPreset');
    assert.ok(code.includes('name: string;'), 'ColumnPreset debe tener nombre');
    assert.ok(code.includes('order: string[];'), 'ColumnPreset debe almacenar el orden');
    assert.ok(code.includes('visible: string[];'), 'ColumnPreset debe almacenar las columnas visibles');
  });

  await t.test('Funciones de gestión de presets', () => {
    assert.ok(code.includes('function saveLayout(customName?: string)'), 'saveLayout debe aceptar customName opcional');
    assert.ok(code.includes('function applyPreset'), 'Debe incluir applyPreset');
    assert.ok(code.includes('function applyDefaultPreset'), 'Debe incluir applyDefaultPreset');
    assert.ok(code.includes('function deletePreset'), 'Debe incluir deletePreset');
  });

  await t.test('UI del menú integrado de vistas', () => {
    assert.ok(code.includes('presetList'), 'Debe renderizar lista de presets');
    assert.ok(code.includes('presetCreateBox'), 'Debe renderizar caja de creación con nombre');
    assert.ok(code.includes('presetInput'), 'Debe incluir input para ingresar nombre');
    assert.ok(code.includes('presetDeleteBtn'), 'Debe incluir botón para eliminar vistas');
    assert.ok(code.includes('Vistas de Columnas'), 'Debe tener título de vistas');
  });

  await t.test('Estilos CSS para presets existen en data-table.module.css', () => {
    assert.ok(css.includes('.presetList'), 'CSS debe incluir .presetList');
    assert.ok(css.includes('.presetItem'), 'CSS debe incluir .presetItem');
    assert.ok(css.includes('.presetItemActive'), 'CSS debe incluir .presetItemActive');
    assert.ok(css.includes('.presetName'), 'CSS debe incluir .presetName');
    assert.ok(css.includes('.presetDeleteBtn'), 'CSS debe incluir .presetDeleteBtn');
    assert.ok(css.includes('.presetCreateBox'), 'CSS debe incluir .presetCreateBox');
  });
});
