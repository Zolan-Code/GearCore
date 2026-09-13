import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsRutChileno } from '../../common/validators/rut.validator';

export class CreateClienteDto {
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  @IsString({ message: 'El nombre debe ser una cadena de texto.' })
  nombre: string;

  @IsNotEmpty({ message: 'El RUT es obligatorio.' })
  @IsRutChileno({ message: 'El RUT ingresado no es válido.' })
  rut: string;

  @IsOptional()
  @IsString({ message: 'El teléfono debe ser texto.' })
  telefono?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo electrónico tiene un formato inválido.' })
  email?: string;
}
