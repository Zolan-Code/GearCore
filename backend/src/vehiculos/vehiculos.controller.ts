import {
  Body,
  Controller,
  Get,
  HttpStatus,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { VehiculosService } from './vehiculos.service';
import { CreateVehiculoDto } from './dto/create-vehiculo.dto';
import { UpdateVehiculoDto } from './dto/update-vehiculo.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RolUsuario } from '@prisma/client';

@Controller('vehiculos')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class VehiculosController {
  constructor(private readonly vehiculosService: VehiculosService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RECEPCIONISTA)
  async crear(@Body() dto: CreateVehiculoDto) {
    return this.vehiculosService.crear(dto);
  }

  @Get('buscar')
  async buscarPorPatente(@Query('patente') patente?: string) {
    return this.vehiculosService.buscarPorPatente(patente);
  }

  @Get('decodificar-vin/:vin')
  async decodificarVin(@Param('vin') vin: string) {
    return this.vehiculosService.decodificarVin(vin);
  }

  @Get(':id')
  async buscarPorId(@Param('id') id: string) {
    return this.vehiculosService.buscarPorId(id);
  }

  @Get(':id/historial')
  async obtenerHistorialOT(@Param('id') id: string) {
    return this.vehiculosService.obtenerHistorialOT(id);
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RECEPCIONISTA)
  async actualizar(
    @Param('id') id: string,
    @Body() dto: UpdateVehiculoDto,
  ) {
    return this.vehiculosService.actualizar(id, dto);
  }
}
