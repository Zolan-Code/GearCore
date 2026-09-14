import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditoriaService {
  constructor(private prisma: PrismaService) {}

  /**
   * Registrar evento en el log de auditoría
   */
  async registrar(params: {
    usuarioId?: string | null;
    accion: string;
    entidad: string;
    entidadId?: string | null;
    detalles?: string | null;
    ip?: string | null;
  }) {
    try {
      return await this.prisma.registroAuditoria.create({
        data: {
          usuarioId: params.usuarioId || null,
          accion: params.accion,
          entidad: params.entidad,
          entidadId: params.entidadId || null,
          detalles: params.detalles || null,
          ip: params.ip || null,
        },
      });
    } catch (err) {
      console.error('Error al registrar auditoría:', err);
      return null;
    }
  }

  /**
   * Listar eventos de auditoría (exclusivo para Administrador)
   */
  async listar(limite = 100) {
    return this.prisma.registroAuditoria.findMany({
      take: Math.min(limite, 200),
      orderBy: { creadoEn: 'desc' },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            rol: true,
          },
        },
      },
    });
  }
}
