import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWithAuth } from '../../lib/api';

export interface CotizacionItem {
  id: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  esRepuesto: boolean;
  repuestoId?: string;
}

export interface Cotizacion {
  id: string;
  numero: string;
  ordenTrabajoId?: string;
  clienteId: string;
  vehiculoId: string;
  estado: 'BORRADOR' | 'ENVIADA' | 'APROBADA' | 'RECHAZADA';
  subtotal: number;
  iva: number;
  total: number;
  items: CotizacionItem[];
  creadoEn: string;
  actualizadoEn: string;
}

// Hook de Cotizaciones preparado para RF-18 a RF-21
export function useCotizaciones() {
  return useQuery({
    queryKey: ['cotizaciones'],
    queryFn: async () => {
      try {
        const data = await fetchWithAuth<Cotizacion[]>('/cotizaciones');
        return data || [];
      } catch (err) {
        // En caso de que el endpoint no esté desplegado aún en backend
        return [];
      }
    },
    // No reintentar si el endpoint aún no existe en el backend
    retry: false,
  });
}

// Mutación: Crear Cotización
export function useCrearCotizacion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Partial<Cotizacion>) => {
      return fetchWithAuth<Cotizacion>('/cotizaciones', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cotizaciones'] });
    },
  });
}
