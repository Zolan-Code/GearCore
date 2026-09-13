import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EstadoOT, RolUsuario } from '@prisma/client';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OrdenesTrabajoService } from './ordenes-trabajo.service';
import { CreateOrdenDto } from './dto/create-orden.dto';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto';
import { ActualizarDiagnosticoDto } from './dto/actualizar-diagnostico.dto';
import { RegistrarHorasDto } from './dto/registrar-horas.dto';

@Controller('ordenes-trabajo')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class OrdenesTrabajoController {
  constructor(private readonly ordenesService: OrdenesTrabajoService) {}

  @Get('mecanicos')
  async listarMecanicos() {
    return this.ordenesService.listarMecanicos();
  }

  @Post()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RECEPCIONISTA)
  async crear(@Body() dto: CreateOrdenDto) {
    return this.ordenesService.crear(dto);
  }

  @Get()
  async buscarTodos(
    @Query('estado') estado?: EstadoOT,
    @Query('mecanicoId') mecanicoId?: string,
    @Query('busqueda') busqueda?: string,
  ) {
    return this.ordenesService.buscarTodos({ estado, mecanicoId, busqueda });
  }

  @Get(':id')
  async buscarPorId(@Param('id') id: string) {
    return this.ordenesService.buscarPorId(id);
  }

  @Patch(':id/estado')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RECEPCIONISTA, RolUsuario.MECANICO)
  async cambiarEstado(
    @Param('id') id: string,
    @Body() dto: CambiarEstadoDto,
  ) {
    return this.ordenesService.cambiarEstado(id, dto);
  }

  @Patch(':id/diagnostico')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RECEPCIONISTA, RolUsuario.MECANICO)
  async actualizarDiagnostico(
    @Param('id') id: string,
    @Body() dto: ActualizarDiagnosticoDto,
  ) {
    return this.ordenesService.actualizarDiagnostico(id, dto);
  }

  @Post(':id/horas')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.MECANICO)
  async registrarHoras(
    @Param('id') id: string,
    @Body() dto: RegistrarHorasDto,
  ) {
    return this.ordenesService.registrarHoras(id, dto);
  }

  @Get(':id/whatsapp')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RECEPCIONISTA, RolUsuario.MECANICO)
  async generarWhatsApp(@Param('id') id: string) {
    return this.ordenesService.generarWhatsApp(id);
  }
}
