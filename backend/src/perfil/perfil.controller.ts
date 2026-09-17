import { Controller, Get, Patch, Body, Req, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { PerfilService } from './perfil.service';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';

@Controller(['perfil', 'auth/perfil'])
@UseGuards(SupabaseAuthGuard)
export class PerfilController {
  constructor(private readonly perfilService: PerfilService) {}

  @Get()
  async obtenerMiPerfil(@Req() req: any) {
    // El ID se extrae estrictamente del JWT validado por SupabaseAuthGuard
    return this.perfilService.obtenerMiPerfil(req.user.id);
  }

  @Patch()
  async actualizarMiPerfil(@Req() req: any, @Body() dto: ActualizarPerfilDto) {
    // El ID a actualizar proviene únicamente de req.user.id, jamás del body
    return this.perfilService.actualizarMiPerfil(req.user.id, dto);
  }
}
