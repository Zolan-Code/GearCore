import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AgregarRepuestoOTDto {
  @IsString({ message: 'El ID del repuesto debe ser un texto.' })
  @IsNotEmpty({ message: 'El repuesto a asociar es obligatorio.' })
  repuestoId: string;

  @IsInt({ message: 'La cantidad debe ser un número entero.' })
  @Min(1, { message: 'La cantidad debe ser al menos 1 unidad.' })
  @Type(() => Number)
  cantidad: number;

  @IsOptional()
  @IsNumber({}, { message: 'El precio unitario debe ser un número.' })
  @Min(0, { message: 'El precio unitario no puede ser negativo.' })
  @Type(() => Number)
  precioUnitario?: number;
}
