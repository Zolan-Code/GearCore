import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async obtenerMiPerfil(userId: string) {
    const perfil = await this.prisma.perfil.findUnique({
      where: { id: userId },
    });

    if (!perfil) {
      throw new NotFoundException('Perfil de usuario no registrado en la base de datos.');
    }

    return perfil;
  }
}
