import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ActualizarRepuestoDto {
  @IsOptional()
  @IsString({ message: 'El código del repuesto debe ser un texto.' })
  codigo?: string;

  @IsOptional()
  @IsString({ message: 'El nombre del repuesto debe ser un texto.' })
  nombre?: string;

  @IsOptional()
  @IsInt({ message: 'El stock mínimo debe ser un número entero.' })
  @Min(0, { message: 'El stock mínimo no puede ser negativo.' })
  @Type(() => Number)
  stockMinimo?: number;

  @IsOptional()
  @IsNumber({}, { message: 'El precio de compra debe ser un número.' })
  @Min(0, { message: 'El precio de compra no puede ser negativo.' })
  @Type(() => Number)
  precioCompra?: number;

  @IsOptional()
  @IsNumber({}, { message: 'El precio de venta debe ser un número.' })
  @Min(0, { message: 'El precio de venta no puede ser negativo.' })
  @Type(() => Number)
  precioVenta?: number;
}
