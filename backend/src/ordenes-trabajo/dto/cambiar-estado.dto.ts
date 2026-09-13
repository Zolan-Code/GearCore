import { IsEnum, IsNotEmpty } from 'class-validator';
import { EstadoOT } from '@prisma/client';

export class CambiarEstadoDto {
  @IsEnum(EstadoOT, {
    message:
      'El estado debe ser uno válido: RECIBIDO, DIAGNOSTICO, COTIZACION, APROBADO, EN_REPARACION, CONTROL_CALIDAD o ENTREGADO.',
  })
  @IsNotEmpty({ message: 'El estado es obligatorio.' })
  estado: EstadoOT;
}
