'use client';

import { useState } from 'react';
import styles from './usuarios-seguridad.module.css';
import {
  useUsuarios,
  useAuditoria,
  useCrearUsuario,
  useCambiarRolUsuario,
  useToggleEstadoUsuario,
  Usuario,
  RegistroAuditoria,
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
  const [activeTab, setActiveTab] = useState<'usuarios' | 'auditoria'>('usuarios');

  const {
    data: usuarios = [],
    isLoading: loadingUsuarios,
    isFetching: fetchingUsuarios,
    isError: errorUsuarios,
    error: errUsuarios,
    refetch: refetchUsuarios,
  } = useUsuarios();

  const {
    data: auditorias = [],
    isLoading: loadingAuditoria,
    isFetching: fetchingAuditoria,
    isError: errorAuditoria,
    error: errAuditoria,
    refetch: refetchAuditoria,
  } = useAuditoria();

  const crearUsuarioMutation = useCrearUsuario();
  const cambiarRolMutation = useCambiarRolUsuario();
  const toggleEstadoMutation = useToggleEstadoUsuario();

  const loadingCurrent = activeTab === 'usuarios' ? loadingUsuarios : loadingAuditoria;
  const fetchingCurrent = activeTab === 'usuarios' ? fetchingUsuarios : fetchingAuditoria;

  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState<string>('TODOS');
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

  // Crear Usuario (SCRUM-39)
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
        title: '¡Usuario Creado con Éxito!',
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

  // Cambiar Rol de Usuario (SCRUM-39)
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

  // Activar / Desactivar Usuario (SCRUM-39)
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

  // Filtrado de usuarios
  const usuariosFiltrados = usuarios.filter((u) => {
    const matchesBusqueda =
      u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.email.toLowerCase().includes(busqueda.toLowerCase());
    const matchesRol = filtroRol === 'TODOS' || u.rol === filtroRol;
    return matchesBusqueda && matchesRol;
  });

  // Filtrado de auditoría
  const auditoriasFiltradas = auditorias.filter((a) => {
    const q = busqueda.toLowerCase();
    const matchesAccion = a.accion.toLowerCase().includes(q);
    const matchesUsuario = a.usuario?.nombre.toLowerCase().includes(q) || a.usuario?.email.toLowerCase().includes(q);
    const matchesDetalles = a.detalles?.toLowerCase().includes(q);
    return matchesAccion || matchesUsuario || matchesDetalles;
  });

  function renderAuditBadge(accion: string) {
    switch (accion) {
      case 'CREACION_USUARIO':
        return <span className={`${styles.auditActionBadge} ${styles.auditActionCreate}`}>+ Usuario Creado</span>;
      case 'CAMBIO_ROL':
        return <span className={`${styles.auditActionBadge} ${styles.auditActionRole}`}>Rol Modificado</span>;
      case 'CAMBIO_ESTADO_USUARIO':
        return <span className={`${styles.auditActionBadge} ${styles.auditActionStatus}`}>Estado Actualizado</span>;
      case 'CAMBIO_PRECIO':
        return <span className={`${styles.auditActionBadge} ${styles.auditActionPrice}`}>Edición de Precio</span>;
      case 'ELIMINACION_OT':
        return <span className={`${styles.auditActionBadge} ${styles.auditActionDelete}`}>Eliminación OT</span>;
      default:
        return <span className={`${styles.auditActionBadge} ${styles.auditActionRole}`}>{accion}</span>;
    }
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
            Usuarios, Roles y Seguridad
            {fetchingCurrent && !loadingCurrent && (
              <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#64748b', marginLeft: '12px' }}>
                Actualizando...
              </span>
            )}
          </h2>
          <p className={styles.headerSubtitle}>
            Control de acceso basado en roles (RBAC), gestión de cuentas y auditoría de eventos críticos
          </p>
        </div>

        <div className={styles.toolbarActions}>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => setShowCrearModal(true)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Nuevo Usuario</span>
          </button>
        </div>
      </div>

      {/* Pestañas: Directorio vs Auditoría */}
      <div className={styles.tabsContainer}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'usuarios' ? styles.tabBtnActive : ''}`}
          onClick={() => {
            setActiveTab('usuarios');
            setBusqueda('');
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span>Directorio de Usuarios</span>
          <span className={styles.tabBadge}>{usuarios.length}</span>
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'auditoria' ? styles.tabBtnActive : ''}`}
          onClick={() => {
            setActiveTab('auditoria');
            setBusqueda('');
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <span>Log de Auditoría</span>
          <span className={styles.tabBadge}>{auditorias.length}</span>
        </button>
      </div>

      {/* Barra de Filtro */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className={styles.searchInput}
            placeholder={
              activeTab === 'usuarios'
                ? 'Buscar usuario por nombre o correo...'
                : 'Buscar en auditoría por acción, autor o detalle...'
            }
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        {activeTab === 'usuarios' && (
          <select
            className={styles.filterSelect}
            value={filtroRol}
            onChange={(e) => setFiltroRol(e.target.value)}
          >
            <option value="TODOS">Todos los roles</option>
            <option value="ADMINISTRADOR">Administrador</option>
            <option value="RECEPCIONISTA">Recepcionista</option>
            <option value="MECANICO">Mecánico</option>
          </select>
        )}
      </div>

      {/* TABLA 1: DIRECTORIO DE USUARIOS (SCRUM-39) */}
      {activeTab === 'usuarios' && (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                <th className={styles.th}>Usuario</th>
                <th className={styles.th}>Rol en Sistema</th>
                <th className={styles.th}>Estado</th>
                <th className={styles.th}>OTs Asignadas</th>
                <th className={styles.th}>Fecha Registro</th>
                <th className={styles.th} style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {errorUsuarios ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px' }}>
                    <div style={{ color: '#ef4444', marginBottom: '10px' }}>
                      Error al cargar los usuarios: {(errUsuarios as any)?.message || 'Error de conexión'}
                    </div>
                    <button
                      type="button"
                      onClick={() => refetchUsuarios()}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        background: '#3b82f6',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      Reintentar
                    </button>
                  </td>
                </tr>
              ) : loadingUsuarios ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    Cargando usuarios...
                  </td>
                </tr>
              ) : usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    No se encontraron usuarios coincidentes.
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map((u) => {
                  const initial = (u.nombre || u.email || 'U').charAt(0).toUpperCase();
                  return (
                    <tr key={u.id} className={styles.tr}>
                      <td className={styles.td}>
                        <div className={styles.userCell}>
                          <div className={styles.userAvatar}>{initial}</div>
                          <div>
                            <p className={styles.userName}>{u.nombre}</p>
                            <p className={styles.userEmail}>{u.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className={styles.td}>
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
                          <option value="ADMINISTRADOR">ADMINISTRADOR</option>
                          <option value="RECEPCIONISTA">RECEPCIONISTA</option>
                          <option value="MECANICO">MECANICO</option>
                        </select>
                      </td>

                      <td className={styles.td}>
                        <span className={`${styles.statusBadge} ${u.activo ? styles.statusActive : styles.statusInactive}`}>
                          <span className={styles.statusDot} />
                          <span>{u.activo ? 'Activo' : 'Suspendido'}</span>
                        </span>
                      </td>

                      <td className={styles.td}>
                        <span style={{ fontWeight: 600 }}>
                          {u._count?.ordenesAsignadas || 0}
                        </span>
                      </td>

                      <td className={styles.td}>
                        {new Date(u.creadoEn).toLocaleDateString('es-CL', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      <td className={styles.td} style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className={`${styles.btnToggleStatus} ${
                            u.activo ? styles.btnToggleStatusDeactivate : styles.btnToggleStatusActivate
                          }`}
                          disabled={actualizandoId === u.id}
                          onClick={() => handleToggleEstado(u)}
                        >
                          {u.activo ? 'Desactivar' : 'Reactivar'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TABLA 2: LOG DE AUDITORÍA (SCRUM-41) */}
      {activeTab === 'auditoria' && (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                <th className={styles.th}>Fecha / Hora</th>
                <th className={styles.th}>Acción Crítica</th>
                <th className={styles.th}>Autor</th>
                <th className={styles.th}>Entidad</th>
                <th className={styles.th}>Detalles del Registro</th>
              </tr>
            </thead>
            <tbody>
              {errorAuditoria ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '30px' }}>
                    <div style={{ color: '#ef4444', marginBottom: '10px' }}>
                      Error al cargar los registros de auditoría: {(errAuditoria as any)?.message || 'Error de conexión'}
                    </div>
                    <button
                      type="button"
                      onClick={() => refetchAuditoria()}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        background: '#3b82f6',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      Reintentar
                    </button>
                  </td>
                </tr>
              ) : loadingAuditoria ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    Cargando registros de auditoría...
                  </td>
                </tr>
              ) : auditoriasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    No hay registros de auditoría aún.
                  </td>
                </tr>
              ) : (
                auditoriasFiltradas.map((a) => (
                  <tr key={a.id} className={styles.tr}>
                    <td className={styles.td}>
                      <span className={styles.auditDateText}>
                        {new Date(a.creadoEn).toLocaleString('es-CL', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>

                    <td className={styles.td}>
                      {renderAuditBadge(a.accion)}
                    </td>

                    <td className={styles.td}>
                      <strong>{a.usuario ? a.usuario.nombre : 'Sistema'}</strong>
                      {a.usuario && (
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          [{a.usuario.rol}]
                        </div>
                      )}
                    </td>

                    <td className={styles.td}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#475569' }}>
                        {a.entidad}
                      </span>
                    </td>

                    <td className={styles.td}>
                      <span className={styles.auditDetailsText}>
                        {a.detalles || 'Sin detalles especificados'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: CREAR NUEVO USUARIO (SCRUM-39) */}
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
                      placeholder="Mínimo 6 caracteres"
                      value={nuevoPassword}
                      onChange={(e) => setNuevoPassword(e.target.value)}
                      minLength={6}
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
                      <option value="RECEPCIONISTA">Recepcionista</option>
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
