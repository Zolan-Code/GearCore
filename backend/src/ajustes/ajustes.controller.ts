import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RolUsuario } from '@prisma/client';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AjustesService } from './ajustes.service';
import { ActualizarConfiguracionDto } from './dto/actualizar-configuracion.dto';

@Controller('ajustes')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class AjustesController {
  constructor(private readonly ajustesService: AjustesService) {}

  /**
   * Obtener la configuración única del taller.
   * Accesible para cualquier usuario autenticado.
   */
  @Get('taller')
  async obtenerConfiguracion() {
    return this.ajustesService.obtenerConfiguracion();
  }

  /**
   * Actualizar la configuración única del taller.
   * Exclusivo para rol ADMINISTRADOR.
   */
  @Patch('taller')
  @Roles(RolUsuario.ADMINISTRADOR)
  async actualizarConfiguracion(
    @Body() dto: ActualizarConfiguracionDto,
    @Req() req: any,
  ) {
    const usuarioId = req.user?.id;
    return this.ajustesService.actualizarConfiguracion(dto, usuarioId);
  }
}
