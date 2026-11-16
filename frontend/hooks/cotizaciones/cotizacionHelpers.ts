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

// Utilidad: Convertir texto libre en un fragmento seguro para nombre de archivo
// ("José Pérez" → "Jose-Perez"): sin tildes, espacios ni caracteres inválidos.
function fragmentoArchivo(texto?: string | null, maxLargo = 40): string {
  if (!texto) return '';
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLargo)
    .replace(/-+$/g, '');
}

// Utilidad: Nombre descriptivo del PDF de cotización
// Ej: "COT-00012_Juan-Perez_ABCD12.pdf" (folio, cliente y patente del vehículo)
export function generarNombreArchivoCotizacion(c: {
  numero: number;
  ordenTrabajo?: {
    vehiculo?: {
      patente?: string;
      cliente?: { nombre?: string };
    };
  };
}): string {
  const partes = [
    `COT-${String(c.numero).padStart(5, '0')}`,
    fragmentoArchivo(c.ordenTrabajo?.vehiculo?.cliente?.nombre),
    fragmentoArchivo(c.ordenTrabajo?.vehiculo?.patente, 10).toUpperCase(),
  ].filter(Boolean);
  return `${partes.join('_')}.pdf`;
}
