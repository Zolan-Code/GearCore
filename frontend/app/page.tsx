'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { fetchWithAuth } from '../lib/api';
import styles from './page.module.css';
import ClientesVehiculosView from './components/ClientesVehiculosView';
import OrdenesTrabajoView from './components/OrdenesTrabajoView';
import UsuariosSeguridadView from './components/UsuariosSeguridadView';
import InventarioView from './components/InventarioView';
import MiPerfilView from './components/MiPerfilView';
import CotizacionesView from './components/CotizacionesView';
import { useInactivityTimeout } from '../hooks/useInactivityTimeout';
import { useMiPerfil } from '../hooks/usuarios/useUsuarios';

interface UserProfile {
  id: string;
  email: string;
  nombre?: string;
  rol?: string;
}

type Rol = 'ADMINISTRADOR' | 'RECEPCIONISTA' | 'MECANICO';

interface NavItemConfig {
  id: string;
  label: string;
  roles: Rol[];
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItemConfig[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    roles: ['ADMINISTRADOR', 'RECEPCIONISTA', 'MECANICO'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    id: 'clientes-vehiculos',
    label: 'Gestión de Clientes y Vehículos',
    roles: ['ADMINISTRADOR', 'RECEPCIONISTA'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: 'ordenes-trabajo',
    label: 'Órdenes de Trabajo (OT)',
    roles: ['ADMINISTRADOR', 'RECEPCIONISTA', 'MECANICO'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
  {
    id: 'inventario',
    label: 'Inventario de Repuestos',
    roles: ['ADMINISTRADOR', 'RECEPCIONISTA', 'MECANICO'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m7.5 4.27 9 5.15" />
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </svg>
    ),
  },
  {
    id: 'cotizaciones',
    label: 'Cotizaciones y Facturación',
    roles: ['ADMINISTRADOR', 'RECEPCIONISTA'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    id: 'usuarios-seguridad',
    label: 'Usuarios, Roles y Seguridad',
    roles: ['ADMINISTRADOR'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
];

export default function HomePage() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'general' | 'mision' | 'politicas'>('general');
  const [activeSection, setActiveSection] = useState<string>('dashboard');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Cierre de sesión automático por inactividad (SCRUM-42)
  const {
    showWarning: showInactivityWarning,
    secondsRemaining: inactivitySeconds,
    mantenerSesionActiva,
  } = useInactivityTimeout({
    timeoutMinutes: 15,
    warningMinutes: 1,
    onTimeout: handleLogout,
    enabled: !!user,
  });

  // Perfil reactivo con TanStack Query (se actualiza automáticamente al cambiar el rol propio)
  const { data: perfilActual } = useMiPerfil(!loading && !!user?.id);

  // Sincronizar reactivamente el usuario del sidebar cuando el perfil cambia en el backend
  useEffect(() => {
    if (perfilActual) {
      setUser((prev) => {
        if (!prev) return null;
        if (prev.rol === perfilActual.rol && prev.nombre === perfilActual.nombre) return prev;
        return {
          ...prev,
          nombre: perfilActual.nombre || prev.nombre,
          rol: perfilActual.rol as Rol,
        };
      });
    }
  }, [perfilActual]);

  // Si el usuario cambia a un rol sin permisos para la sección activa, redirigir a dashboard
  useEffect(() => {
    if (user?.rol) {
      const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user.rol as Rol));
      const isAllowed = activeSection === 'mi-perfil' || visibleItems.some((item) => item.id === activeSection);
      if (!isAllowed && activeSection !== 'dashboard') {
        setActiveSection('dashboard');
      }
    }
  }, [user?.rol, activeSection]);

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      try {
        // Timeout de seguridad: no dejar pegada la pantalla si la red o Supabase tardan
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) =>
          setTimeout(() => resolve({ data: { session: null } }), 3000)
        );
        const { data } = await Promise.race([sessionPromise, timeoutPromise]);

        if (!data.session?.user) {
          window.location.href = '/login';
          return;
        }

        const authUser = data.session.user;

        try {
          // Consultar perfil real y rol asignado desde la base de datos (PostgreSQL/Prisma)
          const perfilBD = await fetchWithAuth<UserProfile>('/perfil');
          if (perfilBD && isMounted) {
            queryClient.setQueryData(['perfil'], perfilBD);
            setUser({
              id: perfilBD.id,
              email: perfilBD.email,
              nombre: perfilBD.nombre || authUser.user_metadata?.nombre || authUser.email?.split('@')[0],
              rol: (perfilBD.rol || 'MECANICO') as Rol,
            });
            setActiveSection('dashboard');
            setLoading(false);
            return;
          }
        } catch (err) {
          console.warn('No se pudo cargar perfil desde API, usando metadata:', err);
        }

        if (isMounted) {
          // Fallback a metadata de Supabase Auth
          const rol = (authUser.user_metadata?.rol || 'MECANICO') as Rol;
          setUser({
            id: authUser.id,
            email: authUser.email || '',
            nombre: authUser.user_metadata?.nombre || authUser.email?.split('@')[0],
            rol: rol,
          });

          setActiveSection('dashboard');
          setLoading(false);
        }
      } catch (err) {
        console.error('Error al inicializar sesión:', err);
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleLogout() {
    // Vaciar todo el caché de TanStack Query para evitar filtración de datos entre roles en el mismo equipo
    queryClient.clear();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  if (loading) {
    return (
      <div className={styles.splashContainer}>
        <div className={styles.kineticStack}>
          <span className={`${styles.kineticWord} ${styles.kineticWordGear}`}>GEAR</span>
          <span className={`${styles.kineticWord} ${styles.kineticWordCore}`}>CORE</span>
        </div>
      </div>
    );
  }

  const initialLetter = (user?.nombre || user?.email || 'U').charAt(0).toUpperCase();
  const userRole = (user?.rol || 'MECANICO') as Rol;

  // Filtrar módulos visibles según el rol del usuario
  const visibleNavItems = NAV_ITEMS.filter((item) => item.roles.includes(userRole));

  return (
    <div className={styles.layout}>
      {/* Botón flotante para reabrir el menú lateral cuando está colapsado */}
      {!sidebarOpen && (
        <button
          type="button"
          className={styles.floatingMenuBtn}
          onClick={() => setSidebarOpen(true)}
          title="Mostrar menú lateral"
          aria-label="Mostrar menú lateral"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>
      )}

      {/* Barra Lateral Izquierda (Sidebar) */}
      <aside className={`${styles.sidebar} ${!sidebarOpen ? styles.sidebarCollapsed : ''}`}>
        <div className={styles.sidebarTop}>
          <div className={styles.brand}>
            <div className={styles.brandInfo}>
              <img src="/assets/logo.png" alt="GearCore" className={styles.brandLogo} />
              <div className={styles.brandText}>
                <h3>GearCore</h3>
                <p>ERP Taller Mecánico</p>
              </div>
            </div>

            <button
              type="button"
              className={styles.sidebarToggleBtn}
              onClick={() => setSidebarOpen(false)}
              title="Ocultar menú lateral"
              aria-label="Ocultar menú lateral"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            </button>
          </div>

          {/* Tarjeta de Usuario / Bienvenido en Barra Lateral */}
          <div className={styles.sidebarUserCard}>
            <div className={styles.sidebarUserMain}>
              <div className={styles.sidebarAvatar}>{initialLetter}</div>
              <div className={styles.sidebarUserDetails}>
                <div className={styles.sidebarGreeting}>Bienvenido,</div>
                <h4 className={styles.sidebarUserName} title={user?.nombre || 'Usuario'}>
                  {user?.nombre || 'Usuario'}
                </h4>
                <p className={styles.sidebarUserEmail} title={user?.email}>
                  {user?.email}
                </p>
              </div>
            </div>

            <div className={styles.sidebarUserMeta}>
              <div className={styles.sidebarMetaItem}>
                <span className={styles.sidebarMetaLabel}>Rol Activo</span>
                <span className={styles.sidebarRoleBadge}>{user?.rol}</span>
              </div>
              <div className={styles.sidebarMetaItem}>
                <span className={styles.sidebarMetaLabel}>Estado</span>
                <span className={styles.sidebarStatusBadge}>
                  <span className={styles.onlineDot} />
                  En Línea
                </span>
              </div>
            </div>

            <div className={styles.sidebarDateRow}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>
                {new Date().toLocaleDateString('es-CL', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>

          <ul className={styles.navList}>
            {visibleNavItems.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`${styles.navItem} ${activeSection === item.id ? styles.navItemActive : ''}`}
                  onClick={() => setActiveSection(item.id)}
                >
                  <span className={styles.navItemContent}>
                    {item.icon}
                    <span>{item.label}</span>
                  </span>
                  {activeSection === item.id && <span className={styles.activeDot} />}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.sidebarFooter}>
          <button
            type="button"
            className={`${styles.navItem} ${activeSection === 'mi-perfil' ? styles.navItemActive : ''}`}
            onClick={() => setActiveSection('mi-perfil')}
          >
            <span className={styles.navItemContent}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>Mi Perfil</span>
            </span>
            {activeSection === 'mi-perfil' && <span className={styles.activeDot} />}
          </button>
          <button type="button" onClick={() => setShowLogoutConfirm(true)} className={styles.logoutBtn} title="Cerrar sesión">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Área Principal de Contenido */}
      <main className={`${styles.mainContent} ${!sidebarOpen ? styles.mainContentExpanded : ''}`}>
        {/* Contenido Condicional: Dashboard, Clientes y Vehículos, Órdenes de Trabajo, o Usuarios */}
        {activeSection === 'clientes-vehiculos' ? (
          <ClientesVehiculosView userRole={userRole} />
        ) : activeSection === 'ordenes-trabajo' ? (
          <OrdenesTrabajoView userRole={userRole} userId={user?.id} />
        ) : activeSection === 'inventario' ? (
          <InventarioView userRole={userRole} />
        ) : activeSection === 'cotizaciones' ? (
          <CotizacionesView userRole={userRole} />
        ) : activeSection === 'usuarios-seguridad' ? (
          <UsuariosSeguridadView userRole={userRole} />
        ) : activeSection === 'mi-perfil' ? (
          <MiPerfilView />
        ) : (
          <>
            {/* Encabezado de Sección en Dashboard */}
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Panel de Control</h2>
              <p className={styles.sectionSubtitle}>Resumen operativo del taller y accesos rápidos en tiempo real</p>
            </div>

            {/* Cuadrícula de 4 Tarjetas de Resumen (Estructura Base) */}
            <section className={styles.cardsGrid}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h4>Jornada / Horas</h4>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.statRow}>
                    <span>Entrada</span>
                    <strong>08:30 AM</strong>
                  </div>
                  <div className={styles.statRow}>
                    <span>Horas hoy</span>
                    <strong>--:--</strong>
                  </div>
                </div>
                <button type="button" className={styles.cardAction}>Registrar Marca</button>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h4>Órdenes Pendientes</h4>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                  </svg>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.statRow}>
                    <span>En Recepción</span>
                    <strong>0</strong>
                  </div>
                  <div className={styles.statRow}>
                    <span>En Taller</span>
                    <strong>0</strong>
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.cardAction}
                  onClick={() => setActiveSection('ordenes-trabajo')}
                >
                  Ver Órdenes
                </button>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h4>Alertas e Inventario</h4>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.statRow}>
                    <span>Stock Crítico</span>
                    <strong>0</strong>
                  </div>
                  <div className={styles.statRow}>
                    <span>Notificaciones</span>
                    <strong>0</strong>
                  </div>
                </div>
                <button type="button" className={styles.cardAction}>Ver Alertas</button>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h4>Accesos Rápidos</h4>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.statRow}>
                    <span>{userRole === 'MECANICO' ? 'Mis Tareas' : 'Recepción Rápida'}</span>
                    <strong>+</strong>
                  </div>
                  <div className={styles.statRow}>
                    <span>{userRole === 'MECANICO' ? 'Taller' : 'Clientes y Autos'}</span>
                    <strong>+</strong>
                  </div>
                </div>
                {userRole !== 'MECANICO' ? (
                  <button
                    type="button"
                    className={styles.cardAction}
                    onClick={() => setActiveSection('clientes-vehiculos')}
                  >
                    Ir a Clientes y Vehículos
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.cardAction}
                    onClick={() => setActiveSection('ordenes-trabajo')}
                  >
                    Ver Órdenes Asignadas
                  </button>
                )}
              </div>
            </section>

        {/* Sección Inferior de Estructura / Información */}
        <section className={styles.bottomSection}>
          <div className={styles.tabPills}>
            <button
              type="button"
              className={`${styles.tabPill} ${activeTab === 'general' ? styles.tabPillActive : ''}`}
              onClick={() => setActiveTab('general')}
            >
              General
            </button>
            <button
              type="button"
              className={`${styles.tabPill} ${activeTab === 'mision' ? styles.tabPillActive : ''}`}
              onClick={() => setActiveTab('mision')}
            >
              Misión
            </button>
            <button
              type="button"
              className={`${styles.tabPill} ${activeTab === 'politicas' ? styles.tabPillActive : ''}`}
              onClick={() => setActiveTab('politicas')}
            >
              Políticas del Taller
            </button>
          </div>

          <div className={styles.infoCard}>
            {activeTab === 'general' && (
              <div>
                <h5>Plantilla Base Operativa</h5>
                <p>
                  Esta es la estructura visual del ERP lista para albergar los módulos de negocio.
                </p>
              </div>
            )}
            {activeTab === 'mision' && (
              <div>
                <h5>Misión Operativa</h5>
                <p>
                  Optimizar y digitalizar el flujo de trabajo de talleres mecánicos independientes,
                  garantizando trazabilidad técnica, control de repuestos y satisfacción del cliente.
                </p>
              </div>
            )}
            {activeTab === 'politicas' && (
              <div>
                <h5>Políticas de Servicio y Calidad</h5>
                <p>
                  Control de calidad obligatorio antes de la entrega de cada vehículo, registro
                  de horas hombre por mecánico e informe de diagnóstico documentado.
                </p>
              </div>
            )}
          </div>
        </section>
        </>
        )}
      </main>

      {/* Modal de Confirmación de Cierre de Sesión */}
      {showLogoutConfirm && (
        <div className={styles.modalOverlay} onClick={() => setShowLogoutConfirm(false)}>
          <div className={styles.confirmModalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmIconBox}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </div>

            <h3 className={styles.confirmTitle}>¿Cerrar sesión?</h3>
            <p className={styles.confirmDesc}>
              ¿Estás seguro de que deseas salir de <strong>GearCore</strong>? Deberás ingresar tus credenciales nuevamente para acceder.
            </p>

            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.btnCancelConfirm}
                onClick={() => setShowLogoutConfirm(false)}
                autoFocus
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.btnLogoutConfirm}
                onClick={handleLogout}
              >
                Sí, Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Advertencia de Cierre de Sesión por Inactividad (SCRUM-42) */}
      {showInactivityWarning && (
        <div className={styles.modalOverlay} style={{ zIndex: 1200 }}>
          <div className={styles.confirmModalContent} style={{ maxWidth: '440px' }}>
            <div className={styles.confirmIconBox} style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>

            <h3 className={styles.confirmTitle}>Sesión a punto de expirar</h3>
            <p className={styles.confirmDesc}>
              Por motivos de seguridad, tu sesión se cerrará automáticamente por inactividad en{' '}
              <strong style={{ color: '#d97706' }}>{inactivitySeconds} segundos</strong>.
            </p>

            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.btnLogoutConfirm}
                style={{ background: '#1e1b4b', borderColor: '#1e1b4b' }}
                onClick={mantenerSesionActiva}
                autoFocus
              >
                Mantener Sesión Activa
              </button>
              <button
                type="button"
                className={styles.btnCancelConfirm}
                onClick={handleLogout}
              >
                Cerrar Sesión Ahora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
