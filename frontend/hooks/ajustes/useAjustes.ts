import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWithAuth } from '../../lib/api';

export interface ConfiguracionTaller {
  id: string;
  nombreComercial: string;
  rut: string;
  direccion?: string | null;
  telefono?: string | null;
  email?: string | null;
  logoUrl?: string | null;
  ivaPorDefecto: number;
  validezDiasPorDefecto: number;
  actualizadoEn: string;
}

export interface ActualizarConfiguracionPayload {
  nombreComercial?: string;
  rut?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  logoUrl?: string;
  ivaPorDefecto?: number;
  validezDiasPorDefecto?: number;
}

/**
 * Hook para obtener la configuración singleton del taller
 */
export function useConfiguracionTaller() {
  return useQuery<ConfiguracionTaller, Error>({
    queryKey: ['configuracion-taller'],
    queryFn: () => fetchWithAuth<ConfiguracionTaller>('/ajustes/taller'),
  });
}

/**
 * Mutación para actualizar la configuración singleton del taller
 */
export function useActualizarConfiguracionTaller() {
  const queryClient = useQueryClient();

  return useMutation<ConfiguracionTaller, Error, ActualizarConfiguracionPayload>({
    mutationFn: (payload) =>
      fetchWithAuth<ConfiguracionTaller>('/ajustes/taller', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['configuracion-taller'], data);
      queryClient.invalidateQueries({ queryKey: ['configuracion-taller'] });
    },
  });
}
