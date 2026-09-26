'use client';

import { useState, useEffect } from 'react';
import styles from './mi-perfil.module.css';
import { useMiPerfil, useActualizarMiPerfil, Rol, getNombreRol } from '../../hooks/usuarios/useUsuarios';
import { supabase } from '../../lib/supabaseClient';

export default function MiPerfilView() {
  const { data: perfil, isLoading, isError, refetch } = useMiPerfil();
  const actualizarPerfilMutation = useActualizarMiPerfil();

  // Estados de edición de Nombre
  const [nombre, setNombre] = useState('');
  const [nombreGuardado, setNombreGuardado] = useState(false);
  const [errorNombre, setErrorNombre] = useState<string | null>(null);

  // Estados de Cambio de Contraseña
  const [passwordActual, setPasswordActual] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordActual, setShowPasswordActual] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [cambiandoPassword, setCambiandoPassword] = useState(false);
  const [successPassword, setSuccessPassword] = useState(false);
  const [errorPassword, setErrorPassword] = useState<string | null>(null);

  // Sincronizar input de nombre con el perfil cargado
  useEffect(() => {
    if (perfil?.nombre) {
      setNombre(perfil.nombre);
    }
  }, [perfil?.nombre]);

  // Manejador: Actualizar Nombre
  async function handleGuardarNombre(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) {
      setErrorNombre('El nombre no puede estar vacío.');
      return;
    }

    try {
      setErrorNombre(null);
      setNombreGuardado(false);
      await actualizarPerfilMutation.mutateAsync({ nombre: nombre.trim() });
      setNombreGuardado(true);
      setTimeout(() => setNombreGuardado(false), 3500);
    } catch (err: any) {
      setErrorNombre(err.message || 'Error al actualizar el nombre en el sistema.');
    }
  }

  // Manejador: Cambiar Contraseña (Supabase Auth con verificación de contraseña actual)
  async function handleCambiarPassword(e: React.FormEvent) {
    e.preventDefault();
    setErrorPassword(null);
    setSuccessPassword(false);

    if (!passwordActual.trim()) {
      setErrorPassword('Debes ingresar tu contraseña actual.');
      return;
    }

    if (password.length < 8) {
      setErrorPassword('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorPassword('Las contraseñas nuevas no coinciden.');
      return;
    }

    if (password === passwordActual) {
      setErrorPassword('La nueva contraseña no puede ser idéntica a tu contraseña actual.');
      return;
    }

    try {
      setCambiandoPassword(true);

      // 1. Re-autenticar con la contraseña actual para verificar identidad
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: perfil.email,
        password: passwordActual,
      });

      if (signInError) {
        throw new Error('La contraseña actual ingresada es incorrecta.');
      }

      // 2. Si la contraseña actual es válida, actualizar a la nueva
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        throw updateError;
      }

      setSuccessPassword(true);
      setPasswordActual('');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccessPassword(false), 5000);
    } catch (err: any) {
      setErrorPassword(err.message || 'No fue posible actualizar la contraseña.');
    } finally {
      setCambiandoPassword(false);
    }
  }

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          <p>Cargando información de tu perfil...</p>
        </div>
      </div>
    );
  }

  if (isError || !perfil) {
    return (
      <div className={styles.container}>
        <div className={styles.alertError}>
          <span>No fue posible cargar los datos de tu perfil.</span>
          <button
            type="button"
            onClick={() => refetch()}
            style={{
              marginLeft: 'auto',
              padding: '6px 12px',
              borderRadius: '6px',
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const initial = (perfil.nombre || perfil.email || 'U').charAt(0).toUpperCase();
  const rol = (perfil.rol || 'MECANICO') as Rol;

  return (
    <div className={styles.container}>
      {/* Tarjeta de Encabezado */}
      <div className={styles.headerCard}>
        <div className={styles.headerMain}>
          <div className={styles.avatarCircle}>{initial}</div>
          <div className={styles.headerInfo}>
            <h2>{perfil.nombre || 'Usuario'}</h2>
            <p>{perfil.email}</p>
            <div className={styles.badgeRow}>
              <span
                className={`${styles.roleBadge} ${
                  rol === 'ADMINISTRADOR'
                    ? styles.roleAdmin
                    : rol === 'RECEPCIONISTA'
                    ? styles.roleRecepcion
                    : styles.roleMecanico
                }`}
              >
                Rol: {getNombreRol(rol)}
              </span>
              <span className={styles.statusOnlineBadge}>
                <span className={styles.statusDot} />
                Sesión Activa
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grilla: Ficha de Cuenta vs Seguridad */}
      <div className={styles.gridTwoCols}>
        {/* COLUMNA 1: FICHA DEL USUARIO */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={`${styles.cardIcon} ${styles.cardIconPrimary}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <h3 className={styles.cardTitle}>Datos de tu Cuenta</h3>
              <p className={styles.cardSubtitle}>
                Información personal visible en órdenes de trabajo y registros del taller
              </p>
            </div>
          </div>

          <form onSubmit={handleGuardarNombre} className={styles.form}>
            {nombreGuardado && (
              <div className={styles.alertSuccess}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>¡Tu nombre ha sido actualizado correctamente!</span>
              </div>
            )}

            {errorNombre && (
              <div className={styles.alertError}>
                <span>{errorNombre}</span>
              </div>
            )}

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <span>Nombre Completo *</span>
                <span className={styles.formLabelHint}>Editable</span>
              </label>
              <input
                type="text"
                className={styles.formInput}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ingresa tu nombre y apellido"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <span>Correo Electrónico (Login)</span>
                <span className={styles.formLabelHint}>Solo Lectura</span>
              </label>
              <input
                type="email"
                className={`${styles.formInput} ${styles.formInputReadonly}`}
                value={perfil.email}
                disabled
                readOnly
                title="El correo está vinculado a tu cuenta en Supabase Auth"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <span>Rol en el Sistema</span>
                <span className={styles.formLabelHint}>Administrado por el Taller</span>
              </label>
              <input
                type="text"
                className={`${styles.formInput} ${styles.formInputReadonly}`}
                value={perfil.rol}
                disabled
                readOnly
                title="Los roles solo pueden ser modificados por un Administrador desde el panel de seguridad"
              />
            </div>

            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={actualizarPerfilMutation.isPending || nombre.trim() === perfil.nombre}
            >
              {actualizarPerfilMutation.isPending ? (
                <>
                  <span className={styles.spinner} />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>Guardar Cambios</span>
              )}
            </button>
          </form>
        </div>

        {/* COLUMNA 2: CAMBIO DE CONTRASEÑA */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={`${styles.cardIcon} ${styles.cardIconSecurity}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div>
              <h3 className={styles.cardTitle}>Cambio de Contraseña</h3>
              <p className={styles.cardSubtitle}>
                Gestiona tus credenciales de acceso seguras a través de Supabase Auth
              </p>
            </div>
          </div>

          <form onSubmit={handleCambiarPassword} className={styles.form}>
            {successPassword && (
              <div className={styles.alertSuccess}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>¡Contraseña actualizada exitosamente en Supabase!</span>
              </div>
            )}

            {errorPassword && (
              <div className={styles.alertError}>
                <span>{errorPassword}</span>
              </div>
            )}

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Contraseña Actual *</label>
              <div className={styles.passwordInputWrapper}>
                <input
                  type={showPasswordActual ? 'text' : 'password'}
                  className={styles.formInput}
                  value={passwordActual}
                  onChange={(e) => setPasswordActual(e.target.value)}
                  placeholder="Tu contraseña actual"
                  required
                />
                <button
                  type="button"
                  className={styles.passwordToggleBtn}
                  onClick={() => setShowPasswordActual(!showPasswordActual)}
                  title={showPasswordActual ? 'Ocultar' : 'Mostrar'}
                >
                  {showPasswordActual ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Nueva Contraseña *</label>
              <div className={styles.passwordInputWrapper}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={styles.formInput}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className={styles.passwordToggleBtn}
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Ocultar' : 'Mostrar'}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Confirmar Nueva Contraseña *</label>
              <input
                type={showPassword ? 'text' : 'password'}
                className={styles.formInput}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la nueva contraseña"
                minLength={8}
                required
              />
            </div>

            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={cambiandoPassword || !passwordActual || !password || !confirmPassword}
            >
              {cambiandoPassword ? (
                <>
                  <span className={styles.spinner} />
                  <span>Actualizando clave...</span>
                </>
              ) : (
                <span>Actualizar Contraseña</span>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* SECCIÓN OPCIONAL: PERMISOS Y ALCANCE OPERATIVO SEGÚN ROL */}
      <div className={styles.permissionsCard}>
        <div className={styles.cardHeader}>
          <div className={`${styles.cardIcon} ${styles.cardIconPermissions}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <h3 className={styles.cardTitle}>Alcance Operativo de tu Rol ({rol})</h3>
            <p className={styles.cardSubtitle}>
              Módulos y facultades habilitadas en la plataforma según la política de seguridad RBAC
            </p>
          </div>
        </div>

        <div className={styles.permissionsList}>
          {rol === 'ADMINISTRADOR' && (
            <>
              <div className={styles.permissionItem}>
                <div className={styles.permissionCheck}>✓</div>
                <div className={styles.permissionText}>
                  <h5>Control Total del Sistema</h5>
                  <p>Acceso irrestricto a clientes, vehículos, órdenes de trabajo, catálogo e inventario.</p>
                </div>
              </div>
              <div className={styles.permissionItem}>
                <div className={styles.permissionCheck}>✓</div>
                <div className={styles.permissionText}>
                  <h5>Gestión de Usuarios y Roles</h5>
                  <p>Creación de credenciales, modificación de roles RBAC y suspensión de cuentas.</p>
                </div>
              </div>
              <div className={styles.permissionItem}>
                <div className={styles.permissionCheck}>✓</div>
                <div className={styles.permissionText}>
                  <h5>Bitácora de Auditoría</h5>
                  <p>Supervisión inmutable de eventos críticos, eliminaciones y cambios de precio.</p>
                </div>
              </div>
            </>
          )}

          {rol === 'RECEPCIONISTA' && (
            <>
              <div className={styles.permissionItem}>
                <div className={styles.permissionCheck}>✓</div>
                <div className={styles.permissionText}>
                  <h5>Atención de Clientes y Entendimiento de Necesidades</h5>
                  <p>Recepción profesional del cliente, levantamiento de requerimientos, registro de fichas de vehículos y seguimiento.</p>
                </div>
              </div>
              <div className={styles.permissionItem}>
                <div className={styles.permissionCheck}>✓</div>
                <div className={styles.permissionText}>
                  <h5>Coordinación de Atención y Reparación</h5>
                  <p>Apertura de Órdenes de Trabajo, registro de kilometraje, estado de carrocería y coordinación con mecánicos.</p>
                </div>
              </div>
              <div className={styles.permissionItem}>
                <div className={styles.permissionCheck}>✓</div>
                <div className={styles.permissionText}>
                  <h5>Soluciones, Inventario y Cotizaciones</h5>
                  <p>Consulta de repuestos disponibles, elaboración de presupuestos transparentes y ofrecimiento de soluciones al cliente.</p>
                </div>
              </div>
            </>
          )}

          {rol === 'MECANICO' && (
            <>
              <div className={styles.permissionItem}>
                <div className={styles.permissionCheck}>✓</div>
                <div className={styles.permissionText}>
                  <h5>Diagnóstico Técnico y Reparación</h5>
                  <p>Registro de hallazgos mecánicos, trabajos realizados y evidencia fotográfica.</p>
                </div>
              </div>
              <div className={styles.permissionItem}>
                <div className={styles.permissionCheck}>✓</div>
                <div className={styles.permissionText}>
                  <h5>Registro de Mano de Obra y Repuestos</h5>
                  <p>Carga de horas dedicadas y solicitud/asignación de repuestos consumidos en OTs asignadas.</p>
                </div>
              </div>
              <div className={styles.permissionItem}>
                <div className={styles.permissionCheck}>✓</div>
                <div className={styles.permissionText}>
                  <h5>Consulta de Inventario de Repuestos</h5>
                  <p>Visualización de compatibilidad, disponibilidad en taller y ubicación física en bodega.</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
