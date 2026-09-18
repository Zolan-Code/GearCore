import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EstadoCotizacion, TipoItemCotizacion } from '@prisma/client';

export class ItemCotizacionEdicionDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsEnum(TipoItemCotizacion)
  @IsOptional()
  tipo?: TipoItemCotizacion;

  @IsString()
  @IsOptional()
  referenciaId?: string;

  @IsString()
  descripcion: string;

  @IsNumber()
  @Min(0.01)
  cantidad: number;

  @IsNumber()
  @Min(0)
  precioUnitario: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  costoUnitario?: number;
}

export class ActualizarCotizacionDto {
  @IsString()
  @IsNotEmpty({ message: 'El motivo del cambio es obligatorio para trazabilidad de precios (SCRUM-32).' })
  motivo: string;

  @IsEnum(EstadoCotizacion)
  @IsOptional()
  estado?: EstadoCotizacion;

  @IsNumber()
  @IsOptional()
  @Min(1)
  validezDias?: number;

  @IsString()
  @IsOptional()
  observaciones?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  horasHombre?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  valorHoraHombre?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  costoHoraHombre?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  descuento?: number;

  @IsBoolean()
  @IsOptional()
  aplicaIva?: boolean;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ItemCotizacionEdicionDto)
  items?: ItemCotizacionEdicionDto[];
}
