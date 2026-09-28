import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RolUsuario, TipoItemInventario } from '@prisma/client';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RepuestosService } from './repuestos.service';
import { CrearRepuestoDto } from './dto/crear-repuesto.dto';
import { ActualizarRepuestoDto } from './dto/actualizar-repuesto.dto';
import { AjusteStockDto } from './dto/ajuste-stock.dto';
import { ImportarRepuestosDto } from './dto/importar-repuestos.dto';

@Controller('repuestos')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class RepuestosController {
  constructor(private readonly repuestosService: RepuestosService) {}

  @Get()
  async listar(
    @Query('busqueda') busqueda?: string,
    @Query('stockBajo') stockBajo?: string,
    @Query('tipo') tipo?: TipoItemInventario,
  ) {
    return this.repuestosService.listar({
      busqueda,
      stockBajo: stockBajo === 'true' || stockBajo === '1',
      tipo,
    });
  }

  @Get(':id')
  async obtenerPorId(@Param('id') id: string) {
    return this.repuestosService.obtenerPorId(id);
  }

  @Post()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RECEPCIONISTA)
  async crear(@Body() dto: CrearRepuestoDto, @Req() req: any) {
    return this.repuestosService.crear(dto, req.user?.id);
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RECEPCIONISTA)
  async actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarRepuestoDto,
    @Req() req: any,
  ) {
    return this.repuestosService.actualizar(
      id,
      dto,
      req.user?.id,
      req.user?.rol,
    );
  }

  @Post(':id/ajuste')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RECEPCIONISTA)
  async ajustarStock(
    @Param('id') id: string,
    @Body() dto: AjusteStockDto,
    @Req() req: any,
  ) {
    return this.repuestosService.ajustarStock(id, dto, req.user?.id);
  }

  @Post('importar')
  @Roles(RolUsuario.ADMINISTRADOR)
  async importarMasivo(
    @Body() dto: ImportarRepuestosDto,
    @Req() req: any,
  ) {
    return this.repuestosService.importarMasivo(dto, req.user?.id);
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMINISTRADOR)
  async eliminar(@Param('id') id: string, @Req() req: any) {
    return this.repuestosService.eliminar(id, req.user?.id);
  }
}
