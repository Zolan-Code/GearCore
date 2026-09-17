import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CrearRepuestoDto } from './dto/crear-repuesto.dto';
import { ActualizarRepuestoDto } from './dto/actualizar-repuesto.dto';
import { AjusteStockDto } from './dto/ajuste-stock.dto';
import { ImportarRepuestosDto } from './dto/importar-repuestos.dto';
import { TipoMovimientoStock } from '@prisma/client';

@Injectable()
export class RepuestosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Listar repuestos con filtros y métricas globales de inventario (SCRUM-22, SCRUM-24)
   */
  async listar(filtros: { busqueda?: string; stockBajo?: boolean }) {
    const where: any = {};

    if (filtros.busqueda?.trim()) {
      const q = filtros.busqueda.trim();
      where.OR = [
        { codigo: { contains: q, mode: 'insensitive' } },
        { nombre: { contains: q, mode: 'insensitive' } },
      ];
    }

    const todos = await this.prisma.repuesto.findMany({
      where,
      orderBy: { creadoEn: 'desc' },
      include: {
        _count: {
          select: { usosEnOT: true },
        },
      },
    });

    // Calcular KPIs de inventario
    const todosParaKpis = await this.prisma.repuesto.findMany({
      select: {
        stock: true,
        stockMinimo: true,
        precioCompra: true,
      },
    });

    const totalRepuestos = todosParaKpis.length;
    let valorTotalInventario = 0;
    let totalStockBajo = 0;
    let totalAgotados = 0;

    for (const r of todosParaKpis) {
      valorTotalInventario += r.stock * r.precioCompra;
      if (r.stock === 0) {
        totalAgotados++;
      } else if (r.stock <= r.stockMinimo) {
        totalStockBajo++;
      }
    }

    let items = todos.map((r) => {
      const margenMoneda = r.precioVenta - r.precioCompra;
      const margenPorcentaje =
        r.precioVenta > 0
          ? Math.round((margenMoneda / r.precioVenta) * 100 * 10) / 10
          : 0;

      return {
        ...r,
        margenMoneda,
        margenPorcentaje,
        enAlerta: r.stock <= r.stockMinimo,
        agotado: r.stock === 0,
      };
    });

    if (filtros.stockBajo) {
      items = items.filter((r) => r.enAlerta);
    }

    return {
      items,
      kpis: {
        totalRepuestos,
        valorTotalInventario,
        totalStockBajo,
        totalAgotados,
      },
    };
  }

  /**
   * Obtener detalle completo de un repuesto con su historial de movimientos
   */
  async obtenerPorId(id: string) {
    const repuesto = await this.prisma.repuesto.findUnique({
      where: { id },
      include: {
        movimientos: {
          orderBy: { creadoEn: 'desc' },
          take: 50,
          include: {
            usuario: {
              select: { id: true, nombre: true, email: true, rol: true },
            },
          },
        },
        usosEnOT: {
          take: 20,
          include: {
            orden: {
              select: {
                id: true,
                estado: true,
                fechaRecepcion: true,
                vehiculo: {
                  select: { patente: true, marca: true, modelo: true },
                },
              },
            },
          },
        },
      },
    });

    if (!repuesto) {
      throw new NotFoundException(`Repuesto con ID ${id} no encontrado.`);
    }

    const margenMoneda = repuesto.precioVenta - repuesto.precioCompra;
    const margenPorcentaje =
      repuesto.precioVenta > 0
        ? Math.round((margenMoneda / repuesto.precioVenta) * 100 * 10) / 10
        : 0;

    return {
      ...repuesto,
      margenMoneda,
      margenPorcentaje,
      enAlerta: repuesto.stock <= repuesto.stockMinimo,
      agotado: repuesto.stock === 0,
    };
  }

  /**
   * Registrar nuevo repuesto (SCRUM-22)
   */
  async crear(dto: CrearRepuestoDto, usuarioId?: string) {
    const codigoNorm = dto.codigo.trim().toUpperCase();

    const existe = await this.prisma.repuesto.findUnique({
      where: { codigo: codigoNorm },
    });
    if (existe) {
      throw new BadRequestException(
        `Ya existe un repuesto registrado con el código [${codigoNorm}].`,
      );
    }

    const stockInicial = dto.stock ?? 0;
    const stockMin = dto.stockMinimo ?? 5;

    const repuesto = await this.prisma.$transaction(async (tx) => {
      const nuevo = await tx.repuesto.create({
        data: {
          codigo: codigoNorm,
          nombre: dto.nombre.trim(),
          stock: stockInicial,
          stockMinimo: stockMin,
          precioCompra: dto.precioCompra,
          precioVenta: dto.precioVenta,
        },
      });

      if (stockInicial > 0) {
        await tx.movimientoInventario.create({
          data: {
            repuestoId: nuevo.id,
            tipo: TipoMovimientoStock.ENTRADA_MANUAL,
            cantidad: stockInicial,
            stockAnterior: 0,
            stockNuevo: stockInicial,
            motivo: 'Inventario inicial al crear repuesto',
            usuarioId: usuarioId || null,
          },
        });
      }

      return nuevo;
    });

    await this.auditoriaService.registrar({
      usuarioId,
      accion: 'CREACION_REPUESTO',
      entidad: 'Repuesto',
      entidadId: repuesto.id,
      detalles: `Repuesto [${repuesto.codigo}] "${repuesto.nombre}" creado con stock ${repuesto.stock}, precio venta $${repuesto.precioVenta}.`,
    });

    return repuesto;
  }

  /**
   * Actualizar datos del repuesto (SCRUM-22, SCRUM-40)
   */
  async actualizar(
    id: string,
    dto: ActualizarRepuestoDto,
    usuarioId?: string,
    rolUsuario?: string,
  ) {
    const actual = await this.prisma.repuesto.findUnique({ where: { id } });
    if (!actual) {
      throw new NotFoundException(`Repuesto con ID ${id} no encontrado.`);
    }

    // Regla de negocio SCRUM-40: Solo ADMINISTRADOR puede cambiar precios y márgenes
    const cambiaPrecios =
      (dto.precioCompra !== undefined && dto.precioCompra !== actual.precioCompra) ||
      (dto.precioVenta !== undefined && dto.precioVenta !== actual.precioVenta);

    if (cambiaPrecios && rolUsuario !== 'ADMINISTRADOR') {
      throw new ForbiddenException(
        'Solo los usuarios con rol Administrador tienen autorización para modificar precios o márgenes de repuestos.',
      );
    }

    // Validar unicidad de código si se intenta cambiar
    if (dto.codigo && dto.codigo.trim().toUpperCase() !== actual.codigo) {
      const codNorm = dto.codigo.trim().toUpperCase();
      const duplicado = await this.prisma.repuesto.findUnique({
        where: { codigo: codNorm },
      });
      if (duplicado) {
        throw new BadRequestException(
          `Ya existe otro repuesto con el código [${codNorm}].`,
        );
      }
    }

    const data: any = {};
    if (dto.codigo !== undefined) data.codigo = dto.codigo.trim().toUpperCase();
    if (dto.nombre !== undefined) data.nombre = dto.nombre.trim();
    if (dto.stockMinimo !== undefined) data.stockMinimo = dto.stockMinimo;
    if (dto.precioCompra !== undefined) data.precioCompra = dto.precioCompra;
    if (dto.precioVenta !== undefined) data.precioVenta = dto.precioVenta;

    const actualizado = await this.prisma.repuesto.update({
      where: { id },
      data,
    });

    if (cambiaPrecios) {
      await this.auditoriaService.registrar({
        usuarioId,
        accion: 'CAMBIO_PRECIO',
        entidad: 'Repuesto',
        entidadId: id,
        detalles: `Modificación de precios en repuesto [${actualizado.codigo}]: Compra $${actual.precioCompra} -> $${actualizado.precioCompra}, Venta $${actual.precioVenta} -> $${actualizado.precioVenta}.`,
      });
    }

    return actualizado;
  }

  /**
   * Ajuste manual de stock físico vs stock de sistema (SCRUM-26)
   */
  async ajustarStock(id: string, dto: AjusteStockDto, usuarioId?: string) {
    const actual = await this.prisma.repuesto.findUnique({ where: { id } });
    if (!actual) {
      throw new NotFoundException(`Repuesto con ID ${id} no encontrado.`);
    }

    const stockAnterior = actual.stock;
    const stockNuevo = dto.stockFisico;
    const diferencia = stockNuevo - stockAnterior;

    if (diferencia === 0) {
      return {
        ...actual,
        mensaje: 'El stock físico indicado coincide exactamente con el stock del sistema.',
      };
    }

    const actualizado = await this.prisma.$transaction(async (tx) => {
      const rep = await tx.repuesto.update({
        where: { id },
        data: { stock: stockNuevo },
      });

      await tx.movimientoInventario.create({
        data: {
          repuestoId: id,
          tipo: TipoMovimientoStock.AJUSTE_FISICO,
          cantidad: diferencia,
          stockAnterior,
          stockNuevo,
          motivo: dto.motivo.trim(),
          usuarioId: usuarioId || null,
        },
      });

      return rep;
    });

    // Log de auditoría de evento crítico
    const signo = diferencia > 0 ? `+${diferencia}` : `${diferencia}`;
    await this.auditoriaService.registrar({
      usuarioId,
      accion: 'AJUSTE_STOCK',
      entidad: 'Repuesto',
      entidadId: id,
      detalles: `Ajuste físico en [${actualizado.codigo}] "${actualizado.nombre}": ${stockAnterior} -> ${stockNuevo} (${signo} unidades). Motivo: ${dto.motivo.trim()}`,
    });

    return actualizado;
  }

  /**
   * Importación masiva de inventario inicial (SCRUM-25)
   */
  async importarMasivo(dto: ImportarRepuestosDto, usuarioId?: string) {
    let creados = 0;
    let actualizados = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const item of dto.repuestos) {
        const cod = item.codigo.trim().toUpperCase();
        const nom = item.nombre.trim();
        const stock = item.stock ?? 0;
        const stockMin = item.stockMinimo ?? 5;

        const existente = await tx.repuesto.findUnique({ where: { codigo: cod } });

        if (existente) {
          const stockAnt = existente.stock;
          const nuevoStock = stockAnt + stock;

          await tx.repuesto.update({
            where: { id: existente.id },
            data: {
              nombre: nom || existente.nombre,
              stock: nuevoStock,
              stockMinimo: stockMin,
              precioCompra: item.precioCompra,
              precioVenta: item.precioVenta,
            },
          });

          if (stock > 0) {
            await tx.movimientoInventario.create({
              data: {
                repuestoId: existente.id,
                tipo: TipoMovimientoStock.IMPORTACION_MASIVA,
                cantidad: stock,
                stockAnterior: stockAnt,
                stockNuevo: nuevoStock,
                motivo: 'Importación masiva (actualización de stock)',
                usuarioId: usuarioId || null,
              },
            });
          }
          actualizados++;
        } else {
          const nuevo = await tx.repuesto.create({
            data: {
              codigo: cod,
              nombre: nom,
              stock,
              stockMinimo: stockMin,
              precioCompra: item.precioCompra,
              precioVenta: item.precioVenta,
            },
          });

          if (stock > 0) {
            await tx.movimientoInventario.create({
              data: {
                repuestoId: nuevo.id,
                tipo: TipoMovimientoStock.IMPORTACION_MASIVA,
                cantidad: stock,
                stockAnterior: 0,
                stockNuevo: stock,
                motivo: 'Importación masiva inicial',
                usuarioId: usuarioId || null,
              },
            });
          }
          creados++;
        }
      }
    });

    await this.auditoriaService.registrar({
      usuarioId,
      accion: 'IMPORTACION_INVENTARIO',
      entidad: 'Repuesto',
      detalles: `Importación masiva de inventario procesada: ${creados} repuestos creados, ${actualizados} actualizados.`,
    });

    return {
      ok: true,
      totalProcesados: dto.repuestos.length,
      creados,
      actualizados,
    };
  }

  /**
   * Eliminar repuesto (solo Administrador, y si no tiene OTs asociadas)
   */
  async eliminar(id: string, usuarioId?: string) {
    const repuesto = await this.prisma.repuesto.findUnique({
      where: { id },
      include: {
        _count: {
          select: { usosEnOT: true },
        },
      },
    });

    if (!repuesto) {
      throw new NotFoundException(`Repuesto con ID ${id} no encontrado.`);
    }

    if (repuesto._count.usosEnOT > 0) {
      throw new BadRequestException(
        `No es posible eliminar el repuesto [${repuesto.codigo}] porque está registrado en ${repuesto._count.usosEnOT} Orden(es) de Trabajo.`,
      );
    }

    await this.prisma.repuesto.delete({ where: { id } });

    await this.auditoriaService.registrar({
      usuarioId,
      accion: 'ELIMINACION_REPUESTO',
      entidad: 'Repuesto',
      entidadId: id,
      detalles: `Repuesto [${repuesto.codigo}] "${repuesto.nombre}" eliminado del catálogo.`,
    });

    return { ok: true, mensaje: 'Repuesto eliminado exitosamente.' };
  }
}
