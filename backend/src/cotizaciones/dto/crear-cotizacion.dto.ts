import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoItemCotizacion } from '@prisma/client';

export class ItemAdicionalDto {
  @IsEnum(TipoItemCotizacion)
  @IsOptional()
  tipo?: TipoItemCotizacion;

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

  @IsString()
  @IsOptional()
  referenciaId?: string;
}

export class CrearCotizacionDto {
  @IsUUID()
  ordenTrabajoId: string;

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
  @Type(() => ItemAdicionalDto)
  itemsAdicionales?: ItemAdicionalDto[];
}
