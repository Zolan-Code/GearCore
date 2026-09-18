import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoCotizacion, EstadoOT, Prisma, RolUsuario, TipoMovimientoStock } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrdenDto } from './dto/create-orden.dto';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto';
import { ActualizarDiagnosticoDto } from './dto/actualizar-diagnostico.dto';
import { RegistrarHorasDto } from './dto/registrar-horas.dto';
import { AgregarRepuestoOTDto } from './dto/agregar-repuesto-ot.dto';
import { NotificadorWhatsAppService } from './notificadores/notificador-whatsapp.service';
import { AuditoriaService } from '../auditoria/auditoria.service';

const ordenInclude = Prisma.validator<Prisma.OrdenTrabajoInclude>()({
  vehiculo: {
    include: { cliente: true },
  },
  mecanico: {
    select: { id: true, nombre: true, email: true },
  },
  detalleRepuestos: {
    include: { repuesto: true },
  },
  cotizacion: true,
});

@Injectable()
export class OrdenesTrabajoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificadorWhatsApp: NotificadorWhatsAppService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Lista todos los mecánicos activos en el taller para asignación
   */
  async listarMecanicos() {
    return this.prisma.perfil.findMany({
      where: {
        rol: RolUsuario.MECANICO,
        activo: true,
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
      },
      orderBy: { nombre: 'asc' },
    });
  }

  /**
   * Crear nueva Orden de Trabajo con checklist de recepción
   */
  async crear(dto: CreateOrdenDto) {
    const vehiculo = await this.prisma.vehiculo.findUnique({
      where: { id: dto.vehiculoId },
      include: { cliente: true },
    });

    if (!vehiculo) {
      throw new NotFoundException(
        `Vehículo con ID ${dto.vehiculoId} no encontrado.`,
      );
    }

    if (dto.mecanicoId) {
      const mecanico = await this.prisma.perfil.findUnique({
        where: { id: dto.mecanicoId },
      });
      if (!mecanico || !mecanico.activo) {
        throw new NotFoundException(
          `Mecánico con ID ${dto.mecanicoId} no encontrado o inactivo.`,
        );
      }
    }

    // Si viene kilometraje de recepción mayor al actual del vehículo, actualizarlo
    if (
      dto.kilometrajeRecepcion !== undefined &&
      dto.kilometrajeRecepcion > (vehiculo.kilometraje || 0)
    ) {
      await this.prisma.vehiculo.update({
        where: { id: dto.vehiculoId },
        data: { kilometraje: dto.kilometrajeRecepcion },
      });
    }

    return this.prisma.ordenTrabajo.create({
      data: {
        vehiculoId: dto.vehiculoId,
        mecanicoId: dto.mecanicoId || null,
        fallaReportada: dto.fallaReportada.trim(),
        estado: EstadoOT.RECIBIDO,
        nivelCombustible: dto.nivelCombustible || null,
        rayonesCarroceria: dto.rayonesCarroceria?.trim() || null,
        elementosValor: dto.elementosValor?.trim() || null,
        kilometrajeRecepcion: dto.kilometrajeRecepcion ?? vehiculo.kilometraje,
        fotosDiagnostico: dto.fotosDiagnostico || [],
      },
      include: ordenInclude,
    });
  }

  /**
   * Buscar órdenes con filtros combinables (estado, mecánico, patente, cliente)
   */
  async buscarTodos(
    filtros?: {
      estado?: EstadoOT;
      mecanicoId?: string;
      busqueda?: string;
    },
    usuarioId?: string,
  ) {
    const where: any = {};

    // Si el usuario solicitante es MECANICO, forzar filtro a sus propias órdenes
    if (usuarioId) {
      const perfil = await this.prisma.perfil.findUnique({ where: { id: usuarioId } });
      if (perfil?.rol === RolUsuario.MECANICO) {
        where.mecanicoId = perfil.id;
      } else if (filtros?.mecanicoId) {
        if (filtros.mecanicoId === 'SIN_ASIGNAR') {
          where.mecanicoId = null;
        } else if (filtros.mecanicoId !== 'TODOS') {
          where.mecanicoId = filtros.mecanicoId;
        }
      }
    } else if (filtros?.mecanicoId) {
      if (filtros.mecanicoId === 'SIN_ASIGNAR') {
        where.mecanicoId = null;
      } else if (filtros.mecanicoId !== 'TODOS') {
        where.mecanicoId = filtros.mecanicoId;
      }
    }

    if (filtros?.estado) {
      where.estado = filtros.estado;
    }

    if (filtros?.busqueda) {
      const q = filtros.busqueda.trim();
      where.OR = [
        { fallaReportada: { contains: q, mode: 'insensitive' } },
        { vehiculo: { patente: { contains: q, mode: 'insensitive' } } },
        { vehiculo: { cliente: { nombre: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    return this.prisma.ordenTrabajo.findMany({
      where,
      include: ordenInclude,
      orderBy: { creadoEn: 'desc' },
    });
  }

  /**
   * Obtener detalle completo de una Orden de Trabajo
   */
  async buscarPorId(id: string, usuarioId?: string) {
    const orden = await this.prisma.ordenTrabajo.findUnique({
      where: { id },
      include: ordenInclude,
    });

    if (!orden) {
      throw new NotFoundException(`Orden de trabajo con ID ${id} no encontrada.`);
    }

    if (usuarioId) {
      const perfil = await this.prisma.perfil.findUnique({ where: { id: usuarioId } });
      if (perfil?.rol === RolUsuario.MECANICO && orden.mecanicoId !== perfil.id) {
        throw new ForbiddenException(
          'No tienes permisos para acceder a órdenes de trabajo asignadas a otros mecánicos.',
        );
      }
    }

    return orden;
  }

  /**
   * Cambiar estado de la OT (flujo de ciclo de vida)
   */
  async cambiarEstado(id: string, dto: CambiarEstadoDto, usuarioId?: string) {
    const orden = await this.buscarPorId(id, usuarioId);

    // 1. Bloqueo si la cotización no está aprobada por el cliente
    if (dto.estado === EstadoOT.APROBADO || dto.estado === EstadoOT.EN_REPARACION) {
      const cot = (orden as any).cotizacion;
      if (cot && cot.estado !== EstadoCotizacion.APROBADA) {
        throw new BadRequestException(
          `No se puede avanzar la orden a ${dto.estado} porque la cotización COT-${String(cot.numero).padStart(5, '0')} está en estado ${cot.estado}. Debe ser aprobada previamente por el cliente.`,
        );
      }
    }

    // 2. Control de permisos para rol MECANICO
    if (usuarioId) {
      const perfil = await this.prisma.perfil.findUnique({ where: { id: usuarioId } });
      if (perfil?.rol === RolUsuario.MECANICO) {
        if (dto.estado === EstadoOT.APROBADO) {
          throw new ForbiddenException(
            'Los mecánicos no tienen permisos para dar aprobación a cotizaciones. La aprobación comercial corresponde al cliente y recepción.',
          );
        }
        if (orden.estado === EstadoOT.COTIZACION && dto.estado !== EstadoOT.DIAGNOSTICO) {
          throw new ForbiddenException(
            'La orden está en etapa de Cotización. Espera a que el cliente la apruebe antes de iniciar los trabajos.',
          );
        }
      }
    }

    const data: any = { estado: dto.estado };

    if (dto.estado === EstadoOT.ENTREGADO) {
      data.fechaEntrega = new Date();
    }

    return this.prisma.ordenTrabajo.update({
      where: { id },
      data,
      include: ordenInclude,
    });
  }

  /**
   * Actualizar diagnóstico, trabajos realizados y fotos
   */
  async actualizarDiagnostico(id: string, dto: ActualizarDiagnosticoDto, usuarioId?: string) {
    await this.buscarPorId(id, usuarioId);

    const data: any = {};

    if (dto.fallaReportada !== undefined) {
      data.fallaReportada = dto.fallaReportada.trim();
    }
    if (dto.diagnostico !== undefined) {
      data.diagnostico = dto.diagnostico.trim();
    }
    if (dto.trabajoRealizado !== undefined) {
      data.trabajoRealizado = dto.trabajoRealizado.trim();
    }
    if (dto.mecanicoId !== undefined) {
      data.mecanicoId = dto.mecanicoId || null;
    }
    if (dto.fotosDiagnostico !== undefined) {
      data.fotosDiagnostico = dto.fotosDiagnostico;
    }
    if (dto.horasHombre !== undefined) {
      data.horasHombre = dto.horasHombre;
    }
    if (dto.nivelCombustible !== undefined) {
      data.nivelCombustible = dto.nivelCombustible;
    }
    if (dto.rayonesCarroceria !== undefined) {
      data.rayonesCarroceria = dto.rayonesCarroceria?.trim() || null;
    }
    if (dto.elementosValor !== undefined) {
      data.elementosValor = dto.elementosValor?.trim() || null;
    }

    return this.prisma.ordenTrabajo.update({
      where: { id },
      data,
      include: ordenInclude,
    });
  }

  /**
   * Registrar / sumar horas-hombre invertidas por el mecánico
   */
  async registrarHoras(id: string, dto: RegistrarHorasDto, usuarioId?: string) {
    const orden = await this.buscarPorId(id, usuarioId);

    const horasActualizadas = Number(orden.horasHombre || 0) + Number(dto.horas);
    let trabajo = orden.trabajoRealizado || '';

    if (dto.comentario) {
      const fecha = new Date().toLocaleString('es-CL');
      const nota = `[${fecha}] +${dto.horas}h: ${dto.comentario.trim()}`;
      trabajo = trabajo ? `${trabajo}\n${nota}` : nota;
    }

    return this.prisma.ordenTrabajo.update({
      where: { id },
      data: {
        horasHombre: Math.round(horasActualizadas * 10) / 10,
        trabajoRealizado: trabajo,
      },
      include: ordenInclude,
    });
  }

  /**
   * Generar notificación lista para enviar por WhatsApp al cliente (SCRUM-20)
   */
  async generarWhatsApp(id: string) {
    const orden = await this.buscarPorId(id);
    const cliente = orden.vehiculo.cliente;

    if (!cliente.telefono) {
      throw new BadRequestException(
        `El cliente ${cliente.nombre} no tiene registrado un número de teléfono.`,
      );
    }

    const detalle = orden.diagnostico || orden.trabajoRealizado || undefined;

    return this.notificadorWhatsApp.generarNotificacion(
      cliente.telefono,
      cliente.nombre,
      orden.id,
      orden.vehiculo.patente,
      orden.estado,
      detalle,
    );
  }

  /**
   * Eliminar orden de trabajo (solo Administrador) con log de auditoría (SCRUM-41)
   */
  async eliminar(id: string, adminUserId: string) {
    const orden = await this.buscarPorId(id);

    await this.prisma.ordenTrabajo.delete({
      where: { id },
    });

    await this.auditoriaService.registrar({
      usuarioId: adminUserId,
      accion: 'ELIMINACION_OT',
      entidad: 'OrdenTrabajo',
      entidadId: id,
      detalles: `OT #${orden.id.slice(0, 8).toUpperCase()} (Vehículo: ${orden.vehiculo.marca} ${orden.vehiculo.modelo}, patente ${orden.vehiculo.patente}, Cliente: ${orden.vehiculo.cliente.nombre}) eliminada permanentemente.`,
    });

    return { ok: true, mensaje: 'Orden de trabajo eliminada exitosamente.' };
  }

  /**
   * Asociar repuesto a una Orden de Trabajo con descuento automático de stock (SCRUM-23)
   */
  async agregarRepuesto(ordenId: string, dto: AgregarRepuestoOTDto, usuarioId?: string) {
    const orden = await this.buscarPorId(ordenId, usuarioId);

    const repuesto = await this.prisma.repuesto.findUnique({
      where: { id: dto.repuestoId },
    });
    if (!repuesto) {
      throw new NotFoundException(`Repuesto con ID ${dto.repuestoId} no encontrado.`);
    }

    if (repuesto.stock < dto.cantidad) {
      throw new BadRequestException(
        `Stock insuficiente para [${repuesto.codigo}] "${repuesto.nombre}". Solicitado: ${dto.cantidad}, Disponible en inventario: ${repuesto.stock}.`,
      );
    }

    const precioUnitario = dto.precioUnitario ?? repuesto.precioVenta;

    return this.prisma.$transaction(async (tx) => {
      // 1. Descontar automáticamente el stock
      const repuestoActualizado = await tx.repuesto.update({
        where: { id: dto.repuestoId },
        data: { stock: { decrement: dto.cantidad } },
      });

      // 2. Asociar a la OT
      const detalle = await tx.detalleOTRepuesto.create({
        data: {
          ordenId,
          repuestoId: dto.repuestoId,
          cantidad: dto.cantidad,
          precioUnitario,
        },
        include: {
          repuesto: true,
        },
      });

      // 3. Registrar movimiento de salida
      await tx.movimientoInventario.create({
        data: {
          repuestoId: dto.repuestoId,
          tipo: TipoMovimientoStock.SALIDA_OT,
          cantidad: -dto.cantidad,
          stockAnterior: repuesto.stock,
          stockNuevo: repuestoActualizado.stock,
          motivo: `Utilizado en OT #${orden.id.slice(0, 8).toUpperCase()} (Patente ${orden.vehiculo.patente})`,
          ordenTrabajoId: ordenId,
          usuarioId: usuarioId || null,
        },
      });

      return detalle;
    });
  }

  /**
   * Quitar repuesto de una Orden de Trabajo y reintegrar stock automáticamente (SCRUM-23)
   */
  async quitarRepuesto(ordenId: string, detalleId: string, usuarioId?: string) {
    const detalle = await this.prisma.detalleOTRepuesto.findUnique({
      where: { id: detalleId },
      include: { repuesto: true },
    });

    if (!detalle || detalle.ordenId !== ordenId) {
      throw new NotFoundException(`El repuesto no está asociado a la OT #${ordenId}.`);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Reintegrar stock al inventario
      const repuestoActualizado = await tx.repuesto.update({
        where: { id: detalle.repuestoId },
        data: { stock: { increment: detalle.cantidad } },
      });

      // 2. Registrar movimiento de devolución
      await tx.movimientoInventario.create({
        data: {
          repuestoId: detalle.repuestoId,
          tipo: TipoMovimientoStock.DEVOLUCION_OT,
          cantidad: detalle.cantidad,
          stockAnterior: detalle.repuesto.stock,
          stockNuevo: repuestoActualizado.stock,
          motivo: `Reintegrado desde OT #${ordenId.slice(0, 8).toUpperCase()}`,
          ordenTrabajoId: ordenId,
          usuarioId: usuarioId || null,
        },
      });

      // 3. Eliminar detalle de la OT
      await tx.detalleOTRepuesto.delete({
        where: { id: detalleId },
      });

      return {
        ok: true,
        mensaje: `Repuesto [${detalle.repuesto.codigo}] reintegrado exitosamente al inventario (+${detalle.cantidad} uds).`,
      };
    });
  }
}
