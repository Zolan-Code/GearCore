import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsPatenteChilena } from '../../common/validators/patente.validator';

export class UpdateVehiculoDto {
  @IsOptional()
  @IsPatenteChilena({
    message: 'La patente debe tener un formato chileno válido (ej: AA1000 o BBBB10).',
  })
  patente?: string;

  @IsOptional()
  @IsUUID('all', { message: 'El ID del cliente debe ser un UUID válido.' })
  clienteId?: string;

  @IsOptional()
  @IsString({ message: 'La marca debe ser texto.' })
  marca?: string;

  @IsOptional()
  @IsString({ message: 'El modelo debe ser texto.' })
  modelo?: string;

  @IsOptional()
  @IsString({ message: 'El VIN o número de chasis debe ser texto.' })
  vin?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El año debe ser un número entero.' })
  @Min(1950, { message: 'El año no puede ser menor a 1950.' })
  @Max(new Date().getFullYear() + 1, {
    message: 'El año no puede ser mayor al año siguiente.',
  })
  anio?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El kilometraje debe ser un número entero.' })
  @Min(0, { message: 'El kilometraje no puede ser negativo.' })
  kilometraje?: number;
}
