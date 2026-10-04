import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('Mejora Móvil: Modal de Gestión de Orden de Trabajo (Ficha OT)', () => {
  const ordenesTsx = fs.readFileSync(
    path.join(process.cwd(), 'app/components/OrdenesTrabajoView.tsx'),
    'utf-8'
  );
  const ordenesCss = fs.readFileSync(
    path.join(process.cwd(), 'app/components/ordenes-trabajo.module.css'),
    'utf-8'
  );

  // 1. Modal fullscreen en móvil (100dvh)
  assert.ok(ordenesCss.includes('height: 100dvh;'), 'modalContentLarge debe ocupar 100dvh en móvil');
  assert.ok(ordenesCss.includes('max-height: 100dvh;'), 'modalContentLarge debe tener max-height 100dvh');

  // 2. Stepper lineal compacto
  assert.ok(ordenesTsx.includes('stepperMobileProgressBar'), 'OrdenesTrabajoView debe renderizar stepperMobileProgressBar');
  assert.ok(ordenesCss.includes('.stepperMobileProgressBar {'), 'ordenes-trabajo.module.css debe definir .stepperMobileProgressBar');

  // 3. Dropdown de repuestos en 2 niveles legibles
  assert.ok(ordenesTsx.includes('itemResultRight'), 'OrdenesTrabajoView debe contener itemResultRight');
  assert.ok(ordenesCss.includes('.itemResultRight {'), 'ordenes-trabajo.module.css debe definir .itemResultRight');

  // 4. Footer compacto en 2 filas
  assert.ok(ordenesTsx.includes('modalFooterStepWrapper'), 'OrdenesTrabajoView debe contener modalFooterStepWrapper');
  assert.ok(ordenesTsx.includes('modalFooterActionsWrapper'), 'OrdenesTrabajoView debe contener modalFooterActionsWrapper');
  assert.ok(ordenesCss.includes('.modalFooterStepWrapper'), 'ordenes-trabajo.module.css debe definir .modalFooterStepWrapper');
  assert.ok(ordenesCss.includes('.modalFooterActionsWrapper'), 'ordenes-trabajo.module.css debe definir .modalFooterActionsWrapper');

  // 5. UX Limpia para usuarios no expertos
  assert.ok(!ordenesTsx.includes('Total actual:'), 'No debe mostrar "Total actual:" cuando las horas son cero');
  assert.ok(ordenesTsx.includes('placeholder="Ej: 1.5"'), 'Placeholders deben ser concisos y no oraciones largas');
  assert.ok(ordenesTsx.includes('placeholder="Detalle del diagnóstico..."'), 'Placeholder de diagnóstico debe ser breve');

  // 6. WhatsApp en Modo Oscuro
  assert.ok(ordenesCss.includes('.btnWhatsAppPrimary'), 'ordenes-trabajo.module.css debe definir .btnWhatsAppPrimary');
  assert.ok(ordenesCss.includes('[data-theme="dark"]) .btnWhatsAppPrimary'), 'Debe definir estilo en modo oscuro para el botón de WhatsApp');
  assert.ok(ordenesTsx.includes('styles.btnWhatsAppPrimary'), 'OrdenesTrabajoView debe usar btnWhatsAppPrimary en modal de envío');
});


