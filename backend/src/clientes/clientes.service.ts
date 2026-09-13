import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { formatearRut } from '../common/validators/rut.validator';

@Injectable()
export class ClientesService {
  constructor(private readonly prisma: PrismaService) {}

  async crear(dto: CreateClienteDto) {
    const rutNormalizado = formatearRut(dto.rut);

    const existente = await this.prisma.cliente.findUnique({
      where: { rut: rutNormalizado },
    });

    if (existente) {
      throw new ConflictException(
        `Ya existe un cliente registrado con el RUT ${rutNormalizado}.`,
      );
    }

    return this.prisma.cliente.create({
      data: {
        nombre: dto.nombre.trim(),
        rut: rutNormalizado,
        telefono: dto.telefono?.trim() || null,
        email: dto.email ? dto.email.trim().toLowerCase() : null,
      },
      include: {
        vehiculos: true,
      },
    });
  }

  async buscarTodos(busqueda?: string) {
    const filtro = busqueda?.trim();

    return this.prisma.cliente.findMany({
      where: filtro
        ? {
            OR: [
              { nombre: { contains: filtro, mode: 'insensitive' } },
              { rut: { contains: filtro, mode: 'insensitive' } },
              { email: { contains: filtro, mode: 'insensitive' } },
            ],
          }
        : undefined,
      include: {
        _count: {
          select: { vehiculos: true },
        },
      },
      orderBy: { creadoEn: 'desc' },
    });
  }

  async buscarPorId(id: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id },
      include: {
        vehiculos: {
          orderBy: { creadoEn: 'desc' },
        },
      },
    });

    if (!cliente) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado.`);
    }

    return cliente;
  }

  async actualizar(id: string, dto: UpdateClienteDto) {
    await this.buscarPorId(id);

    const dataParaActualizar: Record<string, any> = {};

    if (dto.nombre !== undefined) {
      dataParaActualizar.nombre = dto.nombre.trim();
    }

    if (dto.rut !== undefined) {
      const rutNormalizado = formatearRut(dto.rut);
      const existente = await this.prisma.cliente.findUnique({
        where: { rut: rutNormalizado },
      });

      if (existente && existente.id !== id) {
        throw new ConflictException(
          `Ya existe otro cliente con el RUT ${rutNormalizado}.`,
        );
      }
      dataParaActualizar.rut = rutNormalizado;
    }

    if (dto.telefono !== undefined) {
      dataParaActualizar.telefono = dto.telefono?.trim() || null;
    }

    if (dto.email !== undefined) {
      dataParaActualizar.email = dto.email ? dto.email.trim().toLowerCase() : null;
    }

    return this.prisma.cliente.update({
      where: { id },
      data: dataParaActualizar,
      include: {
        vehiculos: true,
      },
    });
  }
}
