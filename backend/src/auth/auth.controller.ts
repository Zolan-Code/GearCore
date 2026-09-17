import { Controller, Get, Patch, Body, Req, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { AuthService } from './auth.service';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';

@Controller('auth')
@UseGuards(SupabaseAuthGuard)
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('perfil')
  async obtenerMiPerfil(@Req() req: any) {
    return this.authService.obtenerMiPerfil(req.user.id);
  }

  @Patch('perfil')
  async actualizarMiPerfil(@Req() req: any, @Body() dto: ActualizarPerfilDto) {
    return this.authService.actualizarMiPerfil(req.user.id, dto);
  }
}
