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

  async decodificarVin(vinRaw: string) {
    const vin = (vinRaw || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (vin.length < 11 || vin.length > 17) {
      return {
        valido: false,
        mensaje: 'El VIN debe tener entre 11 y 17 caracteres alfanuméricos.',
      };
    }

    // 1. Si existe AUTO_DEV_API_KEY, consultar primero Auto.dev (base global comercial)
    const autoDevKey = process.env.AUTO_DEV_API_KEY?.trim();
    if (autoDevKey) {
      try {
        const resAutoDev = await fetch(
          `https://auto.dev/api/vin/${encodeURIComponent(vin)}`,
          {
            headers: {
              Authorization: `Bearer ${autoDevKey}`,
              Accept: 'application/json',
            },
            signal: AbortSignal.timeout(5000),
          },
        );

        if (resAutoDev.ok) {
          const data = await resAutoDev.json();
          const make = (data.make || data.data?.make || '').trim();
          const model = (data.model || data.data?.model || '').trim();
          const year = parseInt(data.year || data.data?.year, 10);

          if (make || model) {
            return {
              valido: true,
              marca: make,
              modelo: model,
              anio: Number.isInteger(year) && year > 1900 ? year : null,
              requiereModeloManual: !model,
            };
          }
        }
      } catch {
        // En caso de timeout o error en Auto.dev, continúa al fallback de NHTSA
      }
    }

    // 2. Fallback a NHTSA vPIC (100% gratuita y pública)
    try {
      const res = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${encodeURIComponent(vin)}?format=json`,
        { signal: AbortSignal.timeout(6000) },
      );
      if (!res.ok) {
        return { valido: false, mensaje: 'Error al consultar servicio NHTSA.' };
      }

      const json = await res.json();
      const r = json?.Results?.[0];
      const make = (r?.Make || '').trim();
      const model = (r?.Model || '').trim();

      if (!r || (!make && !model)) {
        return {
          valido: false,
          mensaje: 'No se encontraron datos para este VIN.',
        };
      }

      const anioNum = parseInt(r.ModelYear, 10);
      return {
        valido: true,
        marca: make,
        modelo: model,
        anio: Number.isInteger(anioNum) && anioNum > 1900 ? anioNum : null,
        requiereModeloManual: !model,
      };
    } catch {
      return {
        valido: false,
        mensaje: 'Tiempo de espera agotado al consultar servicio de VIN.',
      };
    }
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
