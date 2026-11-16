import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  limpiarTelefonoWhatsApp,
  generarMensajeCotizacionWhatsApp,
  generarNombreArchivoCotizacion,
} from '../hooks/cotizaciones/cotizacionHelpers.ts';

test('Cotizaciones: Envío de documento por WhatsApp (Web Share + Fallback)', () => {
  // 1. Normalización de números telefónicos
  assert.strictEqual(limpiarTelefonoWhatsApp('+56 9 1234 5678'), '56912345678');
  assert.strictEqual(limpiarTelefonoWhatsApp('912345678'), '56912345678');
  assert.strictEqual(limpiarTelefonoWhatsApp('12345678'), '56912345678');
  assert.strictEqual(limpiarTelefonoWhatsApp('+54 9 11 2345 6789'), '5491123456789');
  assert.strictEqual(limpiarTelefonoWhatsApp(''), '');
  assert.strictEqual(limpiarTelefonoWhatsApp(null), '');

  // 2. Generación del mensaje comercial con aviso de documento PDF adjunto
  const mockCotizacion = {
    id: 'cot-1',
    numero: 42,
    total: 150000,
    validezDias: 15,
    ordenTrabajo: {
      vehiculo: {
        marca: 'Toyota',
        modelo: 'Yaris',
        patente: 'ABCD12',
        cliente: {
          nombre: 'Juan Pérez',
          telefono: '+56912345678',
        },
      },
    },
  } as unknown as Cotizacion;

  const mensaje = generarMensajeCotizacionWhatsApp(mockCotizacion);
  assert.ok(mensaje.includes('Juan Pérez'), 'Debe incluir el nombre del cliente');
  assert.ok(mensaje.includes('COT-00042'), 'Debe incluir el folio de la cotización');
  assert.ok(mensaje.includes('Toyota Yaris (ABCD12)'), 'Debe incluir marca, modelo y patente');
  assert.ok(mensaje.includes('150.000'), 'Debe incluir el total formateado');
  assert.ok(mensaje.includes('PDF'), 'Debe mencionar que se adjunta el documento PDF');

  // 3. Verificación de UI en CotizacionesView.tsx
  const cotizacionesTsx = fs.readFileSync(
    path.join(process.cwd(), 'app/components/CotizacionesView.tsx'),
    'utf-8'
  );
  assert.ok(
    cotizacionesTsx.includes('handleEnviarWhatsApp'),
    'CotizacionesView debe tener la función handleEnviarWhatsApp'
  );
  assert.ok(
    cotizacionesTsx.includes('styles.iconBtnWsp'),
    'CotizacionesView debe usar el botón estilizado para WhatsApp'
  );
  assert.ok(
    cotizacionesTsx.includes('title="Enviar documento por WhatsApp"'),
    'CotizacionesView debe tener título accesible para el botón WhatsApp'
  );

  // 4. Verificación de estilos en cotizaciones.module.css
  const cotizacionesCss = fs.readFileSync(
    path.join(process.cwd(), 'app/components/cotizaciones.module.css'),
    'utf-8'
  );
  assert.ok(
    cotizacionesCss.includes('.iconBtnWsp'),
    'cotizaciones.module.css debe definir estilos para .iconBtnWsp'
  );
});

test('Cotizaciones: Nombre descriptivo del PDF (folio, cliente y patente)', () => {
  assert.strictEqual(
    generarNombreArchivoCotizacion({
      numero: 12,
      ordenTrabajo: { vehiculo: { patente: 'abcd12', cliente: { nombre: 'José Pérez Muñoz' } } },
    }),
    'COT-00012_Jose-Perez-Munoz_ABCD12.pdf',
  );
  // Sin datos de vehículo/cliente: solo el folio
  assert.strictEqual(generarNombreArchivoCotizacion({ numero: 7 }), 'COT-00007.pdf');
  // Caracteres inválidos en nombres de archivo se eliminan
  assert.strictEqual(
    generarNombreArchivoCotizacion({
      numero: 1,
      ordenTrabajo: { vehiculo: { patente: 'XY-ZW 34', cliente: { nombre: 'Taller/Ñuñoa: "Sur"' } } },
    }),
    'COT-00001_Taller-Nunoa-Sur_XY-ZW-34.pdf',
  );
});
