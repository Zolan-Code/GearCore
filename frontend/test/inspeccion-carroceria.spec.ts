import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  parsearRegistroCarroceria,
  serializarRegistroCarroceria,
  VISTAS_CONFIG,
  TIPOS_DANIO,
} from '../app/components/inspeccion-carroceria.types.ts';
import type { DanioCarroceria } from '../app/components/inspeccion-carroceria.types.ts';

describe('Inspección de Carrocería — Registro Visual e Interactivo de Daños', () => {
  it('Contiene las 5 perspectivas vehiculares en VISTAS_CONFIG', () => {
    const vistas = Object.keys(VISTAS_CONFIG);
    assert.strictEqual(vistas.includes('LADO_DERECHO'), true);
    assert.strictEqual(vistas.includes('LADO_IZQUIERDO'), true);
    assert.strictEqual(vistas.includes('FRONTAL'), true);
    assert.strictEqual(vistas.includes('TRASERA'), true);
    assert.strictEqual(vistas.includes('SUPERIOR'), true);
  });

  it('Contiene los tipos de daño automotriz esenciales', () => {
    const ids = TIPOS_DANIO.map((t) => t.id);
    assert.strictEqual(ids.includes('Rayón'), true);
    assert.strictEqual(ids.includes('Abolladura'), true);
    assert.strictEqual(ids.includes('Golpe'), true);
    assert.strictEqual(ids.includes('Trizado'), true);
    assert.strictEqual(ids.includes('Pintura'), true);
  });

  it('parsearRegistroCarroceria maneja nulos, texto plano legacy y JSON', () => {
    // Caso 1: Nulo / vacío
    assert.deepStrictEqual(parsearRegistroCarroceria(null), { resumen: '', danios: [] });
    assert.deepStrictEqual(parsearRegistroCarroceria(''), { resumen: '', danios: [] });

    // Caso 2: Texto legacy de versiones previas
    const legacy = parsearRegistroCarroceria('Rayón puerta copiloto leve');
    assert.strictEqual(legacy.resumen, 'Rayón puerta copiloto leve');
    assert.deepStrictEqual(legacy.danios, []);

    // Caso 3: Formato JSON estructurado
    const muestraDanios: DanioCarroceria[] = [
      {
        id: 'pin_1',
        numero: 1,
        vista: 'FRONTAL',
        x: 45.2,
        y: 60.1,
        tipo: 'Rayón',
        descripcion: 'Parachoques raspado',
      },
    ];
    const serializado = serializarRegistroCarroceria(muestraDanios, 'Observación inicial');
    const parseado = parsearRegistroCarroceria(serializado);
    assert.strictEqual(parseado.danios.length, 1);
    assert.strictEqual(parseado.danios[0].numero, 1);
    assert.strictEqual(parseado.danios[0].tipo, 'Rayón');
    assert.strictEqual(parseado.danios[0].vista, 'FRONTAL');
    assert.strictEqual(parseado.resumen.includes('Observación inicial'), true);
    assert.strictEqual(parseado.resumen.includes('[#1 Frontal]'), true);
  });

  it('serializarRegistroCarroceria genera texto compatible cuando no hay daños visuales', () => {
    const res = serializarRegistroCarroceria([], 'Sin detalles');
    assert.strictEqual(res, 'Sin detalles');
  });

  it('OrdenesTrabajoView integra el botón de Mapear en Silueta y el Modal de Inspección', () => {
    const viewPath = path.join(process.cwd(), 'app', 'components', 'OrdenesTrabajoView.tsx');
    const content = fs.readFileSync(viewPath, 'utf8');

    assert.strictEqual(content.includes('InspeccionCarroceriaModal'), true);
    assert.strictEqual(content.includes('daniosCarroceria'), true);
    assert.strictEqual(content.includes('Mapear en Silueta'), true);
    assert.strictEqual(content.includes('Ver Mapa de Daños'), true);
    assert.strictEqual(content.includes('serializarRegistroCarroceria'), true);
  });

  it('VISTAS_CONFIG enlaza a las fotos blueprints del vehículo y los archivos existen en public/assets/inspeccion/', () => {
    const vistas = Object.values(VISTAS_CONFIG);
    for (const v of vistas) {
      assert.strictEqual(typeof v.imageSrc, 'string');
      assert.strictEqual(typeof v.aspectRatio, 'string');

      // Verificar que el archivo existe en el sistema de archivos
      const assetPath = path.join(process.cwd(), 'public', v.imageSrc.replace(/^\//, ''));
      assert.strictEqual(fs.existsSync(assetPath), true, `No se encontró el asset: ${assetPath}`);
    }
  });
});
