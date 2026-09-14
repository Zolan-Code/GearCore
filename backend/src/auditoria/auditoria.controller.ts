import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RolUsuario } from '@prisma/client';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AuditoriaService } from './auditoria.service';

@Controller('auditoria')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Get()
  @Roles(RolUsuario.ADMINISTRADOR)
  async listar(@Query('limite') limite?: string) {
    const lim = limite ? parseInt(limite, 10) : 100;
    return this.auditoriaService.listar(lim);
  }
}
