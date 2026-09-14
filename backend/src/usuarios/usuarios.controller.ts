import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RolUsuario } from '@prisma/client';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UsuariosService } from './usuarios.service';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { CambiarRolDto } from './dto/cambiar-rol.dto';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto';

@Controller('usuarios')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMINISTRADOR)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  async listarTodos() {
    return this.usuariosService.listarTodos();
  }

  @Post()
  async crear(@Body() dto: CrearUsuarioDto, @Req() req: any) {
    return this.usuariosService.crear(dto, req.user?.id);
  }

  @Patch(':id/rol')
  async cambiarRol(
    @Param('id') id: string,
    @Body() dto: CambiarRolDto,
    @Req() req: any,
  ) {
    return this.usuariosService.cambiarRol(id, dto, req.user?.id);
  }

  @Patch(':id/estado')
  async cambiarEstado(
    @Param('id') id: string,
    @Body() dto: CambiarEstadoDto,
    @Req() req: any,
  ) {
    return this.usuariosService.cambiarEstado(id, dto, req.user?.id);
  }
}
