import { IsOptional, IsString } from 'class-validator';

export class FiltroDashboardDto {
  @IsOptional()
  @IsString()
  fechaInicio?: string;

  @IsOptional()
  @IsString()
  fechaFin?: string;
}
