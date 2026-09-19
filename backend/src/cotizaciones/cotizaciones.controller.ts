import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { EstadoCotizacion, RolUsuario } from '@prisma/client';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CotizacionesService } from './cotizaciones.service';
import { CotizacionesPdfService, CotizacionPdfData } from './services/cotizaciones-pdf.service';
import { CrearCotizacionDto } from './dto/crear-cotizacion.dto';
import { ActualizarCotizacionDto } from './dto/actualizar-cotizacion.dto';
import { CambiarEstadoCotizacionDto } from './dto/cambiar-estado-cotizacion.dto';

@Controller('cotizaciones')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class CotizacionesController {
  constructor(
    private readonly cotizacionesService: CotizacionesService,
    private readonly pdfService: CotizacionesPdfService,
  ) {}

  @Post()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RECEPCIONISTA)
  async crear(@Body() dto: CrearCotizacionDto, @Req() req: any) {
    return this.cotizacionesService.crear(dto, req.user?.id, req.user?.rol);
  }

  @Get()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RECEPCIONISTA)
  async listar(
    @Query('estado') estado?: EstadoCotizacion,
    @Query('ordenTrabajoId') ordenTrabajoId?: string,
    @Req() req?: any,
  ) {
    return this.cotizacionesService.listar({ estado, ordenTrabajoId }, req?.user?.rol);
  }

  @Get('orden/:ordenId')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RECEPCIONISTA)
  async obtenerPorOrdenId(@Param('ordenId') ordenId: string, @Req() req: any) {
    return this.cotizacionesService.obtenerPorOrdenId(ordenId, req.user?.rol);
  }

  @Get(':id')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RECEPCIONISTA)
  async obtenerPorId(@Param('id') id: string, @Req() req: any) {
    return this.cotizacionesService.obtenerPorId(id, req.user?.rol);
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RECEPCIONISTA)
  async actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarCotizacionDto,
    @Req() req: any,
  ) {
    return this.cotizacionesService.actualizar(id, dto, req.user?.id, req.user?.rol);
  }

  @Patch(':id/estado')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RECEPCIONISTA)
  async cambiarEstado(
    @Param('id') id: string,
    @Body() dto: CambiarEstadoCotizacionDto,
    @Req() req: any,
  ) {
    return this.cotizacionesService.cambiarEstado(id, dto, req.user?.id, req.user?.rol);
  }

  @Get(':id/historial')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RECEPCIONISTA)
  async obtenerHistorial(@Param('id') id: string, @Req() req: any) {
    return this.cotizacionesService.obtenerHistorial(id, req.user?.rol);
  }

  /**
   * Exportar/imprimir PDF (SCRUM-31)
   * Aplica sanitización deny-by-default ANTES de transferir datos al servicio de PDF.
   * El generador de PDF nunca tiene acceso a costos internos ni márgenes.
   */
  @Get(':id/pdf')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RECEPCIONISTA)
  async descargarPdf(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    try {
      // 1. Obtener entidad sanitizada para cliente (sin costos internos)
      const cotizacion = await this.cotizacionesService.obtenerPorId(id, RolUsuario.RECEPCIONISTA);

      // 2. Mapear estrictamente solo los datos comerciales para el cliente
      const pdfPayload: CotizacionPdfData = {
        numero: cotizacion.numero,
        creadoEn: cotizacion.creadoEn,
        validezDias: cotizacion.validezDias,
        fechaVencimiento: cotizacion.fechaVencimiento,
        observaciones: cotizacion.observaciones,
        ordenTrabajo: {
          id: cotizacion.ordenTrabajo.id,
          fallaReportada: cotizacion.ordenTrabajo.fallaReportada,
          vehiculo: {
            patente: cotizacion.ordenTrabajo.vehiculo.patente,
            marca: cotizacion.ordenTrabajo.vehiculo.marca,
            modelo: cotizacion.ordenTrabajo.vehiculo.modelo,
            anio: cotizacion.ordenTrabajo.vehiculo.anio,
            kilometraje: cotizacion.ordenTrabajo.vehiculo.kilometraje,
            cliente: {
              nombre: cotizacion.ordenTrabajo.vehiculo.cliente.nombre,
              rut: cotizacion.ordenTrabajo.vehiculo.cliente.rut,
              telefono: cotizacion.ordenTrabajo.vehiculo.cliente.telefono,
              email: cotizacion.ordenTrabajo.vehiculo.cliente.email,
            },
          },
        },
        subtotalRepuestos: cotizacion.subtotalRepuestos,
        subtotalManoObra: cotizacion.subtotalManoObra,
        subtotalOtros: cotizacion.subtotalOtros,
        descuento: cotizacion.descuento,
        subtotalNeto: cotizacion.subtotalNeto,
        aplicaIva: cotizacion.aplicaIva,
        iva: cotizacion.iva,
        total: cotizacion.total,
        items: (cotizacion.items || []).map((item: any) => ({
          tipo: item.tipo,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          subtotal: item.subtotal,
        })),
      };

      // 3. Generar buffer binario
      const pdfBuffer = await this.pdfService.generarPdf(pdfPayload);

      // 4. Enviar archivo
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="cotizacion-${String(cotizacion.numero).padStart(5, '0')}.pdf"`,
        'Content-Length': pdfBuffer.length,
      });

      res.end(pdfBuffer);
    } catch (err: any) {
      const status = err.status || (typeof err.getStatus === 'function' ? err.getStatus() : 500);
      const message = err.message || 'Error al generar el PDF de la cotización';
      res.status(status).json({ message, statusCode: status });
    }
  }
}
