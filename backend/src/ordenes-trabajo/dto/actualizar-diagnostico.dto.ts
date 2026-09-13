import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class ActualizarDiagnosticoDto {
  @IsString()
  @IsOptional()
  fallaReportada?: string;

  @IsString()
  @IsOptional()
  diagnostico?: string;

  @IsString()
  @IsOptional()
  trabajoRealizado?: string;

  @IsUUID('4', { message: 'El ID del mecánico debe ser un UUID válido.' })
  @IsOptional()
  mecanicoId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fotosDiagnostico?: string[];

  @IsNumber({}, { message: 'Las horas hombre deben ser un número.' })
  @Min(0, { message: 'Las horas hombre no pueden ser negativas.' })
  @IsOptional()
  horasHombre?: number;

  @IsString()
  @IsOptional()
  nivelCombustible?: string;

  @IsString()
  @IsOptional()
  rayonesCarroceria?: string;

  @IsString()
  @IsOptional()
  elementosValor?: string;
}
