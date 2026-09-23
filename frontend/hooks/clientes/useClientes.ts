import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWithAuth } from '../../lib/api';

export interface VehiculoSimple {
  id: string;
  patente: string;
  marca: string;
  modelo: string;
  vin?: string | null;
  anio?: number | null;
  kilometraje?: number | null;
  clienteId: string;
  creadoEn: string;
  _count?: {
    ordenes: number;
  };
}

export interface Cliente {
  id: string;
  nombre: string;
  rut: string;
  telefono?: string | null;
  email?: string | null;
  creadoEn: string;
  vehiculos?: VehiculoSimple[];
  _count?: {
    vehiculos: number;
  };
}

export interface CrearClienteDto {
  nombre: string;
  rut: string;
  telefono?: string;
  email?: string;
}

export interface CrearVehiculoDto {
  clienteId: string;
  patente: string;
  marca: string;
  modelo: string;
  vin?: string;
  anio?: number;
  kilometraje?: number;
}

// Hook principal de consulta de clientes con TanStack Query (SCRUM / RF-01 a RF-05)
export function useClientes(search?: string) {
  const trimmedSearch = search?.trim() || '';

  return useQuery({
    queryKey: ['clientes', trimmedSearch],
    queryFn: async () => {
      const query = trimmedSearch ? `?q=${encodeURIComponent(trimmedSearch)}` : '';
      const data = await fetchWithAuth<Cliente[]>(`/clientes${query}`);
      return data || [];
    },
  });
}

// Mutación para crear cliente
export function useCrearCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CrearClienteDto) => {
      return fetchWithAuth<Cliente>('/clientes', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    onSuccess: () => {
      // Invalida SOLO la queryKey de clientes
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    },
  });
}

// Mutación para crear vehículo
export function useCrearVehiculo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CrearVehiculoDto) => {
      return fetchWithAuth<VehiculoSimple>('/vehiculos', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    onSuccess: () => {
      // Invalida SOLO la queryKey de clientes (afecta conteo de vehículos y relaciones)
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    },
  });
}

export interface DecodificarVinResult {
  valido: boolean;
  marca?: string;
  modelo?: string;
  anio?: number | null;
  mensaje?: string;
}

export function useDecodificarVin() {
  return useMutation({
    mutationFn: async (vin: string) => {
      const clean = (vin || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      return fetchWithAuth<DecodificarVinResult>(
        `/vehiculos/decodificar-vin/${encodeURIComponent(clean)}`,
      );
    },
  });
}

