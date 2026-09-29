import { useQuery } from '@tanstack/react-query';
import { fetchWithAuth } from '../../lib/api';

export interface VehiculoSimple {
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
  };
}

export interface VehiculosPaginadosResponse {
  items: VehiculoSimple[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

export interface UseVehiculosPaginadosParams {
  pagina?: number;
  limite?: number;
  search?: string;
  enabled?: boolean;
}

/**
 * Hook TanStack Query para listar vehículos paginados (3 por defecto)
 * con soporte de búsqueda en tiempo real por patente, modelo, marca o cliente.
 */
export function useVehiculosPaginados(params: UseVehiculosPaginadosParams = {}) {
  const { pagina = 1, limite = 3, search = '', enabled = true } = params;

  return useQuery<VehiculosPaginadosResponse>({
    queryKey: ['vehiculos', { pagina, limite, search }],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('pagina', pagina.toString());
      searchParams.set('limite', limite.toString());
      if (search.trim()) {
        searchParams.set('search', search.trim());
      }
      const data = await fetchWithAuth<VehiculosPaginadosResponse>(
        `/vehiculos?${searchParams.toString()}`
      );
      return data || { items: [], total: 0, pagina: 1, limite: 3, totalPaginas: 1 };
    },
    enabled,
    staleTime: 30000,
  });
}
