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
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RolUsuario } from '@prisma/client';

@Controller('clientes')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RECEPCIONISTA)
  async crear(@Body() dto: CreateClienteDto) {
    return this.clientesService.crear(dto);
  }

  @Get()
  async buscarTodos(@Query('q') busqueda?: string) {
    return this.clientesService.buscarTodos(busqueda);
  }

  @Get(':id')
  async buscarPorId(@Param('id') id: string) {
    return this.clientesService.buscarPorId(id);
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.RECEPCIONISTA)
  async actualizar(
    @Param('id') id: string,
    @Body() dto: UpdateClienteDto,
  ) {
    return this.clientesService.actualizar(id, dto);
  }
}
