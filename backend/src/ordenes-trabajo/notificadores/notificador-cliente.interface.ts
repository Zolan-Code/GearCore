export interface MensajeNotificacion {
  telefono: string;
  url: string;
  texto: string;
}

export interface NotificadorCliente {
  generarNotificacion(
    telefono: string,
    clienteNombre: string,
    otId: string,
    patente: string,
    estado: string,
    detalle?: string,
    nombreTaller?: string,
  ): MensajeNotificacion;
}
