import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AjusteStockDto {
  @IsInt({ message: 'El stock físico debe ser un número entero.' })
  @Min(0, { message: 'El stock físico no puede ser menor a 0.' })
  @Type(() => Number)
  stockFisico: number;

  @IsString({ message: 'El motivo del ajuste debe ser un texto.' })
  @IsNotEmpty({ message: 'Debes indicar el motivo o justificación del ajuste físico.' })
  motivo: string;
}
