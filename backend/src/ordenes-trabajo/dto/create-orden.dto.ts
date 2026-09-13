import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

export class CreateOrdenDto {
  @IsUUID('4', { message: 'El ID del vehículo debe ser un UUID válido.' })
  @IsNotEmpty({ message: 'El vehículo es obligatorio.' })
  vehiculoId: string;

  @IsString({ message: 'La falla reportada debe ser texto.' })
  @IsNotEmpty({ message: 'La falla reportada es obligatoria.' })
  @MinLength(3, { message: 'La falla reportada debe tener al menos 3 caracteres.' })
  fallaReportada: string;

  @IsUUID('4', { message: 'El ID del mecánico debe ser un UUID válido.' })
  @IsOptional()
  mecanicoId?: string;

  // Checklist de recepción
  @IsString()
  @IsOptional()
  nivelCombustible?: string; // RESERVA, CUARTO, MEDIO, TRES_CUARTOS, LLENO

  @IsString()
  @IsOptional()
  rayonesCarroceria?: string;

  @IsString()
  @IsOptional()
  elementosValor?: string;

  @IsInt({ message: 'El kilometraje de recepción debe ser un número entero.' })
  @Min(0, { message: 'El kilometraje no puede ser negativo.' })
  @IsOptional()
  kilometrajeRecepcion?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fotosDiagnostico?: string[];
}
