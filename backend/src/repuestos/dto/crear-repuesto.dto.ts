import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CrearRepuestoDto {
  @IsString({ message: 'El código del repuesto debe ser un texto.' })
  @IsNotEmpty({ message: 'El código del repuesto es obligatorio.' })
  codigo: string;

  @IsString({ message: 'El nombre del repuesto debe ser un texto.' })
  @IsNotEmpty({ message: 'El nombre del repuesto es obligatorio.' })
  nombre: string;

  @IsOptional()
  @IsInt({ message: 'El stock inicial debe ser un número entero.' })
  @Min(0, { message: 'El stock inicial no puede ser negativo.' })
  @Type(() => Number)
  stock?: number = 0;

  @IsOptional()
  @IsInt({ message: 'El stock mínimo debe ser un número entero.' })
  @Min(0, { message: 'El stock mínimo no puede ser negativo.' })
  @Type(() => Number)
  stockMinimo?: number = 5;

  @IsNumber({}, { message: 'El precio de compra debe ser un número.' })
  @Min(0, { message: 'El precio de compra no puede ser negativo.' })
  @Type(() => Number)
  precioCompra: number;

  @IsNumber({}, { message: 'El precio de venta debe ser un número.' })
  @Min(0, { message: 'El precio de venta no puede ser negativo.' })
  @Type(() => Number)
  precioVenta: number;
}
