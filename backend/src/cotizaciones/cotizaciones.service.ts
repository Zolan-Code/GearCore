import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EstadoCotizacion,
  EstadoOT,
  Prisma,
  RolUsuario,
  TipoItemCotizacion,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CalculadorMargenEstandarService } from './strategies/calculador-margen-estandar.service';
import { CrearCotizacionDto } from './dto/crear-cotizacion.dto';
import { ActualizarCotizacionDto } from './dto/actualizar-cotizacion.dto';
import { CambiarEstadoCotizacionDto } from './dto/cambiar-estado-cotizacion.dto';

const cotizacionIncludeCompleto = Prisma.validator<Prisma.CotizacionInclude>()({
  ordenTrabajo: {
    include: {
      vehiculo: {
        include: { cliente: true },
      },
      mecanico: {
        select: { id: true, nombre: true, email: true },
      },
    },
  },
  items: true,
  historialPrecios: {
    include: {
      usuario: {
        select: { id: true, nombre: true, email: true, rol: true },
      },
    },
    orderBy: { creadoEn: 'desc' },
  },
});

@Injectable()
export class CotizacionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculadorMargen: CalculadorMargenEstandarService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Sanitización deny-by-default: Oculta costos internos y márgenes si el usuario no es ADMINISTRADOR
   */
  sanitizarPorRol(cotizacion: any, rol?: string) {
    if (!cotizacion) return cotizacion;

    if (rol === RolUsuario.ADMINISTRADOR) {
      return cotizacion;
    }

    // Copia profunda para no mutar objeto de Prisma
    const sanitized = JSON.parse(JSON.stringify(cotizacion));

    delete sanitized.costoRepuestos;
    delete sanitized.costoManoObra;
    delete sanitized.costoOtros;
    delete sanitized.costoTotal;
    delete sanitized.margenNeto;
    delete sanitized.porcentajeMargen;
    delete sanitized.costoHoraHombre;

    if (Array.isArray(sanitized.items)) {
      sanitized.items.forEach((item: any) => {
        delete item.costoUnitario;
      });
    }

    if (Array.isArray(sanitized.historialPrecios)) {
      sanitized.historialPrecios.forEach((h: any) => {
        if (h.detalles) {
          try {
            const parsed = JSON.parse(h.detalles);
            if (Array.isArray(parsed.itemsAnteriores)) {
              parsed.itemsAnteriores.forEach((item: any) => {
                delete item.costoUnitario;
              });
            }
            delete parsed.costoHoraHombreAnterior;
            delete parsed.costoTotalAnterior;
            delete parsed.margenNetoAnterior;
            delete parsed.porcentajeMargenAnterior;
            h.detalles = JSON.stringify(parsed);
          } catch {
            // Si no es JSON válido, mantener como está
          }
        }
      });
    }

    return sanitized;
  }

  /**
   * Generar cotización sumando costos de la OT (SCRUM-29 y SCRUM-30)
   * Copia valores fijos (snapshot) desde OT y catálogo de repuestos
   */
  async crear(dto: CrearCotizacionDto, usuarioId?: string, rol?: string) {
    const orden = await this.prisma.ordenTrabajo.findUnique({
      where: { id: dto.ordenTrabajoId },
      include: {
        vehiculo: { include: { cliente: true } },
        detalleRepuestos: { include: { repuesto: true } },
        cotizacion: true,
      },
    });

    if (!orden) {
      throw new NotFoundException(`Orden de Trabajo con ID ${dto.ordenTrabajoId} no encontrada.`);
    }

    if (orden.cotizacion) {
      throw new ConflictException(
        `La OT #${orden.id.slice(0, 8).toUpperCase()} ya cuenta con la Cotización N° ${orden.cotizacion.numero}. Modifique la cotización existente para mantener trazabilidad.`,
      );
    }

    // 1. Snapshot Repuestos desde la OT
    let subtotalRepuestos = 0;
    let costoRepuestos = 0;
    const itemsData: Array<{
      tipo: TipoItemCotizacion;
      referenciaId?: string;
      descripcion: string;
      cantidad: number;
      precioUnitario: number;
      costoUnitario: number;
      subtotal: number;
    }> = [];

    for (const det of orden.detalleRepuestos) {
      const cant = Number(det.cantidad) || 1;
      const precioUnit = Number(det.precioUnitario) || 0;
      const costoUnit = Number(det.repuesto.precioCompra) || 0;
      const subtotalItem = Math.round(cant * precioUnit * 100) / 100;

      subtotalRepuestos += subtotalItem;
      costoRepuestos += Math.round(cant * costoUnit * 100) / 100;

      itemsData.push({
        tipo: TipoItemCotizacion.REPUESTO,
        referenciaId: det.repuestoId,
        descripcion: `[${det.repuesto.codigo}] ${det.repuesto.nombre}`,
        cantidad: cant,
        precioUnitario: precioUnit,
        costoUnitario: costoUnit,
        subtotal: subtotalItem,
      });
    }

    // 2. Snapshot Mano de Obra
    const horasHombre = dto.horasHombre !== undefined ? Number(dto.horasHombre) : Number(orden.horasHombre) || 0;
    const valorHoraHombre = dto.valorHoraHombre !== undefined ? Number(dto.valorHoraHombre) : 25000;
    const costoHoraHombre = dto.costoHoraHombre !== undefined ? Number(dto.costoHoraHombre) : 12000;

    const subtotalManoObra = Math.round(horasHombre * valorHoraHombre * 100) / 100;
    const costoManoObra = Math.round(horasHombre * costoHoraHombre * 100) / 100;

    if (horasHombre > 0) {
      itemsData.push({
        tipo: TipoItemCotizacion.MANO_DE_OBRA,
        descripcion: `Mano de obra y diagnóstico técnico (${horasHombre} hrs)`,
        cantidad: horasHombre,
        precioUnitario: valorHoraHombre,
        costoUnitario: costoHoraHombre,
        subtotal: subtotalManoObra,
      });
    }

    // 3. Ítems adicionales (servicios de terceros, rectificaciones, etc.)
    let subtotalOtros = 0;
    let costoOtros = 0;
    if (dto.itemsAdicionales && dto.itemsAdicionales.length > 0) {
      for (const item of dto.itemsAdicionales) {
        const cant = Number(item.cantidad) || 1;
        const precioUnit = Number(item.precioUnitario) || 0;
        const costoUnit = Number(item.costoUnitario) || 0;
        const subtotalItem = Math.round(cant * precioUnit * 100) / 100;

        subtotalOtros += subtotalItem;
        costoOtros += Math.round(cant * costoUnit * 100) / 100;

        itemsData.push({
          tipo: item.tipo || TipoItemCotizacion.SERVICIO_EXTERNO,
          referenciaId: item.referenciaId,
          descripcion: item.descripcion.trim(),
          cantidad: cant,
          precioUnitario: precioUnit,
          costoUnitario: costoUnit,
          subtotal: subtotalItem,
        });
      }
    }

    // 4. Configuración del Taller (IVA y validez iniciales)
    let configTaller: any = null;
    try {
      configTaller = await this.prisma.configuracionTaller.findUnique({
        where: { id: 'taller-config' },
      });
    } catch {
      // Fallback defensivo a valores por defecto
    }

    const ivaPorDefecto = configTaller?.ivaPorDefecto ?? 19;
    const validezDiasPorDefecto = configTaller?.validezDiasPorDefecto ?? 15;

    // 5. Totales y descuentos
    const descuento = Number(dto.descuento) || 0;
    const subtotalBruto = subtotalRepuestos + subtotalManoObra + subtotalOtros;
    const subtotalNeto = Math.max(0, Math.round((subtotalBruto - descuento) * 100) / 100);

    const aplicaIva = dto.aplicaIva !== undefined ? dto.aplicaIva : true;
    const iva = aplicaIva ? Math.round(subtotalNeto * (ivaPorDefecto / 100)) : 0;
    const total = subtotalNeto + iva;

    // 6. Cálculo SOLID de rentabilidad
    const rentabilidad = this.calculadorMargen.calcular({
      costoRepuestos,
      costoManoObra,
      costoOtros,
      subtotalNeto,
    });

    const validezDias = dto.validezDias !== undefined ? Number(dto.validezDias) : validezDiasPorDefecto;
    const fechaVencimiento = new Date();
    fechaVencimiento.setDate(fechaVencimiento.getDate() + validezDias);

    // 6. Transacción en Base de Datos
    const cotizacionCreada = await this.prisma.$transaction(async (tx) => {
      const cotizacion = await tx.cotizacion.create({
        data: {
          ordenTrabajoId: dto.ordenTrabajoId,
          estado: EstadoCotizacion.BORRADOR,
          validezDias,
          fechaVencimiento,
          observaciones: dto.observaciones?.trim() || null,
          horasHombre,
          valorHoraHombre,
          costoHoraHombre,
          subtotalRepuestos,
          subtotalManoObra,
          subtotalOtros,
          descuento,
          subtotalNeto,
          aplicaIva,
          iva,
          total,
          costoRepuestos,
          costoManoObra,
          costoOtros,
          costoTotal: rentabilidad.costoTotal,
          margenNeto: rentabilidad.margenNeto,
          porcentajeMargen: rentabilidad.porcentajeMargen,
          items: {
            create: itemsData,
          },
        },
        include: cotizacionIncludeCompleto,
      });

      // Si la OT estaba en RECIBIDO o DIAGNOSTICO, avanzar a COTIZACION
      if (
        orden.estado === EstadoOT.RECIBIDO ||
        orden.estado === EstadoOT.DIAGNOSTICO
      ) {
        await tx.ordenTrabajo.update({
          where: { id: dto.ordenTrabajoId },
          data: { estado: EstadoOT.COTIZACION },
        });
      }

      return cotizacion;
    });

    await this.auditoriaService.registrar({
      usuarioId,
      accion: 'CREAR_COTIZACION',
      entidad: 'Cotizacion',
      entidadId: cotizacionCreada.id,
      detalles: `Cotización N° ${cotizacionCreada.numero} creada para OT #${orden.id.slice(0, 8).toUpperCase()}. Total: $${total.toLocaleString('es-CL')} CLP.`,
    });

    return this.sanitizarPorRol(cotizacionCreada, rol);
  }

  /**
   * Actualizar cotización con trazabilidad estricta (SCRUM-32)
   * Almacena snapshot íntegro de ítems y valores anteriores en HistorialPrecioCotizacion
   */
  async actualizar(id: string, dto: ActualizarCotizacionDto, usuarioId?: string, rol?: string) {
    const cotizacionActual = await this.prisma.cotizacion.findUnique({
      where: { id },
      include: {
        items: true,
        ordenTrabajo: {
          include: {
            vehiculo: { include: { cliente: true } },
          },
        },
      },
    });

    if (!cotizacionActual) {
      throw new NotFoundException(`Cotización con ID ${id} no encontrada.`);
    }

    // 1. Preparar snapshot completo de la versión anterior para trazabilidad
    const snapshotItemsAnteriores = cotizacionActual.items.map((i) => ({
      id: i.id,
      tipo: i.tipo,
      referenciaId: i.referenciaId,
      descripcion: i.descripcion,
      cantidad: i.cantidad,
      precioUnitario: i.precioUnitario,
      costoUnitario: i.costoUnitario,
      subtotal: i.subtotal,
    }));

    const detallesAuditoria = JSON.stringify({
      motivoCambio: dto.motivo.trim(),
      itemsAnteriores: snapshotItemsAnteriores,
      horasHombreAnterior: cotizacionActual.horasHombre,
      valorHoraHombreAnterior: cotizacionActual.valorHoraHombre,
      costoHoraHombreAnterior: cotizacionActual.costoHoraHombre,
      descuentoAnterior: cotizacionActual.descuento,
      subtotalRepuestosAnterior: cotizacionActual.subtotalRepuestos,
      subtotalManoObraAnterior: cotizacionActual.subtotalManoObra,
      subtotalOtrosAnterior: cotizacionActual.subtotalOtros,
      costoTotalAnterior: cotizacionActual.costoTotal,
      margenNetoAnterior: cotizacionActual.margenNeto,
      porcentajeMargenAnterior: cotizacionActual.porcentajeMargen,
    });

    // 2. Procesar ítems nuevos o actualizados
    let itemsNuevos: Array<{
      tipo: TipoItemCotizacion;
      referenciaId?: string;
      descripcion: string;
      cantidad: number;
      precioUnitario: number;
      costoUnitario: number;
      subtotal: number;
    }> = [];

    let subtotalRepuestos = 0;
    let costoRepuestos = 0;
    let subtotalManoObra = 0;
    let costoManoObra = 0;
    let subtotalOtros = 0;
    let costoOtros = 0;

    const horasHombre = dto.horasHombre !== undefined ? Number(dto.horasHombre) : cotizacionActual.horasHombre;
    const valorHoraHombre = dto.valorHoraHombre !== undefined ? Number(dto.valorHoraHombre) : cotizacionActual.valorHoraHombre;
    const costoHoraHombre = dto.costoHoraHombre !== undefined ? Number(dto.costoHoraHombre) : cotizacionActual.costoHoraHombre;

    if (dto.items && dto.items.length > 0) {
      for (const item of dto.items) {
        const cant = Number(item.cantidad) || 1;
        const precioUnit = Number(item.precioUnitario) || 0;
        // Si el usuario que edita no es Admin y no especifica costo, mantener costo unitario previo
        const itemPrevio = cotizacionActual.items.find((it) => it.id === item.id || it.descripcion === item.descripcion);
        const costoUnit = item.costoUnitario !== undefined ? Number(item.costoUnitario) : (itemPrevio?.costoUnitario || 0);
        const subtotalItem = Math.round(cant * precioUnit * 100) / 100;
        const costoItem = Math.round(cant * costoUnit * 100) / 100;

        const tipo = item.tipo || TipoItemCotizacion.REPUESTO;
        if (tipo === TipoItemCotizacion.REPUESTO) {
          subtotalRepuestos += subtotalItem;
          costoRepuestos += costoItem;
        } else if (tipo === TipoItemCotizacion.MANO_DE_OBRA) {
          subtotalManoObra += subtotalItem;
          costoManoObra += costoItem;
        } else {
          subtotalOtros += subtotalItem;
          costoOtros += costoItem;
        }

        itemsNuevos.push({
          tipo,
          referenciaId: item.referenciaId,
          descripcion: item.descripcion.trim(),
          cantidad: cant,
          precioUnitario: precioUnit,
          costoUnitario: costoUnit,
          subtotal: subtotalItem,
        });
      }
    } else {
      // Si no reemplazan la lista de ítems, usar los existentes recalculando mano de obra si cambió
      subtotalRepuestos = cotizacionActual.subtotalRepuestos;
      costoRepuestos = cotizacionActual.costoRepuestos;
      subtotalOtros = cotizacionActual.subtotalOtros;
      costoOtros = cotizacionActual.costoOtros;

      subtotalManoObra = Math.round(horasHombre * valorHoraHombre * 100) / 100;
      costoManoObra = Math.round(horasHombre * costoHoraHombre * 100) / 100;

      itemsNuevos = cotizacionActual.items.map((it) => ({
        tipo: it.tipo,
        referenciaId: it.referenciaId || undefined,
        descripcion: it.descripcion,
        cantidad: it.cantidad,
        precioUnitario: it.precioUnitario,
        costoUnitario: it.costoUnitario,
        subtotal: it.subtotal,
      }));
    }

    const descuento = dto.descuento !== undefined ? Number(dto.descuento) : cotizacionActual.descuento;
    const subtotalBruto = subtotalRepuestos + subtotalManoObra + subtotalOtros;
    const subtotalNeto = Math.max(0, Math.round((subtotalBruto - descuento) * 100) / 100);

    const aplicaIva = dto.aplicaIva !== undefined ? dto.aplicaIva : cotizacionActual.aplicaIva;
    const iva = aplicaIva ? Math.round(subtotalNeto * 0.19) : 0;
    const total = subtotalNeto + iva;

    // 3. Recalcular métricas de rentabilidad
    const rentabilidad = this.calculadorMargen.calcular({
      costoRepuestos,
      costoManoObra,
      costoOtros,
      subtotalNeto,
    });

    const validezDias = dto.validezDias || cotizacionActual.validezDias;
    const fechaVencimiento = new Date(cotizacionActual.creadoEn);
    fechaVencimiento.setDate(fechaVencimiento.getDate() + validezDias);

    // 4. Ejecutar actualización atómica con registro de historial inmutable
    const cotizacionActualizada = await this.prisma.$transaction(async (tx) => {
      // Registrar entrada en historial de precios (SCRUM-32)
      await tx.historialPrecioCotizacion.create({
        data: {
          cotizacionId: id,
          usuarioId: usuarioId || null,
          totalAnterior: cotizacionActual.total,
          subtotalAnterior: cotizacionActual.subtotalNeto,
          totalNuevo: total,
          subtotalNuevo: subtotalNeto,
          motivo: dto.motivo.trim(),
          detalles: detallesAuditoria,
        },
      });

      // Si se proveyeron nuevos ítems, reemplazar
      if (dto.items && dto.items.length > 0) {
        await tx.itemCotizacion.deleteMany({
          where: { cotizacionId: id },
        });

        await tx.itemCotizacion.createMany({
          data: itemsNuevos.map((item) => ({
            ...item,
            cotizacionId: id,
          })),
        });
      }

      // Actualizar cabecera de cotización
      const cotizacionUpdated = await tx.cotizacion.update({
        where: { id },
        data: {
          estado: dto.estado || cotizacionActual.estado,
          validezDias,
          fechaVencimiento,
          observaciones: dto.observaciones !== undefined ? dto.observaciones?.trim() || null : cotizacionActual.observaciones,
          horasHombre,
          valorHoraHombre,
          costoHoraHombre,
          subtotalRepuestos,
          subtotalManoObra,
          subtotalOtros,
          descuento,
          subtotalNeto,
          aplicaIva,
          iva,
          total,
          costoRepuestos,
          costoManoObra,
          costoOtros,
          costoTotal: rentabilidad.costoTotal,
          margenNeto: rentabilidad.margenNeto,
          porcentajeMargen: rentabilidad.porcentajeMargen,
        },
        include: cotizacionIncludeCompleto,
      });

      // Si la cotización se edita pasando a BORRADOR o ENVIADA y la OT estaba en DIAGNOSTICO (tras rechazo previo), mover a COTIZACION
      const nuevoEstado = dto.estado || cotizacionActual.estado;
      if (
        (nuevoEstado === EstadoCotizacion.BORRADOR || nuevoEstado === EstadoCotizacion.ENVIADA) &&
        cotizacionActual.ordenTrabajo.estado === EstadoOT.DIAGNOSTICO
      ) {
        await tx.ordenTrabajo.update({
          where: { id: cotizacionActual.ordenTrabajoId },
          data: { estado: EstadoOT.COTIZACION },
        });
      }

      return cotizacionUpdated;
    });

    await this.auditoriaService.registrar({
      usuarioId,
      accion: 'ACTUALIZAR_COTIZACION',
      entidad: 'Cotizacion',
      entidadId: id,
      detalles: `Cotización N° ${cotizacionActualizada.numero} actualizada. Motivo: "${dto.motivo.trim()}". Nuevo total: $${total.toLocaleString('es-CL')} CLP.`,
    });

    return this.sanitizarPorRol(cotizacionActualizada, rol);
  }

  /**
   * Cambiar estado de la cotización (BORRADOR, ENVIADA, APROBADA, RECHAZADA)
   * Si es APROBADA, actualiza automáticamente la Orden de Trabajo a APROBADO
   */
  async cambiarEstado(id: string, dto: CambiarEstadoCotizacionDto, usuarioId?: string, rol?: string) {
    const cotizacion = await this.prisma.cotizacion.findUnique({
      where: { id },
      include: { ordenTrabajo: true },
    });

    if (!cotizacion) {
      throw new NotFoundException(`Cotización con ID ${id} no encontrada.`);
    }

    const estadoAnterior = cotizacion.estado;

    const actualizada = await this.prisma.$transaction(async (tx) => {
      const cot = await tx.cotizacion.update({
        where: { id },
        data: { estado: dto.estado },
        include: cotizacionIncludeCompleto,
      });

      // 1. Si la cotización pasa a APROBADA, la OT avanza a APROBADO solo si estaba en COTIZACION
      if (
        dto.estado === EstadoCotizacion.APROBADA &&
        cotizacion.ordenTrabajo.estado === EstadoOT.COTIZACION
      ) {
        await tx.ordenTrabajo.update({
          where: { id: cotizacion.ordenTrabajoId },
          data: { estado: EstadoOT.APROBADO },
        });
      }

      // 2. Si la cotización pasa a RECHAZADA, la OT vuelve a DIAGNOSTICO solo si estaba en COTIZACION
      if (
        dto.estado === EstadoCotizacion.RECHAZADA &&
        cotizacion.ordenTrabajo.estado === EstadoOT.COTIZACION
      ) {
        await tx.ordenTrabajo.update({
          where: { id: cotizacion.ordenTrabajoId },
          data: { estado: EstadoOT.DIAGNOSTICO },
        });
      }

      // 3. Si una cotización rechazada se reabre a BORRADOR o ENVIADA y la OT estaba en DIAGNOSTICO, vuelve a COTIZACION
      if (
        (dto.estado === EstadoCotizacion.BORRADOR || dto.estado === EstadoCotizacion.ENVIADA) &&
        cotizacion.ordenTrabajo.estado === EstadoOT.DIAGNOSTICO
      ) {
        await tx.ordenTrabajo.update({
          where: { id: cotizacion.ordenTrabajoId },
          data: { estado: EstadoOT.COTIZACION },
        });
      }

      return cot;
    });

    await this.auditoriaService.registrar({
      usuarioId,
      accion: 'CAMBIO_ESTADO_COTIZACION',
      entidad: 'Cotizacion',
      entidadId: id,
      detalles: `Cotización N° ${actualizada.numero} cambió de ${estadoAnterior} a ${dto.estado}.${dto.motivo ? ` Motivo: ${dto.motivo}` : ''}`,
    });

    return this.sanitizarPorRol(actualizada, rol);
  }

  /**
   * Listar todas las cotizaciones con filtro por estado
   */
  async listar(filtros: { estado?: EstadoCotizacion; ordenTrabajoId?: string }, rol?: string) {
    const where: Prisma.CotizacionWhereInput = {};

    if (filtros.estado) {
      where.estado = filtros.estado;
    }
    if (filtros.ordenTrabajoId) {
      where.ordenTrabajoId = filtros.ordenTrabajoId;
    }

    const cotizaciones = await this.prisma.cotizacion.findMany({
      where,
      include: cotizacionIncludeCompleto,
      orderBy: { creadoEn: 'desc' },
    });

    return cotizaciones.map((c) => this.sanitizarPorRol(c, rol));
  }

  /**
   * Obtener cotización por ID con desglose y relaciones
   */
  async obtenerPorId(id: string, rol?: string) {
    const cotizacion = await this.prisma.cotizacion.findUnique({
      where: { id },
      include: cotizacionIncludeCompleto,
    });

    if (!cotizacion) {
      throw new NotFoundException(`Cotización con ID ${id} no encontrada.`);
    }

    return this.sanitizarPorRol(cotizacion, rol);
  }

  /**
   * Obtener cotización asociada a una Orden de Trabajo
   */
  async obtenerPorOrdenId(ordenTrabajoId: string, rol?: string) {
    const cotizacion = await this.prisma.cotizacion.findUnique({
      where: { ordenTrabajoId },
      include: cotizacionIncludeCompleto,
    });

    if (!cotizacion) {
      throw new NotFoundException(`No existe cotización asociada a la OT #${ordenTrabajoId.slice(0, 8)}.`);
    }

    return this.sanitizarPorRol(cotizacion, rol);
  }

  /**
   * Obtener historial de precios y trazabilidad de una cotización (SCRUM-32)
   */
  async obtenerHistorial(cotizacionId: string, rol?: string) {
    const cotizacion = await this.prisma.cotizacion.findUnique({
      where: { id: cotizacionId },
    });
    if (!cotizacion) {
      throw new NotFoundException(`Cotización con ID ${cotizacionId} no encontrada.`);
    }

    const historial = await this.prisma.historialPrecioCotizacion.findMany({
      where: { cotizacionId },
      include: {
        usuario: {
          select: { id: true, nombre: true, email: true, rol: true },
        },
      },
      orderBy: { creadoEn: 'desc' },
    });

    if (rol === RolUsuario.ADMINISTRADOR) {
      return historial;
    }

    // Sanitizar snapshot JSON si el usuario no es Admin
    return historial.map((h) => {
      const sanitized = { ...h };
      if (sanitized.detalles) {
        try {
          const parsed = JSON.parse(sanitized.detalles);
          if (Array.isArray(parsed.itemsAnteriores)) {
            parsed.itemsAnteriores.forEach((it: any) => {
              delete it.costoUnitario;
            });
          }
          delete parsed.costoHoraHombreAnterior;
          delete parsed.costoTotalAnterior;
          delete parsed.margenNetoAnterior;
          delete parsed.porcentajeMargenAnterior;
          sanitized.detalles = JSON.stringify(parsed);
        } catch {
          // Ignorar si no es JSON válido
        }
      }
      return sanitized;
    });
  }
}
