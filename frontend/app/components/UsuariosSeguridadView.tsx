'use client';

import { useState } from 'react';
import styles from './usuarios-seguridad.module.css';
import DataTable from './DataTable';
import {
  useUsuarios,
  useCrearUsuario,
  useCambiarRolUsuario,
  useToggleEstadoUsuario,
  Usuario,
  Rol,
} from '../../hooks/usuarios/useUsuarios';

interface ConfirmModalState {
  title: string;
  message: string;
  subMessage?: string;
  confirmText: string;
  cancelText?: string;
  tipo: 'danger' | 'warning' | 'primary';
  onConfirm: () => Promise<void> | void;
}

interface NotifyModalState {
  title: string;
  message: string;
  subMessage?: string;
  tipo: 'success' | 'error' | 'warning' | 'info';
}

interface Props {
  userRole: 'ADMINISTRADOR' | 'RECEPCIONISTA' | 'MECANICO';
}

export default function UsuariosSeguridadView({ userRole }: Props) {
  const [sortUsuarios, setSortUsuarios] = useState<{ id: string; direction: 'asc' | 'desc' }>({
    id: 'creadoEn',
    direction: 'desc',
  });

  const {
    data: usuarios = [],
    isLoading: loadingUsuarios,
    isFetching: fetchingUsuarios,
    isError: errorUsuarios,
    error: errUsuarios,
    refetch: refetchUsuarios,
  } = useUsuarios({
    sortBy: sortUsuarios.id,
    sortOrder: sortUsuarios.direction,
  });

  const crearUsuarioMutation = useCrearUsuario();
  const cambiarRolMutation = useCambiarRolUsuario();
  const toggleEstadoMutation = useToggleEstadoUsuario();

  const [actualizandoId, setActualizandoId] = useState<string | null>(null);

  // Modales de Confirmación y Notificación (reemplazo de alert() y confirm() del navegador)
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null);
  const [notifyModal, setNotifyModal] = useState<NotifyModalState | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Modal Crear Usuario
  const [showCrearModal, setShowCrearModal] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [nuevoPassword, setNuevoPassword] = useState('');
  const [nuevoRol, setNuevoRol] = useState<Rol>('MECANICO');
  const [guardandoUsuario, setGuardandoUsuario] = useState(false);

  // Crear Usuario
  async function handleCrearUsuario(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoNombre.trim() || !nuevoEmail.trim() || !nuevoPassword.trim()) {
      setNotifyModal({
        title: 'Campos Incompletos',
        message: 'Por favor completa todos los campos requeridos para registrar al usuario.',
        tipo: 'warning',
      });
      return;
    }

    try {
      setGuardandoUsuario(true);
      const creado = await crearUsuarioMutation.mutateAsync({
        nombre: nuevoNombre.trim(),
        email: nuevoEmail.trim().toLowerCase(),
        password: nuevoPassword,
        rol: nuevoRol,
      });

      setShowCrearModal(false);
      resetCrearForm();
      setNotifyModal({
        title: 'Usuario Creado con Éxito',
        message: `Usuario ${creado.nombre} creado con éxito con rol [${creado.rol}].`,
        subMessage: `El usuario ya puede ingresar al sistema utilizando el correo ${creado.email}.`,
        tipo: 'success',
      });
    } catch (err: any) {
      setNotifyModal({
        title: 'Error al Crear Usuario',
        message: err.message || 'Ocurrió un error al registrar las credenciales.',
        tipo: 'error',
      });
    } finally {
      setGuardandoUsuario(false);
    }
  }

  function resetCrearForm() {
    setNuevoNombre('');
    setNuevoEmail('');
    setNuevoPassword('');
    setNuevoRol('MECANICO');
  }

  // Cambiar Rol de Usuario
  async function handleCambiarRol(usuarioId: string, rol: Rol) {
    try {
      setActualizandoId(usuarioId);
      const actualizado = await cambiarRolMutation.mutateAsync({ usuarioId, rol });
      setNotifyModal({
        title: 'Rol Actualizado',
        message: `El rol de ${actualizado.nombre} fue actualizado a [${actualizado.rol}].`,
        tipo: 'success',
      });
    } catch (err: any) {
      setNotifyModal({
        title: 'Error al Cambiar Rol',
        message: err.message || 'No fue posible modificar el rol del usuario.',
        tipo: 'error',
      });
    } finally {
      setActualizandoId(null);
    }
  }

  // Activar / Desactivar Usuario
  function handleToggleEstado(u: Usuario) {
    const esDesactivar = u.activo;
    setConfirmModal({
      title: esDesactivar ? '¿Desactivar cuenta?' : '¿Reactivar cuenta?',
      message: esDesactivar
        ? `¿Estás seguro de que deseas desactivar la cuenta de ${u.nombre}?`
        : `¿Estás seguro de que deseas reactivar la cuenta de ${u.nombre}?`,
      subMessage: esDesactivar
        ? 'El usuario no podrá ingresar a GearCore hasta que su cuenta sea reactivada.'
        : 'El usuario recuperará acceso inmediato al sistema con sus credenciales habituales.',
      confirmText: esDesactivar ? 'Sí, Desactivar' : 'Sí, Reactivar',
      cancelText: 'Cancelar',
      tipo: esDesactivar ? 'danger' : 'primary',
      onConfirm: async () => {
        try {
          setConfirmLoading(true);
          setActualizandoId(u.id);
          await toggleEstadoMutation.mutateAsync({ usuarioId: u.id, activo: !u.activo });
          setConfirmModal(null);
          setNotifyModal({
            title: esDesactivar ? 'Cuenta Desactivada' : 'Cuenta Reactivada',
            message: `La cuenta de ${u.nombre} ha sido ${esDesactivar ? 'desactivada' : 'reactivada'} correctamente.`,
            tipo: 'info',
          });
        } catch (err: any) {
          setConfirmModal(null);
          setNotifyModal({
            title: 'Error al Cambiar Estado',
            message: err.message || 'No se pudo actualizar el estado de la cuenta.',
            tipo: 'error',
          });
        } finally {
          setActualizandoId(null);
          setConfirmLoading(false);
        }
      },
    });
  }

  if (userRole !== 'ADMINISTRADOR') {
    return (
      <div className={styles.emptyState}>
        <h3>Acceso Restringido</h3>
        <p>Solo los usuarios con rol de Administrador pueden acceder al panel de seguridad y gestión de usuarios.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Encabezado del Módulo */}
      <div className={styles.headerSection}>
        <div>
          <h2 className={styles.headerTitle}>
            Usuarios y Roles
            {fetchingUsuarios && !loadingUsuarios && (
              <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#64748b', marginLeft: '12px' }}>
                Actualizando...
              </span>
            )}
          </h2>
          <p className={styles.headerSubtitle}>
            Control de acceso basado en roles (RBAC) y gestión de cuentas del taller
          </p>
        </div>
      </div>

      {/* TABLA DE USUARIOS CON DATATABLE INTEGRADO */}
      <DataTable<Usuario>
        data={usuarios}
        keyExtractor={(u) => u.id}
        storageKey="usuarios-table-layout"
        actions={
          <button
            type="button"
            className={styles.btnTablePrimary}
            onClick={() => setShowCrearModal(true)}
            title="Registrar nuevo usuario en el sistema"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Nuevo Usuario</span>
          </button>
        }
        searchPlaceholder="Buscar por nombre, correo o rol..."
        sort={sortUsuarios}
        onSortChange={setSortUsuarios}
        loading={loadingUsuarios}
        loadingMessage="Cargando usuarios..."
        error={errorUsuarios ? errUsuarios : null}
        errorMessage={`Error al cargar los usuarios: ${(errUsuarios as any)?.message || 'Error de conexión'}`}
        onRetry={() => refetchUsuarios()}
        emptyMessage="No se encontraron usuarios coincidentes."
        columns={[
          {
            id: 'nombre',
            accessor: 'nombre',
            header: 'Usuario',
            cell: (u) => {
              const initial = (u.nombre || u.email || 'U').charAt(0).toUpperCase();
              return (
                <div className={styles.userCell}>
                  <div className={styles.userAvatar}>{initial}</div>
                  <div>
                    <p className={styles.userName}>{u.nombre}</p>
                    <p className={styles.userEmail}>{u.email}</p>
                  </div>
                </div>
              );
            },
          },
          {
            id: 'rol',
            accessor: 'rol',
            header: 'Rol en Sistema',
            cell: (u) => (
              <select
                className={`${styles.roleSelector} ${
                  u.rol === 'ADMINISTRADOR'
                    ? styles.roleAdmin
                    : u.rol === 'RECEPCIONISTA'
                    ? styles.roleRecepcion
                    : styles.roleMecanico
                }`}
                value={u.rol}
                disabled={actualizandoId === u.id}
                onChange={(e) => handleCambiarRol(u.id, e.target.value as Rol)}
                title="Cambiar rol de usuario"
              >
                <option value="ADMINISTRADOR">Administrador</option>
                <option value="RECEPCIONISTA">Asesor de Servicios</option>
                <option value="MECANICO">Mecánico</option>
              </select>
            ),
          },
          {
            id: 'activo',
            accessor: 'activo',
            header: 'Estado',
            cell: (u) => (
              <span className={`${styles.statusBadge} ${u.activo ? styles.statusActive : styles.statusInactive}`}>
                <span className={styles.statusDot} />
                <span>{u.activo ? 'Activo' : 'Suspendido'}</span>
              </span>
            ),
          },
          {
            header: 'OTs Asignadas',
            sortable: false,
            cell: (u) => (
              <span style={{ fontWeight: 600 }}>
                {u._count?.ordenesAsignadas || 0}
              </span>
            ),
          },
          {
            id: 'creadoEn',
            accessor: 'creadoEn',
            header: 'Fecha Registro',
            cell: (u) =>
              new Date(u.creadoEn).toLocaleDateString('es-CL', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              }),
          },
          {
            header: 'Acciones',
            align: 'right',
            sortable: false,
            filterable: false,
            cell: (u) => (
              <button
                type="button"
                role="switch"
                aria-checked={u.activo}
                className={`${styles.toggleSwitch} ${
                  u.activo ? styles.toggleSwitchOn : styles.toggleSwitchOff
                }`}
                disabled={actualizandoId === u.id}
                onClick={() => handleToggleEstado(u)}
                title={u.activo ? `Desactivar usuario (${u.nombre})` : `Activar usuario (${u.nombre})`}
                aria-label={u.activo ? `Desactivar usuario ${u.nombre}` : `Activar usuario ${u.nombre}`}
              >
                <span className={styles.toggleThumb} />
                <span className={styles.toggleText}>{u.activo ? 'ON' : 'OFF'}</span>
              </button>
            ),
          },
        ]}
      />

      {/* MODAL: CREAR NUEVO USUARIO */}
      {showCrearModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCrearModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Crear Nuevo Usuario</h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setShowCrearModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCrearUsuario}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Nombre Completo *</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="Ej: Rodrigo Martínez"
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Correo Electrónico (Login) *</label>
                  <input
                    type="email"
                    className={styles.formInput}
                    placeholder="Ej: rodrigo@taller.cl"
                    value={nuevoEmail}
                    onChange={(e) => setNuevoEmail(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.rowTwoCols}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Contraseña Inicial *</label>
                    <input
                      type="password"
                      className={styles.formInput}
                      placeholder="Mínimo 8 caracteres"
                      value={nuevoPassword}
                      onChange={(e) => setNuevoPassword(e.target.value)}
                      minLength={8}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Rol Asignado *</label>
                    <select
                      className={styles.formSelect}
                      value={nuevoRol}
                      onChange={(e) => setNuevoRol(e.target.value as Rol)}
                    >
                      <option value="MECANICO">Mecánico</option>
                      <option value="RECEPCIONISTA">Asesor de Servicios</option>
                      <option value="ADMINISTRADOR">Administrador</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnActionSecondary}
                  onClick={() => setShowCrearModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={guardandoUsuario}
                >
                  {guardandoUsuario ? (
                    <>
                      <span className={styles.spinner} />
                      <span>Creando cuenta...</span>
                    </>
                  ) : (
                    <span>Guardar Usuario</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN PERSONALIZADO (Reemplazo de confirm()) */}
      {confirmModal && (
        <div className={styles.promptModalOverlay} onClick={() => !confirmLoading && setConfirmModal(null)}>
          <div className={styles.promptModalContent} onClick={(e) => e.stopPropagation()}>
            <div
              className={`${styles.promptIconCircle} ${
                confirmModal.tipo === 'danger'
                  ? styles.promptIconDanger
                  : confirmModal.tipo === 'warning'
                  ? styles.promptIconWarning
                  : styles.promptIconPrimary
              }`}
            >
              {confirmModal.tipo === 'danger' ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <polyline points="17 11 19 13 23 9" />
                </svg>
              )}
            </div>

            <h3 className={styles.promptTitle}>{confirmModal.title}</h3>
            <p className={styles.promptMessage}>{confirmModal.message}</p>
            {confirmModal.subMessage && (
              <p className={styles.promptSubMessage}>{confirmModal.subMessage}</p>
            )}

            <div className={styles.promptActions}>
              <button
                type="button"
                className={styles.promptBtnCancel}
                disabled={confirmLoading}
                onClick={() => setConfirmModal(null)}
              >
                {confirmModal.cancelText || 'Cancelar'}
              </button>
              <button
                type="button"
                className={
                  confirmModal.tipo === 'danger'
                    ? styles.promptBtnConfirmDanger
                    : styles.promptBtnConfirmPrimary
                }
                disabled={confirmLoading}
                onClick={confirmModal.onConfirm}
              >
                {confirmLoading ? (
                  <>
                    <span className={styles.spinner} />
                    <span>Procesando...</span>
                  </>
                ) : (
                  confirmModal.confirmText
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE NOTIFICACIÓN / ALERTA PERSONALIZADO (Reemplazo de alert()) */}
      {notifyModal && (
        <div className={styles.promptModalOverlay} onClick={() => setNotifyModal(null)}>
          <div className={styles.promptModalContent} onClick={(e) => e.stopPropagation()}>
            <div
              className={`${styles.promptIconCircle} ${
                notifyModal.tipo === 'success'
                  ? styles.promptIconSuccess
                  : notifyModal.tipo === 'error'
                  ? styles.promptIconDanger
                  : notifyModal.tipo === 'warning'
                  ? styles.promptIconWarning
                  : styles.promptIconInfo
              }`}
            >
              {notifyModal.tipo === 'success' ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              ) : notifyModal.tipo === 'error' ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              ) : notifyModal.tipo === 'warning' ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              )}
            </div>

            <h3 className={styles.promptTitle}>{notifyModal.title}</h3>
            <p className={styles.promptMessage}>{notifyModal.message}</p>
            {notifyModal.subMessage && (
              <p className={styles.promptSubMessage}>{notifyModal.subMessage}</p>
            )}

            <div className={styles.promptActions}>
              <button
                type="button"
                className={styles.promptBtnAccept}
                onClick={() => setNotifyModal(null)}
                autoFocus
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
