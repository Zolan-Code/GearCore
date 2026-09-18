import { Injectable } from '@nestjs/common';
import {
  MensajeNotificacion,
  NotificadorCliente,
} from './notificador-cliente.interface';

@Injectable()
export class NotificadorWhatsAppService implements NotificadorCliente {
  /**
   * Genera enlace web de WhatsApp (wa.me) con mensaje preformateado para el cliente
   */
  generarNotificacion(
    telefono: string,
    clienteNombre: string,
    otId: string,
    patente: string,
    estado: string,
    detalle?: string,
    nombreTaller?: string,
  ): MensajeNotificacion {
    // Normalizar teléfono chileno: remover +, guiones y espacios
    let fonoLimpio = (telefono || '').replace(/\D/g, '');

    // Si tiene 9 dígitos (ej: 912345678), anteponer código país 56
    if (fonoLimpio.length === 9) {
      fonoLimpio = `56${fonoLimpio}`;
    }

    const codigoOt = otId.slice(0, 8).toUpperCase();
    const taller = nombreTaller?.trim() || 'GearCore Taller Mecánico';
    const textoMensaje =
      `Estimado(a) ${clienteNombre}:\n\n` +
      `Le informamos desde *${taller}* que su vehículo patente *${patente}* ` +
      `(Orden de Trabajo #${codigoOt}) se encuentra en estado: *${estado}*.\n\n` +
      (detalle ? `*Detalle:* ${detalle}\n\n` : '') +
      `Si tiene dudas o requiere más información, responda directamente a este mensaje. ¡Muchas gracias por su confianza!`;

    const encoded = encodeURIComponent(textoMensaje);
    const url = fonoLimpio
      ? `https://wa.me/${fonoLimpio}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

    return {
      telefono: fonoLimpio,
      url,
      texto: textoMensaje,
    };
  }
}
