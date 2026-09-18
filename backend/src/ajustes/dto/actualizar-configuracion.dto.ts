import { IsString, IsOptional, IsNumber, Min, Max, IsNotEmpty } from 'class-validator';

export class ActualizarConfiguracionDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'El nombre comercial no puede estar vacío.' })
  nombreComercial?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'El RUT de la empresa no puede estar vacío.' })
  rut?: string;

  @IsString()
  @IsOptional()
  direccion?: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsNumber({}, { message: 'El IVA por defecto debe ser un número.' })
  @IsOptional()
  @Min(0, { message: 'El IVA no puede ser negativo.' })
  @Max(100, { message: 'El IVA no puede superar el 100%.' })
  ivaPorDefecto?: number;

  @IsNumber({}, { message: 'La validez en días debe ser un número entero.' })
  @IsOptional()
  @Min(1, { message: 'La validez debe ser de al menos 1 día.' })
  @Max(365, { message: 'La validez no puede exceder 365 días.' })
  validezDiasPorDefecto?: number;
}
