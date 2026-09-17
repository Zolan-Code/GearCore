import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWithAuth } from '../../lib/api';
import { supabase } from '../../lib/supabaseClient';

export type Rol = 'ADMINISTRADOR' | 'RECEPCIONISTA' | 'MECANICO';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  creadoEn: string;
  _count?: {
    ordenesAsignadas: number;
  };
}

export interface RegistroAuditoria {
  id: string;
  usuarioId: string | null;
  accion: string;
  entidad: string;
  entidadId: string | null;
  detalles: string | null;
  creadoEn: string;
  usuario: {
    id: string;
    nombre: string;
    email: string;
    rol: Rol;
  } | null;
}

export interface CrearUsuarioDto {
  nombre: string;
  email: string;
  password: string;
  rol: Rol;
}

// Hook para consultar lista de usuarios del sistema
export function useUsuarios() {
  return useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const data = await fetchWithAuth<Usuario[]>('/usuarios');
      return data || [];
    },
  });
}

// Hook para consultar bitácora de auditoría
export function useAuditoria() {
  return useQuery({
    queryKey: ['auditoria'],
    queryFn: async () => {
      const data = await fetchWithAuth<RegistroAuditoria[]>('/auditoria');
      return data || [];
    },
  });
}

// Hook para consultar el perfil del usuario actualmente autenticado (usado por el layout y sidebar)
export function useMiPerfil(enabled = true) {
  return useQuery({
    queryKey: ['perfil'],
    queryFn: async () => {
      const data = await fetchWithAuth<Usuario>('/perfil');
      return data;
    },
    enabled,
    staleTime: 60000,
  });
}

// Mutación: Actualizar Nombre de Perfil Propio
export function useActualizarMiPerfil() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ nombre }: { nombre: string }) => {
      const perfilActualizado = await fetchWithAuth<Usuario>('/perfil', {
        method: 'PATCH',
        body: JSON.stringify({ nombre }),
      });

      try {
        await supabase.auth.updateUser({ data: { nombre } });
      } catch (err) {
        console.warn('No se pudo sincronizar metadata en Supabase Auth:', err);
      }

      return perfilActualizado;
    },
    onSuccess: (perfilActualizado) => {
      queryClient.setQueryData(['perfil'], perfilActualizado);
      queryClient.invalidateQueries({ queryKey: ['perfil'] });
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });
}

// Mutación: Crear Usuario
export function useCrearUsuario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CrearUsuarioDto) => {
      return fetchWithAuth<Usuario>('/usuarios', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      queryClient.invalidateQueries({ queryKey: ['auditoria'] });
    },
  });
}

// Mutación: Cambiar Rol
export function useCambiarRolUsuario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ usuarioId, rol }: { usuarioId: string; rol: Rol }) => {
      return fetchWithAuth<Usuario>(`/usuarios/${usuarioId}/rol`, {
        method: 'PATCH',
        body: JSON.stringify({ rol }),
      });
    },
    onSuccess: async (actualizado, variables) => {
      // 1. Invalidar lista general de usuarios y registros de auditoría
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      queryClient.invalidateQueries({ queryKey: ['auditoria'] });

      // 2. Si el usuario modificado es el usuario actualmente logueado:
      try {
        const { data } = await supabase.auth.getSession();
        const currentUserId = data.session?.user?.id;

        if (currentUserId && currentUserId === variables.usuarioId) {
          // Refrescar sesión de Supabase Auth para sincronizar JWT y user_metadata local
          await supabase.auth.refreshSession();

          // Invalidar y revalidar el perfil activo para que el sidebar se actualice al instante
          await queryClient.invalidateQueries({ queryKey: ['perfil'] });
        }
      } catch (err) {
        console.warn('Error al sincronizar sesión propia tras cambio de rol:', err);
      }
    },
  });
}

// Mutación: Activar / Desactivar Usuario
export function useToggleEstadoUsuario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ usuarioId, activo }: { usuarioId: string; activo: boolean }) => {
      return fetchWithAuth<Usuario>(`/usuarios/${usuarioId}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ activo }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      queryClient.invalidateQueries({ queryKey: ['auditoria'] });
    },
  });
}
