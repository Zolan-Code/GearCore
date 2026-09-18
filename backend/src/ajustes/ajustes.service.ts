import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { ActualizarConfiguracionDto } from './dto/actualizar-configuracion.dto';

const CONFIG_SINGLETON_ID = 'taller-config';

@Injectable()
export class AjustesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Obtener configuración singleton del taller con upsert garantizado.
   */
  async obtenerConfiguracion() {
    return this.prisma.configuracionTaller.upsert({
      where: { id: CONFIG_SINGLETON_ID },
      update: {},
      create: {
        id: CONFIG_SINGLETON_ID,
        nombreComercial: 'GearCore Taller Demo',
        rut: '00.000.000-0',
        direccion: 'Av. Concha y Toro 1234, Puente Alto',
        telefono: '+56 9 1234 5678',
        email: 'contacto@tallergearcore.cl',
        logoUrl: null,
        ivaPorDefecto: 19,
        validezDiasPorDefecto: 15,
      },
    });
  }

  /**
   * Actualizar configuración singleton del taller con upsert y registro en auditoría.
   */
  async actualizarConfiguracion(dto: ActualizarConfiguracionDto, usuarioId?: string) {
    const dataUpdate: Record<string, any> = {};
    if (dto.nombreComercial !== undefined) dataUpdate.nombreComercial = dto.nombreComercial.trim();
    if (dto.rut !== undefined) dataUpdate.rut = dto.rut.trim();
    if (dto.direccion !== undefined) dataUpdate.direccion = dto.direccion?.trim() || null;
    if (dto.telefono !== undefined) dataUpdate.telefono = dto.telefono?.trim() || null;
    if (dto.email !== undefined) dataUpdate.email = dto.email?.trim() || null;
    if (dto.logoUrl !== undefined) dataUpdate.logoUrl = dto.logoUrl?.trim() || null;
    if (dto.ivaPorDefecto !== undefined) dataUpdate.ivaPorDefecto = Number(dto.ivaPorDefecto);
    if (dto.validezDiasPorDefecto !== undefined) dataUpdate.validezDiasPorDefecto = Math.round(Number(dto.validezDiasPorDefecto));

    const configuracionActualizada = await this.prisma.configuracionTaller.upsert({
      where: { id: CONFIG_SINGLETON_ID },
      update: dataUpdate,
      create: {
        id: CONFIG_SINGLETON_ID,
        nombreComercial: dataUpdate.nombreComercial || 'GearCore Taller Demo',
        rut: dataUpdate.rut || '00.000.000-0',
        direccion: dataUpdate.direccion || 'Av. Concha y Toro 1234, Puente Alto',
        telefono: dataUpdate.telefono || '+56 9 1234 5678',
        email: dataUpdate.email || 'contacto@tallergearcore.cl',
        logoUrl: dataUpdate.logoUrl || null,
        ivaPorDefecto: dataUpdate.ivaPorDefecto ?? 19,
        validezDiasPorDefecto: dataUpdate.validezDiasPorDefecto ?? 15,
      },
    });

    // Registrar en log de auditoría
    await this.auditoriaService.registrar({
      usuarioId: usuarioId || null,
      accion: 'ACTUALIZAR_CONFIGURACION_TALLER',
      entidad: 'ConfiguracionTaller',
      entidadId: CONFIG_SINGLETON_ID,
      detalles: `Configuración de taller actualizada. Campos modificados: ${Object.keys(dataUpdate).join(', ')}. IVA: ${configuracionActualizada.ivaPorDefecto}%, Validez: ${configuracionActualizada.validezDiasPorDefecto} días.`,
    });

    return configuracionActualizada;
  }
}
