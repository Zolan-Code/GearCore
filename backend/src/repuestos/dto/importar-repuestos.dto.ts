import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CrearRepuestoDto } from './crear-repuesto.dto';

export class ImportarRepuestosDto {
  @IsArray({ message: 'La lista de repuestos a importar debe ser un arreglo.' })
  @ArrayNotEmpty({ message: 'Debe proporcionar al menos un repuesto para importar.' })
  @ValidateNested({ each: true })
  @Type(() => CrearRepuestoDto)
  repuestos: CrearRepuestoDto[];
}
