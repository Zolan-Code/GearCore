import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehiculoDto } from './dto/create-vehiculo.dto';
import { UpdateVehiculoDto } from './dto/update-vehiculo.dto';
import {
  formatearPatente,
  limpiarPatente,
} from '../common/validators/patente.validator';

@Injectable()
export class VehiculosService {
  constructor(private readonly prisma: PrismaService) {}

  async crear(dto: CreateVehiculoDto) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: dto.clienteId },
    });

    if (!cliente) {
      throw new NotFoundException(
        `Cliente con ID ${dto.clienteId} no encontrado.`,
      );
    }

    const patenteNormalizada = formatearPatente(dto.patente);

    const vehiculoExistente = await this.prisma.vehiculo.findUnique({
      where: { patente: patenteNormalizada },
    });

    if (vehiculoExistente) {
      throw new ConflictException(
        `Ya existe un vehículo registrado con la patente ${patenteNormalizada}.`,
      );
    }

    return this.prisma.vehiculo.create({
      data: {
        patente: patenteNormalizada,
        clienteId: dto.clienteId,
        marca: dto.marca.trim(),
        modelo: dto.modelo.trim(),
        vin: dto.vin?.trim() || null,
        anio: dto.anio ?? null,
        kilometraje: dto.kilometraje ?? null,
      },
      include: {
        cliente: true,
      },
    });
  }

  async buscarPorPatente(patenteParcial?: string) {
    if (!patenteParcial || patenteParcial.trim().length === 0) {
      return [];
    }

    const termino = limpiarPatente(patenteParcial);

    return this.prisma.vehiculo.findMany({
      where: {
        patente: {
          contains: termino,
          mode: 'insensitive',
        },
      },
      take: 10,
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            rut: true,
            telefono: true,
          },
        },
      },
      orderBy: { patente: 'asc' },
    });
  }

  async buscarPorId(id: string) {
    const vehiculo = await this.prisma.vehiculo.findUnique({
      where: { id },
      include: {
        cliente: true,
        _count: {
          select: { ordenes: true },
        },
      },
    });

    if (!vehiculo) {
      throw new NotFoundException(`Vehículo con ID ${id} no encontrado.`);
    }

    return vehiculo;
  }

  async obtenerHistorialOT(id: string) {
    // Validar que el vehículo exista
    await this.buscarPorId(id);

    return this.prisma.ordenTrabajo.findMany({
      where: { vehiculoId: id },
      include: {
        mecanico: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
        detalleRepuestos: {
          include: {
            repuesto: {
              select: {
                id: true,
                codigo: true,
                nombre: true,
              },
            },
          },
        },
      },
      orderBy: { creadoEn: 'desc' },
    });
  }

  async actualizar(id: string, dto: UpdateVehiculoDto) {
    await this.buscarPorId(id);

    const dataParaActualizar: Record<string, any> = {};

    if (dto.clienteId !== undefined) {
      const cliente = await this.prisma.cliente.findUnique({
        where: { id: dto.clienteId },
      });
      if (!cliente) {
        throw new NotFoundException(
          `Cliente con ID ${dto.clienteId} no encontrado.`,
        );
      }
      dataParaActualizar.clienteId = dto.clienteId;
    }

    if (dto.patente !== undefined) {
      const patenteNormalizada = formatearPatente(dto.patente);
      const existente = await this.prisma.vehiculo.findUnique({
        where: { patente: patenteNormalizada },
      });

      if (existente && existente.id !== id) {
        throw new ConflictException(
          `Ya existe otro vehículo con la patente ${patenteNormalizada}.`,
        );
      }
      dataParaActualizar.patente = patenteNormalizada;
    }

    if (dto.marca !== undefined) {
      dataParaActualizar.marca = dto.marca.trim();
    }

    if (dto.modelo !== undefined) {
      dataParaActualizar.modelo = dto.modelo.trim();
    }

    if (dto.vin !== undefined) {
      dataParaActualizar.vin = dto.vin?.trim() || null;
    }

    if (dto.anio !== undefined) {
      dataParaActualizar.anio = dto.anio;
    }

    if (dto.kilometraje !== undefined) {
      dataParaActualizar.kilometraje = dto.kilometraje;
    }

    return this.prisma.vehiculo.update({
      where: { id },
      data: dataParaActualizar,
      include: {
        cliente: true,
      },
    });
  }
}
