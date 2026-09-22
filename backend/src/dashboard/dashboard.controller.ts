import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { DashboardService } from './dashboard.service';
import { FiltroDashboardDto } from './dto/filtro-dashboard.dto';

@Controller('dashboard')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

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
}
