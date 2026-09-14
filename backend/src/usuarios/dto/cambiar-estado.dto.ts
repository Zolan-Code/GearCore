import { IsBoolean } from 'class-validator';

export class CambiarEstadoDto {
  @IsBoolean({ message: 'El estado activo debe ser verdadero o falso.' })
  activo: boolean;
}
