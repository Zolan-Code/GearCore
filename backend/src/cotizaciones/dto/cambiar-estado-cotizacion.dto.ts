import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EstadoCotizacion } from '@prisma/client';

export class CambiarEstadoCotizacionDto {
  @IsEnum(EstadoCotizacion)
  estado: EstadoCotizacion;

  @IsString()
  @IsOptional()
  motivo?: string;
}
