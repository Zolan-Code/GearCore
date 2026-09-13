import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoOT, RolUsuario } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrdenDto } from './dto/create-orden.dto';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto';
import { ActualizarDiagnosticoDto } from './dto/actualizar-diagnostico.dto';
import { RegistrarHorasDto } from './dto/registrar-horas.dto';
import { NotificadorWhatsAppService } from './notificadores/notificador-whatsapp.service';

@Injectable()
export class OrdenesTrabajoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificadorWhatsApp: NotificadorWhatsAppService,
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
      include: {
        vehiculo: {
          include: { cliente: true },
        },
        mecanico: {
          select: { id: true, nombre: true, email: true },
        },
      },
    });
  }

  /**
   * Buscar órdenes con filtros combinables (estado, mecánico, patente, cliente)
   */
  async buscarTodos(filtros?: {
    estado?: EstadoOT;
    mecanicoId?: string;
    busqueda?: string;
  }) {
    const where: any = {};

    if (filtros?.estado) {
      where.estado = filtros.estado;
    }

    if (filtros?.mecanicoId) {
      where.mecanicoId = filtros.mecanicoId;
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
      include: {
        vehiculo: {
          include: { cliente: true },
        },
        mecanico: {
          select: { id: true, nombre: true, email: true },
        },
      },
      orderBy: { creadoEn: 'desc' },
    });
  }

  /**
   * Obtener detalle completo de una Orden de Trabajo
   */
  async buscarPorId(id: string) {
    const orden = await this.prisma.ordenTrabajo.findUnique({
      where: { id },
      include: {
        vehiculo: {
          include: { cliente: true },
        },
        mecanico: {
          select: { id: true, nombre: true, email: true },
        },
        detalleRepuestos: {
          include: { repuesto: true },
        },
      },
    });

    if (!orden) {
      throw new NotFoundException(`Orden de trabajo con ID ${id} no encontrada.`);
    }

    return orden;
  }

  /**
   * Cambiar estado de la OT (flujo de ciclo de vida)
   */
  async cambiarEstado(id: string, dto: CambiarEstadoDto) {
    await this.buscarPorId(id);

    const data: any = { estado: dto.estado };

    if (dto.estado === EstadoOT.ENTREGADO) {
      data.fechaEntrega = new Date();
    }

    return this.prisma.ordenTrabajo.update({
      where: { id },
      data,
      include: {
        vehiculo: {
          include: { cliente: true },
        },
        mecanico: {
          select: { id: true, nombre: true, email: true },
        },
      },
    });
  }

  /**
   * Actualizar diagnóstico, trabajos realizados y fotos
   */
  async actualizarDiagnostico(id: string, dto: ActualizarDiagnosticoDto) {
    await this.buscarPorId(id);

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
      include: {
        vehiculo: {
          include: { cliente: true },
        },
        mecanico: {
          select: { id: true, nombre: true, email: true },
        },
      },
    });
  }

  /**
   * Registrar / sumar horas-hombre invertidas por el mecánico
   */
  async registrarHoras(id: string, dto: RegistrarHorasDto) {
    const orden = await this.buscarPorId(id);

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
      include: {
        vehiculo: {
          include: { cliente: true },
        },
        mecanico: {
          select: { id: true, nombre: true, email: true },
        },
      },
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
}
