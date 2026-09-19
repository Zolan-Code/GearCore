import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RolUsuario } from '@prisma/client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { CambiarRolDto } from './dto/cambiar-rol.dto';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto';

@Injectable()
export class UsuariosService {
  private supabase: SupabaseClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoriaService: AuditoriaService,
  ) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Variables SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY requeridas en backend/.env');
    }

    this.supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  /**
   * Listar todos los perfiles de usuario con métricas operativas
   */
  async listarTodos(sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc') {
    const validSortFields = ['nombre', 'email', 'rol', 'activo', 'creadoEn'];
    const orderField = sortBy && validSortFields.includes(sortBy) ? sortBy : 'creadoEn';
    const orderDirection = sortOrder === 'asc' ? 'asc' : 'desc';

    return this.prisma.perfil.findMany({
      orderBy: { [orderField]: orderDirection },
      include: {
        _count: {
          select: { ordenesAsignadas: true },
        },
      },
    });
  }

  /**
   * Crear nuevo usuario en Supabase Auth y tabla perfiles (SCRUM-39)
   */
  async crear(dto: CrearUsuarioDto, adminUserId?: string) {
    const emailNorm = dto.email.trim().toLowerCase();

    // 1. Validar unicidad en base de datos local
    const existe = await this.prisma.perfil.findUnique({
      where: { email: emailNorm },
    });
    if (existe) {
      throw new BadRequestException(`Ya existe un usuario registrado con el correo ${emailNorm}.`);
    }

    // 2. Crear usuario en Supabase Auth usando Admin API
    const { data: authUser, error: authError } = await this.supabase.auth.admin.createUser({
      email: emailNorm,
      password: dto.password,
      email_confirm: true,
      user_metadata: {
        nombre: dto.nombre.trim(),
        rol: dto.rol,
      },
    });

    if (authError || !authUser.user) {
      throw new BadRequestException(
        authError?.message || 'Error al registrar credenciales en el proveedor de autenticación.',
      );
    }

    // 3. Crear registro en tabla perfiles de PostgreSQL
    const nuevoPerfil = await this.prisma.perfil.create({
      data: {
        id: authUser.user.id,
        nombre: dto.nombre.trim(),
        email: emailNorm,
        rol: dto.rol,
        activo: true,
      },
      include: {
        _count: { select: { ordenesAsignadas: true } },
      },
    });

    // 4. Log de Auditoría (SCRUM-41)
    await this.auditoriaService.registrar({
      usuarioId: adminUserId,
      accion: 'CREACION_USUARIO',
      entidad: 'Perfil',
      entidadId: nuevoPerfil.id,
      detalles: `Usuario ${nuevoPerfil.nombre} (${nuevoPerfil.email}) creado con rol [${nuevoPerfil.rol}].`,
    });

    return nuevoPerfil;
  }

  /**
   * Cambiar rol de usuario (SCRUM-39)
   */
  async cambiarRol(id: string, dto: CambiarRolDto, adminUserId?: string) {
    const perfil = await this.prisma.perfil.findUnique({ where: { id } });
    if (!perfil) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado.`);
    }

    if (adminUserId === id && dto.rol !== RolUsuario.ADMINISTRADOR) {
      throw new BadRequestException('Por seguridad, no puedes remover tu propio rol de Administrador.');
    }

    const rolAnterior = perfil.rol;

    // Actualizar en Prisma
    const actualizado = await this.prisma.perfil.update({
      where: { id },
      data: { rol: dto.rol },
      include: {
        _count: { select: { ordenesAsignadas: true } },
      },
    });

    // Sincronizar metadata en Supabase Auth
    try {
      await this.supabase.auth.admin.updateUserById(id, {
        user_metadata: { rol: dto.rol },
      });
    } catch (e) {
      console.warn('No se pudo sincronizar user_metadata en Supabase Auth:', e);
    }

    // Log de Auditoría (SCRUM-41)
    await this.auditoriaService.registrar({
      usuarioId: adminUserId,
      accion: 'CAMBIO_ROL',
      entidad: 'Perfil',
      entidadId: id,
      detalles: `Rol modificado de [${rolAnterior}] a [${dto.rol}] para el usuario ${perfil.nombre}.`,
    });

    return actualizado;
  }

  /**
   * Activar o desactivar usuario (SCRUM-39)
   */
  async cambiarEstado(id: string, dto: CambiarEstadoDto, adminUserId?: string) {
    const perfil = await this.prisma.perfil.findUnique({ where: { id } });
    if (!perfil) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado.`);
    }

    if (adminUserId === id && !dto.activo) {
      throw new BadRequestException('No puedes desactivar tu propia cuenta de Administrador.');
    }

    const actualizado = await this.prisma.perfil.update({
      where: { id },
      data: { activo: dto.activo },
      include: {
        _count: { select: { ordenesAsignadas: true } },
      },
    });

    // Log de Auditoría (SCRUM-41)
    await this.auditoriaService.registrar({
      usuarioId: adminUserId,
      accion: 'CAMBIO_ESTADO_USUARIO',
      entidad: 'Perfil',
      entidadId: id,
      detalles: `Estado cambiado a [${dto.activo ? 'ACTIVO' : 'INACTIVO'}] para el usuario ${perfil.nombre}.`,
    });

    return actualizado;
  }
}
