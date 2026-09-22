import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWithAuth } from '../../lib/api';

export type EstadoOT =
  | 'RECIBIDO'
  | 'DIAGNOSTICO'
  | 'COTIZACION'
  | 'APROBADO'
  | 'EN_REPARACION'
  | 'CONTROL_CALIDAD'
  | 'ENTREGADO';

export interface Mecanico {
  id: string;
  nombre: string;
  email: string;
  rol?: string;
}

export interface DetalleOTRepuestoItem {
  id: string;
  ordenId: string;
  repuestoId: string;
  cantidad: number;
  precioUnitario: number;
  repuesto: {
    id: string;
    codigo: string;
    nombre: string;
    stock: number;
    stockMinimo?: number;
    precioVenta: number;
  };
}

export interface OrdenTrabajo {
  id: string;
  vehiculoId: string;
  mecanicoId: string | null;
  fallaReportada: string;
  estado: EstadoOT;
  horasHombre: number;
  fechaRecepcion: string;
  fechaEntrega: string | null;
  nivelCombustible: string | null;
  rayonesCarroceria: string | null;
  elementosValor: string | null;
  kilometrajeRecepcion: number | null;
  diagnostico: string | null;
  trabajoRealizado: string | null;
  fotosDiagnostico: string[];
  creadoEn: string;
  actualizadoEn?: string;
  vehiculo: {
    id: string;
    patente: string;
    marca: string;
    modelo: string;
    anio: number | null;
    kilometraje: number | null;
    cliente: {
      id: string;
      nombre: string;
      rut: string;
      telefono: string | null;
      email: string | null;
    };
  };
  mecanico: {
    id: string;
    nombre: string;
    email: string;
  } | null;
  detalleRepuestos?: DetalleOTRepuestoItem[];
  cotizacion?: {
    id: string;
    numero: number;
    estado: 'BORRADOR' | 'ENVIADA' | 'APROBADA' | 'RECHAZADA' | 'VENCIDA';
    total: number;
  } | null;
}

export interface CrearOTPayload {
  vehiculoId: string;
  fallaReportada: string;
  mecanicoId?: string;
  nivelCombustible?: string;
  rayonesCarroceria?: string;
  elementosValor?: string;
  kilometrajeRecepcion?: number;
}

// Hook principal de Órdenes de Trabajo (RF-06 a RF-12)
export function useOrdenesTrabajo() {
  return useQuery({
    queryKey: ['ordenes-trabajo'],
    queryFn: async () => {
      const data = await fetchWithAuth<OrdenTrabajo[]>('/ordenes-trabajo');
      return data || [];
    },
  });
}

// Hook para obtener mecánicos para asignación de OTs
export function useMecanicos() {
  return useQuery({
    queryKey: ['mecanicos'],
    queryFn: async () => {
      const data = await fetchWithAuth<Mecanico[]>('/ordenes-trabajo/mecanicos');
      return data || [];
    },
  });
}

// Mutación: Crear OT
export function useCrearOT() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CrearOTPayload) => {
      return fetchWithAuth<OrdenTrabajo>('/ordenes-trabajo', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenes-trabajo'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// Mutación: Cambiar Estado OT (SCRUM-12)
export function useCambiarEstadoOT() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ otId, estado }: { otId: string; estado: EstadoOT }) => {
      return fetchWithAuth<OrdenTrabajo>(`/ordenes-trabajo/${otId}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ estado }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenes-trabajo'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// Mutación: Actualizar Diagnóstico / Trabajo / Fotos
export function useActualizarOT() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ otId, data }: { otId: string; data: any }) => {
      return fetchWithAuth<OrdenTrabajo>(`/ordenes-trabajo/${otId}/diagnostico`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenes-trabajo'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// Mutación: Registrar Horas Hombre
export function useRegistrarHorasOT() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      otId,
      horas,
      comentario,
    }: {
      otId: string;
      horas: number;
      comentario?: string;
    }) => {
      return fetchWithAuth<OrdenTrabajo>(`/ordenes-trabajo/${otId}/horas`, {
        method: 'POST',
        body: JSON.stringify({ horas, comentario }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenes-trabajo'] });
    },
  });
}

// Mutación: Agregar Repuesto a OT (descuenta stock en inventario)
export function useAgregarRepuestoOT() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      otId,
      repuestoId,
      cantidad,
    }: {
      otId: string;
      repuestoId: string;
      cantidad: number;
    }) => {
      return fetchWithAuth(`/ordenes-trabajo/${otId}/repuestos`, {
        method: 'POST',
        body: JSON.stringify({ repuestoId, cantidad }),
      });
    },
    onSuccess: () => {
      // Invalida OTs y Repuestos ya que el stock físico fue descontado
      queryClient.invalidateQueries({ queryKey: ['ordenes-trabajo'] });
      queryClient.invalidateQueries({ queryKey: ['repuestos'] });
    },
  });
}

// Mutación: Quitar Repuesto de OT (reintegra stock a inventario)
export function useQuitarRepuestoOT() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ otId, repuestoId }: { otId: string; repuestoId: string }) => {
      return fetchWithAuth(`/ordenes-trabajo/${otId}/repuestos/${repuestoId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      // Invalida OTs y Repuestos ya que el stock fue reintegrado
      queryClient.invalidateQueries({ queryKey: ['ordenes-trabajo'] });
      queryClient.invalidateQueries({ queryKey: ['repuestos'] });
    },
  });
}
