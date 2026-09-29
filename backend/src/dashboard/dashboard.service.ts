import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FiltroDashboardDto } from './dto/filtro-dashboard.dto';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async obtenerMetricas(filtro: FiltroDashboardDto, rol: string, userId: string) {
    const whereFechasOT: any = {};
    const whereFechasCotizacion: any = {};

    if (filtro.fechaInicio || filtro.fechaFin) {
      whereFechasOT.fechaRecepcion = {};
      whereFechasCotizacion.creadoEn = {};

      if (filtro.fechaInicio) {
        const dInicio = new Date(filtro.fechaInicio);
        whereFechasOT.fechaRecepcion.gte = dInicio;
        whereFechasCotizacion.creadoEn.gte = dInicio;
      }
      if (filtro.fechaFin) {
        const dFin = new Date(filtro.fechaFin);
        dFin.setHours(23, 59, 59, 999);
        whereFechasOT.fechaRecepcion.lte = dFin;
        whereFechasCotizacion.creadoEn.lte = dFin;
      }
    }

    // 1. Órdenes de Trabajo (SCRUM-35)
    const ordenesWhere: any = { ...whereFechasOT };
    if (rol === 'MECANICO') {
      ordenesWhere.mecanicoId = userId;
    }

    const [totalOT, ordenesEntregadas, ordenesEnProceso, conteoPorEstado, ultimasOrdenes] = await Promise.all([
      this.prisma.ordenTrabajo.count({ where: ordenesWhere }),
      this.prisma.ordenTrabajo.findMany({
        where: { ...ordenesWhere, estado: 'ENTREGADO' },
        select: {
          id: true,
          horasHombre: true,
          fechaRecepcion: true,
          fechaEntrega: true,
          creadoEn: true,
        },
      }),
      this.prisma.ordenTrabajo.count({
        where: {
          ...ordenesWhere,
          estado: { notIn: ['ENTREGADO'] },
        },
      }),
      this.prisma.ordenTrabajo.groupBy({
        by: ['estado'],
        where: ordenesWhere,
        _count: { id: true },
      }),
      this.prisma.ordenTrabajo.findMany({
        where: ordenesWhere,
        orderBy: { creadoEn: 'desc' },
        take: 5,
        select: {
          id: true,
          fallaReportada: true,
          estado: true,
          fechaRecepcion: true,
          vehiculo: {
            select: {
              patente: true,
              marca: true,
              modelo: true,
              cliente: { select: { nombre: true, telefono: true } },
            },
          },
          mecanico: { select: { nombre: true } },
        },
      }),
    ]);

    const pipelineEstados: Record<string, number> = {
      RECIBIDO: 0,
      DIAGNOSTICO: 0,
      COTIZACION: 0,
      APROBADO: 0,
      EN_REPARACION: 0,
      CONTROL_CALIDAD: 0,
      ENTREGADO: 0,
    };
    for (const c of conteoPorEstado) {
      pipelineEstados[c.estado] = c._count.id;
    }

    // Calcular OTs completadas a tiempo (estándar: entrega dentro de las horas o fecha estimada)
    const otCompletadasTotal = ordenesEntregadas.length;
    let horasInvertidasTotal = 0;
    let completadasATiempo = 0;

    for (const ot of ordenesEntregadas) {
      horasInvertidasTotal += ot.horasHombre || 0;
      // Si fue entregada dentro de 72 hrs o el mismo día planificado
      if (ot.fechaEntrega && ot.fechaRecepcion) {
        const diffHoras = (ot.fechaEntrega.getTime() - ot.fechaRecepcion.getTime()) / (1000 * 3600);
        if (diffHoras <= 72 || ot.horasHombre <= 8) {
          completadasATiempo++;
        }
      } else {
        completadasATiempo++;
      }
    }

    const porcentajeATiempo =
      otCompletadasTotal > 0
        ? Math.round((completadasATiempo / otCompletadasTotal) * 100)
        : 100;

    // 2. Ranking de repuestos más usados (SCRUM-36)
    const detallesRepuestos = await this.prisma.detalleOTRepuesto.findMany({
      where: {
        orden: ordenesWhere,
      },
      select: {
        cantidad: true,
        precioUnitario: true,
        repuesto: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            tipo: true,
            stock: true,
            precioVenta: true,
          },
        },
      },
    });

    const repuestosMap = new Map<string, { id: string; codigo: string; nombre: string; tipo: string; cantidad: number; totalGenerado: number }>();
    for (const d of detallesRepuestos) {
      if (!d.repuesto) continue;
      const prev = repuestosMap.get(d.repuesto.id) || {
        id: d.repuesto.id,
        codigo: d.repuesto.codigo,
        nombre: d.repuesto.nombre,
        tipo: d.repuesto.tipo || 'REPUESTO',
        cantidad: 0,
        totalGenerado: 0,
      };
      prev.cantidad += d.cantidad;
      prev.totalGenerado += d.cantidad * d.precioUnitario;
      repuestosMap.set(d.repuesto.id, prev);
    }

    const rankingRepuestos = Array.from(repuestosMap.values())
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);

    // 3. Productividad por Mecánico (SCRUM-37)
    let productividadMecanicos: any[] = [];
    if (rol !== 'MECANICO') {
      const mecanicos = await this.prisma.perfil.findMany({
        where: { rol: 'MECANICO', activo: true },
        select: {
          id: true,
          nombre: true,
          email: true,
          ordenesAsignadas: {
            where: whereFechasOT,
            select: {
              id: true,
              estado: true,
              horasHombre: true,
            },
          },
        },
      });

      productividadMecanicos = mecanicos.map((m) => {
        const totalAsignadas = m.ordenesAsignadas.length;
        const finalizadas = m.ordenesAsignadas.filter((o) => o.estado === 'ENTREGADO').length;
        const enCurso = m.ordenesAsignadas.filter((o) => o.estado !== 'ENTREGADO').length;
        const horas = m.ordenesAsignadas.reduce((acc, curr) => acc + (curr.horasHombre || 0), 0);

        return {
          id: m.id,
          nombre: m.nombre,
          totalAsignadas,
          finalizadas,
          enCurso,
          horasHombre: Math.round(horas * 10) / 10,
          eficiencia: totalAsignadas > 0 ? Math.round((finalizadas / totalAsignadas) * 100) : 0,
        };
      });
    }

    // 4. Ganancias Financieras (SCRUM-35 - Solo ADMINISTRADOR)
    let finanzas: any = null;
    if (rol === 'ADMINISTRADOR') {
      const cotizaciones = await this.prisma.cotizacion.findMany({
        where: {
          ...whereFechasCotizacion,
          estado: 'APROBADA',
        },
        select: {
          id: true,
          total: true,
          subtotalNeto: true,
          costoTotal: true,
          margenNeto: true,
          porcentajeMargen: true,
        },
      });

      const totalFacturado = cotizaciones.reduce((acc, c) => acc + (c.total || 0), 0);
      const totalCosto = cotizaciones.reduce((acc, c) => acc + (c.costoTotal || 0), 0);
      const gananciaBruta = cotizaciones.reduce((acc, c) => acc + (c.margenNeto || 0), 0);
      const margenPromedio =
        cotizaciones.length > 0
          ? Math.round(cotizaciones.reduce((acc, c) => acc + (c.porcentajeMargen || 0), 0) / cotizaciones.length)
          : 0;

      finanzas = {
        totalFacturado,
        totalCosto,
        gananciaBruta,
        margenPromedio,
        cotizacionesAprobadas: cotizaciones.length,
      };
    }

    return {
      periodo: {
        fechaInicio: filtro.fechaInicio || null,
        fechaFin: filtro.fechaFin || null,
      },
      operaciones: {
        totalOT,
        otCompletadasTotal,
        ordenesEnProceso,
        porcentajeATiempo,
        horasInvertidasTotal: Math.round(horasInvertidasTotal * 10) / 10,
        pipelineEstados,
      },
      ultimasOrdenes,
      rankingRepuestos,
      productividadMecanicos,
      finanzas,
    };
  }
}
