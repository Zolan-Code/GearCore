import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ActualizarPerfilDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;
}
