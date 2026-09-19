import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWithAuth, fetchBlobWithAuth } from '../../lib/api';

export type EstadoCotizacion =
  | 'BORRADOR'
  | 'ENVIADA'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'VENCIDA';

export type TipoItemCotizacion =
  | 'REPUESTO'
  | 'MANO_DE_OBRA'
  | 'SERVICIO_EXTERNO'
  | 'OTRO';

export interface ItemCotizacion {
  id: string;
  cotizacionId: string;
  tipo: TipoItemCotizacion;
  referenciaId?: string | null;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  costoUnitario?: number; // Solo visible para ADMINISTRADOR
  subtotal: number;
}

export interface HistorialPrecioCotizacion {
  id: string;
  cotizacionId: string;
  usuarioId?: string | null;
  usuario?: {
    id: string;
    nombre: string;
    email: string;
    rol: string;
  } | null;
  totalAnterior: number;
  subtotalAnterior: number;
  totalNuevo: number;
  subtotalNuevo: number;
  motivo: string;
  detalles?: string | null; // JSON con snapshot de ítems anteriores
  creadoEn: string;
}

export interface Cotizacion {
  id: string;
  numero: number;
  ordenTrabajoId: string;
  ordenTrabajo: {
    id: string;
    fallaReportada: string;
    estado: string;
    horasHombre: number;
    vehiculo: {
      id: string;
      patente: string;
      marca: string;
      modelo: string;
      anio?: number | null;
      kilometraje?: number | null;
      cliente: {
        id: string;
        nombre: string;
        rut: string;
        telefono?: string | null;
        email?: string | null;
      };
    };
    mecanico?: {
      id: string;
      nombre: string;
      email: string;
    } | null;
  };
  estado: EstadoCotizacion;
  validezDias: number;
  fechaVencimiento?: string | null;
  observaciones?: string | null;

  horasHombre: number;
  valorHoraHombre: number;
  costoHoraHombre?: number; // Solo visible para ADMINISTRADOR

  subtotalRepuestos: number;
  subtotalManoObra: number;
  subtotalOtros: number;
  descuento: number;
  subtotalNeto: number;
  aplicaIva: boolean;
  iva: number;
  total: number;

  // Rentabilidad (Solo visible para ADMINISTRADOR)
  costoRepuestos?: number;
  costoManoObra?: number;
  costoOtros?: number;
  costoTotal?: number;
  margenNeto?: number;
  porcentajeMargen?: number;

  items: ItemCotizacion[];
  historialPrecios?: HistorialPrecioCotizacion[];

  creadoEn: string;
  actualizadoEn: string;
}

export interface CrearCotizacionPayload {
  ordenTrabajoId: string;
  validezDias?: number;
  observaciones?: string;
  horasHombre?: number;
  valorHoraHombre?: number;
  costoHoraHombre?: number;
  descuento?: number;
  aplicaIva?: boolean;
  itemsAdicionales?: Array<{
    tipo?: TipoItemCotizacion;
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    costoUnitario?: number;
    referenciaId?: string;
  }>;
}

export interface ActualizarCotizacionPayload {
  motivo: string; // Obligatorio para trazabilidad (SCRUM-32)
  estado?: EstadoCotizacion;
  validezDias?: number;
  observaciones?: string;
  horasHombre?: number;
  valorHoraHombre?: number;
  costoHoraHombre?: number;
  descuento?: number;
  aplicaIva?: boolean;
  items?: Array<{
    id?: string;
    tipo?: TipoItemCotizacion;
    referenciaId?: string;
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    costoUnitario?: number;
  }>;
}

export interface CambiarEstadoCotizacionPayload {
  estado: EstadoCotizacion;
  motivo?: string;
}

// Hook: Listar cotizaciones con filtros
export function useCotizaciones(filtros?: { estado?: EstadoCotizacion; ordenTrabajoId?: string }) {
  const queryParams = new URLSearchParams();
  if (filtros?.estado) queryParams.set('estado', filtros.estado);
  if (filtros?.ordenTrabajoId) queryParams.set('ordenTrabajoId', filtros.ordenTrabajoId);

  const endpoint = `/cotizaciones${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  return useQuery({
    queryKey: ['cotizaciones', filtros?.estado || 'TODAS', filtros?.ordenTrabajoId || 'TODAS'],
    queryFn: async () => {
      const data = await fetchWithAuth<Cotizacion[]>(endpoint);
      return data || [];
    },
  });
}

// Hook: Obtener cotización por ID
export function useCotizacion(id?: string) {
  return useQuery({
    queryKey: ['cotizacion', id],
    queryFn: async () => {
      if (!id) return null;
      return fetchWithAuth<Cotizacion>(`/cotizaciones/${id}`);
    },
    enabled: !!id,
  });
}

// Hook: Obtener cotización por ID de OT
export function useCotizacionPorOT(ordenId?: string) {
  return useQuery({
    queryKey: ['cotizacion-ot', ordenId],
    queryFn: async () => {
      if (!ordenId) return null;
      try {
        return await fetchWithAuth<Cotizacion>(`/cotizaciones/orden/${ordenId}`);
      } catch (err: any) {
        if (err?.message?.includes('404') || err?.status === 404) {
          return null;
        }
        throw err;
      }
    },
    enabled: !!ordenId,
    retry: false,
  });
}

// Hook: Obtener historial de precios (SCRUM-32)
export function useHistorialCotizacion(cotizacionId?: string) {
  return useQuery({
    queryKey: ['cotizacion-historial', cotizacionId],
    queryFn: async () => {
      if (!cotizacionId) return [];
      const data = await fetchWithAuth<HistorialPrecioCotizacion[]>(`/cotizaciones/${cotizacionId}/historial`);
      return data || [];
    },
    enabled: !!cotizacionId,
  });
}

// Mutación: Crear Cotización
export function useCrearCotizacion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CrearCotizacionPayload) => {
      return fetchWithAuth<Cotizacion>('/cotizaciones', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cotizaciones'] });
      queryClient.invalidateQueries({ queryKey: ['ordenes-trabajo'] });
      if (data?.ordenTrabajoId) {
        queryClient.invalidateQueries({ queryKey: ['cotizacion-ot', data.ordenTrabajoId] });
      }
    },
  });
}

// Mutación: Actualizar Cotización (con motivo de trazabilidad)
export function useActualizarCotizacion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: ActualizarCotizacionPayload }) => {
      return fetchWithAuth<Cotizacion>(`/cotizaciones/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cotizaciones'] });
      queryClient.invalidateQueries({ queryKey: ['cotizacion', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['cotizacion-historial', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['ordenes-trabajo'] });
      if (data?.ordenTrabajoId) {
        queryClient.invalidateQueries({ queryKey: ['cotizacion-ot', data.ordenTrabajoId] });
      }
    },
  });
}

// Mutación: Cambiar Estado Cotización
export function useCambiarEstadoCotizacion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: CambiarEstadoCotizacionPayload }) => {
      return fetchWithAuth<Cotizacion>(`/cotizaciones/${id}/estado`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cotizaciones'] });
      queryClient.invalidateQueries({ queryKey: ['cotizacion', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['ordenes-trabajo'] });
      if (data?.ordenTrabajoId) {
        queryClient.invalidateQueries({ queryKey: ['cotizacion-ot', data.ordenTrabajoId] });
      }
    },
  });
}

// Utilidad: Descargar PDF de cotización autenticado
export async function descargarCotizacionPdf(cotizacionId: string, numero: number): Promise<void> {
  const blob = await fetchBlobWithAuth(`/cotizaciones/${cotizacionId}/pdf`, {
    method: 'GET',
  });

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Cotizacion-${String(numero).padStart(5, '0')}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

