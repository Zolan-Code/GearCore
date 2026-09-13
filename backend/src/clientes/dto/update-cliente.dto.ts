import { IsEmail, IsOptional, IsString } from 'class-validator';
import { IsRutChileno } from '../../common/validators/rut.validator';

export class UpdateClienteDto {
  @IsOptional()
  @IsString({ message: 'El nombre debe ser una cadena de texto.' })
  nombre?: string;

  @IsOptional()
  @IsRutChileno({ message: 'El RUT ingresado no es válido.' })
  rut?: string;

  @IsOptional()
  @IsString({ message: 'El teléfono debe ser texto.' })
  telefono?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo electrónico tiene un formato inválido.' })
  email?: string;
}
