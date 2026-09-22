'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchWithAuth, fetchBlobWithAuth } from '../../lib/api';

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

// Utilidad: Descargar informe ejecutivo del Dashboard en PDF
export async function descargarInformeDashboardPdf(filtro?: {
  fechaInicio?: string;
  fechaFin?: string;
}): Promise<void> {
  const queryParams = new URLSearchParams();
  if (filtro?.fechaInicio) queryParams.set('fechaInicio', filtro.fechaInicio);
  if (filtro?.fechaFin) queryParams.set('fechaFin', filtro.fechaFin);

  const endpoint = `/dashboard/reporte-pdf${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const blob = await fetchBlobWithAuth(endpoint, { method: 'GET' });

  let filename = 'Informe-Ejecutivo-GearCore.pdf';
  if (filtro?.fechaInicio && filtro?.fechaFin) {
    filename = `Informe-Ejecutivo-${filtro.fechaInicio}-al-${filtro.fechaFin}.pdf`;
  } else if (filtro?.fechaInicio) {
    filename = `Informe-Ejecutivo-desde-${filtro.fechaInicio}.pdf`;
  }

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

