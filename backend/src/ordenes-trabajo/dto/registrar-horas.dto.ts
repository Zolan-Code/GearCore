import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RegistrarHorasDto {
  @IsNumber({}, { message: 'Las horas deben ser un valor numérico.' })
  @Min(0.1, { message: 'Debe registrar al menos 0.1 horas (6 minutos).' })
  @IsNotEmpty({ message: 'La cantidad de horas es obligatoria.' })
  horas: number;

  @IsString()
  @IsOptional()
  comentario?: string;
}
