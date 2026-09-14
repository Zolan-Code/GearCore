import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { AuthService } from './auth.service';

@Controller('auth')
@UseGuards(SupabaseAuthGuard)
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('perfil')
  async obtenerMiPerfil(@Req() req: any) {
    return this.authService.obtenerMiPerfil(req.user.id);
  }
}
