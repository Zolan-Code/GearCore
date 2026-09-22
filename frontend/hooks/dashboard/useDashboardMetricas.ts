'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchWithAuth } from '../../lib/api';

export interface DashboardMetricas {
  periodo: {
    fechaInicio: string | null;
    fechaFin: string | null;
  };
  operaciones: {
    totalOT: number;
    otCompletadasTotal: number;
    ordenesEnProceso: number;
    porcentajeATiempo: number;
    horasInvertidasTotal: number;
    pipelineEstados: Record<string, number>;
  };
  ultimasOrdenes: Array<{
    id: string;
    fallaReportada: string;
    estado: string;
    fechaRecepcion: string;
    vehiculo: {
      patente: string;
      marca: string;
      modelo: string;
      cliente: { nombre: string; telefono: string | null };
    };
    mecanico: { nombre: string } | null;
  }>;
  rankingRepuestos: Array<{
    id: string;
    codigo: string;
    nombre: string;
    cantidad: number;
    totalGenerado: number;
  }>;
  productividadMecanicos: Array<{
    id: string;
    nombre: string;
    totalAsignadas: number;
    finalizadas: number;
    enCurso: number;
    horasHombre: number;
    eficiencia: number;
  }>;
  finanzas: {
    totalFacturado: number;
    totalCosto: number;
    gananciaBruta: number;
    margenPromedio: number;
    cotizacionesAprobadas: number;
  } | null;
}

export function useDashboardMetricas(filtro?: { fechaInicio?: string; fechaFin?: string }) {
  const queryParams = new URLSearchParams();
  if (filtro?.fechaInicio) queryParams.set('fechaInicio', filtro.fechaInicio);
  if (filtro?.fechaFin) queryParams.set('fechaFin', filtro.fechaFin);

  const endpoint = `/dashboard/metricas${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  return useQuery<DashboardMetricas>({
    queryKey: ['dashboard', 'metricas', filtro?.fechaInicio || '', filtro?.fechaFin || ''],
    queryFn: () => fetchWithAuth<DashboardMetricas>(endpoint),
    staleTime: 60 * 1000,
  });
}
