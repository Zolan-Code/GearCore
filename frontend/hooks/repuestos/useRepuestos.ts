import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWithAuth } from '../../lib/api';

export interface MovimientoStock {
  id: string;
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
  cantidad: number;
  stockPrevio: number;
  stockNuevo: number;
  motivo?: string | null;
  ordenTrabajoId?: string | null;
  creadoEn: string;
}

export interface Repuesto {
  id: string;
  codigo: string;
  nombre: string;
  stock: number;
  stockMinimo: number;
  precioCompra: number;
  precioVenta: number;
  creadoEn: string;
  actualizadoEn: string;
  movimientos?: MovimientoStock[];
}

export interface KPIs {
  totalRepuestos: number;
  valorTotalInventario: number;
  totalStockBajo: number;
  totalAgotados: number;
}

export interface InventarioResponse {
  items: Repuesto[];
  kpis: KPIs;
}

// Hook principal de Inventario y Repuestos (RF-13 a RF-17)
export function useRepuestos() {
  return useQuery({
    queryKey: ['repuestos'],
    queryFn: async () => {
      const data = await fetchWithAuth<InventarioResponse>('/repuestos');
      return (
        data || {
          items: [],
          kpis: {
            totalRepuestos: 0,
            valorTotalInventario: 0,
            totalStockBajo: 0,
            totalAgotados: 0,
          },
        }
      );
    },
  });
}

// Mutación: Crear Repuesto (SCRUM-22)
export function useCrearRepuesto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: {
      codigo: string;
      nombre: string;
      stock: number;
      stockMinimo: number;
      precioCompra: number;
      precioVenta: number;
    }) => {
      return fetchWithAuth<Repuesto>('/repuestos', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repuestos'] });
    },
  });
}

// Mutación: Actualizar Repuesto
export function useActualizarRepuesto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Repuesto> }) => {
      return fetchWithAuth<Repuesto>(`/repuestos/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repuestos'] });
    },
  });
}

// Mutación: Eliminar Repuesto
export function useEliminarRepuesto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return fetchWithAuth(`/repuestos/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repuestos'] });
    },
  });
}

// Mutación: Registrar Movimiento Manual (Entrada / Salida / Ajuste) (SCRUM-24)
export function useRegistrarMovimiento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      repuestoId,
      tipo,
      cantidad,
      motivo,
    }: {
      repuestoId: string;
      tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
      cantidad: number;
      motivo?: string;
    }) => {
      return fetchWithAuth(`/repuestos/${repuestoId}/movimiento`, {
        method: 'POST',
        body: JSON.stringify({ tipo, cantidad, motivo }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repuestos'] });
    },
  });
}

// Mutación: Ajuste de Conteo Físico (SCRUM-26)
export function useAjusteFisicoRepuesto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      repuestoId,
      stockFisico,
      motivo,
    }: {
      repuestoId: string;
      stockFisico: number;
      motivo?: string;
    }) => {
      return fetchWithAuth(`/repuestos/${repuestoId}/ajuste`, {
        method: 'POST',
        body: JSON.stringify({ stockFisico, motivo }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repuestos'] });
    },
  });
}

// Mutación: Importación Masiva CSV (SCRUM-25)
export function useImportarCsvRepuestos() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (repuestos: any[]) => {
      return fetchWithAuth('/repuestos/importar', {
        method: 'POST',
        body: JSON.stringify({ repuestos }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repuestos'] });
    },
  });
}
