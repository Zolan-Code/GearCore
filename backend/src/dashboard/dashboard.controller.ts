import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { DashboardService } from './dashboard.service';
import { DashboardPdfService } from './services/dashboard-pdf.service';
import { FiltroDashboardDto } from './dto/filtro-dashboard.dto';

@Controller('dashboard')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly dashboardPdfService: DashboardPdfService,
  ) {}

  @Get('metricas')
  @Roles('ADMINISTRADOR', 'RECEPCIONISTA', 'MECANICO')
  async obtenerMetricas(
    @Query() filtro: FiltroDashboardDto,
    @Req() req: any,
  ) {
    const rol = req.user?.rol || 'MECANICO';
    const userId = req.user?.id;
    return this.dashboardService.obtenerMetricas(filtro, rol, userId);
  }

  @Get('reporte-pdf')
  @Roles('ADMINISTRADOR')
  async descargarReportePdf(
    @Query() filtro: FiltroDashboardDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    try {
      const metricas: any = await this.dashboardService.obtenerMetricas(
        filtro,
        'ADMINISTRADOR',
        req.user?.id,
      );

      const pdfBuffer = await this.dashboardPdfService.generarPdf(metricas);

      let filename = 'informe-ejecutivo-dashboard.pdf';
      if (filtro.fechaInicio && filtro.fechaFin) {
        filename = `informe-ejecutivo-${filtro.fechaInicio}-al-${filtro.fechaFin}.pdf`;
      } else if (filtro.fechaInicio) {
        filename = `informe-ejecutivo-desde-${filtro.fechaInicio}.pdf`;
      }

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Content-Length': pdfBuffer.length,
      });

      res.end(pdfBuffer);
    } catch (err: any) {
      const status = err.status || 500;
      const message = err.message || 'Error al generar el informe ejecutivo en PDF';
      res.status(status).json({ message, statusCode: status });
    }
  }
}

