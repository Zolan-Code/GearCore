import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolUsuario } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<RolUsuario[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId: string | undefined = request.user?.id;
    if (!userId) {
      throw new ForbiddenException('Usuario no autenticado.');
    }

    const perfil = await this.prisma.perfil.findUnique({ where: { id: userId } });
    if (!perfil || !perfil.activo) {
      throw new ForbiddenException('Perfil no encontrado o inactivo.');
    }

    if (!requiredRoles.includes(perfil.rol)) {
      throw new ForbiddenException('No tienes permisos para esta acción.');
    }

    request.user.rol = perfil.rol;
    return true;
  }
}
