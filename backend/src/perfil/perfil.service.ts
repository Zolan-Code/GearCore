import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';

@Injectable()
export class PerfilService {
  constructor(private prisma: PrismaService) {}

  /**
   * Obtiene los datos del perfil del usuario actualmente autenticado
   */
  async obtenerMiPerfil(userId: string) {
    const perfil = await this.prisma.perfil.findUnique({
      where: { id: userId },
    });

    if (!perfil) {
      throw new NotFoundException('Perfil de usuario no registrado en la base de datos.');
    }

    return perfil;
  }

  /**
   * Actualiza el nombre del usuario autenticado (el ID se toma estrictamente de request.user.id)
   */
  async actualizarMiPerfil(userId: string, dto: ActualizarPerfilDto) {
    const perfil = await this.prisma.perfil.update({
      where: { id: userId },
      data: { nombre: dto.nombre.trim() },
    });

    return perfil;
  }
}
