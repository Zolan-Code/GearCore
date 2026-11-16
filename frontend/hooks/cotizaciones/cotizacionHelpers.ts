// Utilidad: Normalizar teléfono para WhatsApp (formato E.164 / wa.me compatible)
export function limpiarTelefonoWhatsApp(telefono?: string | null): string {
  if (!telefono) return '';
  let limpio = telefono.replace(/[^\d]/g, '');
  if (limpio.length === 9 && limpio.startsWith('9')) {
    limpio = '56' + limpio;
  } else if (limpio.length === 8) {
    limpio = '569' + limpio;
  }
  return limpio;
}

// Utilidad: Generar mensaje estándar para compartir cotización con documento adjunto
export function generarMensajeCotizacionWhatsApp(c: {
  numero: number;
  total: number;
  validezDias?: number | null;
  ordenTrabajo?: {
    vehiculo?: {
      marca?: string;
      modelo?: string;
      patente?: string;
      cliente?: {
        nombre?: string;
        telefono?: string | null;
      };
    };
  };
}): string {
  const cliente = c.ordenTrabajo?.vehiculo?.cliente?.nombre || 'Estimado(a) cliente';
  const folio = `COT-${String(c.numero).padStart(5, '0')}`;
  const vehiculo = c.ordenTrabajo?.vehiculo
    ? `${c.ordenTrabajo.vehiculo.marca || ''} ${c.ordenTrabajo.vehiculo.modelo || ''} (${c.ordenTrabajo.vehiculo.patente || ''})`.trim()
    : 'su vehículo';
  const total = `$${Math.round(c.total || 0).toLocaleString('es-CL')} CLP`;
  const validez = c.validezDias ? `\n⏳ *Validez:* ${c.validezDias} días.` : '';

  return (
    `Hola ${cliente}, le saludamos desde el taller.\n\n` +
    `Le compartimos la cotización oficial *${folio}* correspondiente a los trabajos de *${vehiculo}*.\n\n` +
    `💰 *Total:* ${total}${validez}\n\n` +
    `Adjuntamos el documento PDF oficial con el desglose detallado de repuestos y mano de obra.\n` +
    `Quedamos atentos a sus comentarios o confirmación.`
  );
}
