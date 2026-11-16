'use client';

import { useEffect, useRef, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useQueryClient, QueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { fetchWithAuth } from '../../lib/api';
import styles from '../page.module.css';
import { useInactivityTimeout } from '../../hooks/useInactivityTimeout';
import { useMiPerfil } from '../../hooks/usuarios/useUsuarios';
import { useRepuestos } from '../../hooks/repuestos/useRepuestos';
import { useOrdenesTrabajo } from '../../hooks/ordenes-trabajo/useOrdenesTrabajo';
import { useCotizaciones } from '../../hooks/cotizaciones/useCotizaciones';
import { NAV_ITEMS, Rol, isRouteAllowed, getActiveNavHref, getNombreRol, NavItemConfig } from './navConfig';
import { DashboardContext, UserProfile } from './DashboardContext';
import { useTheme } from '../context/ThemeContext';

const NAV_ICONS: Record<string, React.ReactNode> = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  'clientes-vehiculos': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  'ordenes-trabajo': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  inventario: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  ),
  cotizaciones: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  'usuarios-seguridad': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  auditoria: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  ajustes: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
};

function prefetchNavRoute(queryClient: QueryClient, href: string) {
  try {
    if (href === '/') {
      queryClient.prefetchQuery({
        queryKey: ['dashboard', 'metricas', '', ''],
        queryFn: () => fetchWithAuth('/dashboard/metricas'),
      });
    } else if (href.startsWith('/clientes')) {
      queryClient.prefetchQuery({
        queryKey: ['clientes', ''],
        queryFn: () => fetchWithAuth('/clientes'),
      });
    } else if (href.startsWith('/ordenes')) {
      queryClient.prefetchQuery({
        queryKey: ['ordenes-trabajo'],
        queryFn: () => fetchWithAuth('/ordenes-trabajo'),
      });
      queryClient.prefetchQuery({
        queryKey: ['mecanicos'],
        queryFn: () => fetchWithAuth('/ordenes-trabajo/mecanicos'),
      });
    } else if (href.startsWith('/cotizaciones')) {
      queryClient.prefetchQuery({
        queryKey: ['cotizaciones', 'TODAS', 'TODAS'],
        queryFn: () => fetchWithAuth('/cotizaciones'),
      });
    } else if (href.startsWith('/inventario')) {
      const tipo = href.includes('tipo=INSUMO')
        ? 'INSUMO'
        : href.includes('tipo=REPUESTO')
        ? 'REPUESTO'
        : 'TODOS';
      const qs = tipo !== 'TODOS' ? `?tipo=${tipo}` : '';
      queryClient.prefetchQuery({
        queryKey: ['repuestos', tipo, '', false],
        queryFn: () => fetchWithAuth(`/repuestos${qs}`),
      });
    } else if (href.startsWith('/usuarios')) {
      queryClient.prefetchQuery({
        queryKey: ['usuarios', undefined, undefined],
        queryFn: () => fetchWithAuth('/usuarios'),
      });
    } else if (href.startsWith('/auditoria')) {
      // Misma URL y queryKey que useAuditoria con el orden por defecto de AuditoriaView
      queryClient.prefetchQuery({
        queryKey: ['auditoria', 'creadoEn', 'desc', undefined],
        queryFn: async () =>
          (await fetchWithAuth('/auditoria?sortBy=creadoEn&sortOrder=desc')) || [],
      });
    } else if (href.startsWith('/perfil')) {
      queryClient.prefetchQuery({
        queryKey: ['perfil'],
        queryFn: () => fetchWithAuth('/perfil'),
      });
    }
  } catch {
    // Prefetch oportunista y silencioso
  }
}


function SidebarNavList({
  visibleNavItems,
  activeNavHref,
  pathname,
  sidebarOpen,
}: {
  visibleNavItems: NavItemConfig[];
  activeNavHref: string;
  pathname: string;
  sidebarOpen: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const currentTipo = searchParams.get('tipo');

  const navListRef = useRef<HTMLUListElement>(null);
  const [indicatorReady, setIndicatorReady] = useState(false);
  const [indicatorStyle, setIndicatorStyle] = useState<{
    top: number;
    height: number;
    opacity: number;
  }>({ top: 0, height: 0, opacity: 0 });

  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    function updateIndicator() {
      if (!navListRef.current) return;
      const activeEl = navListRef.current.querySelector<HTMLElement>('[data-nav-active="true"]');
      if (activeEl) {
        const li = activeEl.closest('li') || activeEl;
        setIndicatorStyle({
          top: li.offsetTop,
          height: activeEl.offsetHeight || 40,
          opacity: 1,
        });
        setIndicatorReady(true);
      } else {
        setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
      }
    }

    updateIndicator();
    const timer = setTimeout(updateIndicator, 260);
    return () => clearTimeout(timer);
  }, [activeNavHref, sidebarOpen, expandedMenus]);

  return (
    <ul
      className={`${styles.navList} ${indicatorReady ? styles.navListAnimated : ''}`}
      ref={navListRef}
      style={{ marginTop: '16px' }}
    >
      <div
        className={styles.activeIndicator}
        style={{
          transform: `translateY(${indicatorStyle.top}px)`,
          height: `${indicatorStyle.height}px`,
          opacity: indicatorStyle.opacity,
        }}
        aria-hidden="true"
      />
      {visibleNavItems.map((item) => {
        const isActive = activeNavHref === item.href;
        const hasChildren = !!item.children && item.children.length > 0;
        const isExpanded = !!expandedMenus[item.id];

        return (
          <li key={item.id} className={styles.navListItem}>
            {hasChildren ? (
              <button
                type="button"
                data-nav-active={isActive ? 'true' : 'false'}
                onMouseEnter={() => prefetchNavRoute(queryClient, item.children![0]?.href || item.href)}
                onClick={() => {
                  if (!sidebarOpen) {
                    router.push(item.children![0]?.href || item.href);
                    return;
                  }
                  setExpandedMenus((prev) => ({
                    ...prev,
                    [item.id]: !prev[item.id],
                  }));
                }}
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                data-tooltip={item.label}
              >
                <span className={styles.navItemContent}>
                  {NAV_ICONS[item.id]}
                  <span className={styles.navLabel}>{item.label}</span>
                </span>

                {sidebarOpen && (
                  <span
                    className={`${styles.navItemChevron} ${isExpanded ? styles.navItemChevronRotated : ''}`}
                    aria-hidden="true"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </span>
                )}
              </button>
            ) : (
              <Link
                href={item.href}
                prefetch={true}
                data-nav-active={isActive ? 'true' : 'false'}
                onMouseEnter={() => prefetchNavRoute(queryClient, item.href)}
                onClick={(e) => {
                  const li = e.currentTarget.closest('li');
                  if (li) {
                    setIndicatorStyle({
                      top: li.offsetTop,
                      height: e.currentTarget.offsetHeight || 40,
                      opacity: 1,
                    });
                  }
                }}
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                style={{ textDecoration: 'none' }}
                data-tooltip={item.label}
              >
                <span className={styles.navItemContent}>
                  {NAV_ICONS[item.id]}
                  <span className={styles.navLabel}>{item.label}</span>
                </span>
                {isActive && <span className={styles.activeDot} />}
              </Link>
            )}

            {hasChildren && sidebarOpen && (
              <div
                className={`${styles.navSubMenuWrapper} ${isExpanded ? styles.navSubMenuExpanded : ''}`}
                aria-hidden={!isExpanded}
              >
                <div className={styles.navSubMenuInner}>
                  <ul className={styles.navSubList}>
                    {item.children!.map((sub, idx) => {
                      const isSubActive =
                        pathname.startsWith('/inventario') &&
                        (sub.href.includes('tipo=INSUMO')
                          ? currentTipo === 'INSUMO'
                          : sub.href.includes('tipo=REPUESTO')
                          ? currentTipo === 'REPUESTO'
                          : currentTipo === 'TODOS' || !currentTipo);

                      return (
                        <li
                          key={sub.id}
                          className={styles.navSubListItem}
                          style={{
                            transitionDelay: isExpanded ? `${idx * 35}ms` : '0ms',
                          }}
                        >
                          <Link
                            href={sub.href}
                            prefetch={true}
                            className={`${styles.navSubItem} ${isSubActive ? styles.navSubItemActive : ''}`}
                            tabIndex={isExpanded ? 0 : -1}
                            onMouseEnter={() => prefetchNavRoute(queryClient, sub.href)}
                          >
                            <span className={styles.navSubDot} aria-hidden="true" />
                            <span>{sub.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Si la carga inicial tarda (p. ej. el backend en Render está despertando), se avisa al usuario
  const [cargaLenta, setCargaLenta] = useState(false);
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setCargaLenta(true), 5000);
    return () => clearTimeout(timer);
  }, [loading]);
  const { theme, toggleTheme } = useTheme();
  const activeNavHref = getActiveNavHref(pathname);

  // Inactividad
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

  // Perfil reactivo
  const { data: perfilActual } = useMiPerfil(!loading && !!user?.id);

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

  // Redirigir a / si el rol no tiene acceso a la ruta actual
  useEffect(() => {
    if (user?.rol && !loading) {
      if (!isRouteAllowed(pathname, user.rol)) {
        window.location.href = '/';
      }
    }
  }, [user?.rol, pathname, loading]);

  // Carga de sesión inicial
  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      try {
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
          const perfilBD = await fetchWithAuth<UserProfile>('/perfil');
          if (perfilBD && isMounted) {
            queryClient.setQueryData(['perfil'], perfilBD);
            setUser({
              id: perfilBD.id,
              email: perfilBD.email,
              nombre: perfilBD.nombre || authUser.user_metadata?.nombre || authUser.email?.split('@')[0],
              rol: (perfilBD.rol || 'MECANICO') as Rol,
            });
            setLoading(false);
            return;
          }
        } catch (err) {
          console.warn('No se pudo cargar perfil desde API, usando fallback:', err);
        }

        if (isMounted) {
          const rol = (authUser.user_metadata?.rol || 'MECANICO') as Rol;
          setUser({
            id: authUser.id,
            email: authUser.email || '',
            nombre: authUser.user_metadata?.nombre || authUser.email?.split('@')[0],
            rol: rol,
          });
          setLoading(false);
        }
      } catch (err) {
        console.error('Error al inicializar sesión:', err);
        if (isMounted) setLoading(false);
      }
    }

    loadUser();

    return () => {
      isMounted = false;
    };
  }, [queryClient]);

  async function handleLogout() {
    queryClient.clear();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Consultas de datos para alertas del taller (habilitadas si el usuario ya está autenticado)
  const isAuth = !loading && !!user?.id;
  const { data: repuestosData } = useRepuestos();
  const { data: ordenesData = [] } = useOrdenesTrabajo();
  // El Mecánico no tiene acceso a cotizaciones (403 en el backend): no se consulta para su rol
  const { data: cotizacionesData = [] } = useCotizaciones(undefined, {
    enabled: isAuth && user?.rol !== 'MECANICO',
  });

  // Cerrar notificaciones al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    }
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  // Cerrar notificaciones y menú móvil al cambiar de ruta
  useEffect(() => {
    setShowNotifications(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  const userRole = (user?.rol || 'MECANICO') as Rol;

  // Calentamiento en reposo (Warm-up en segundo plano tras login)
  useEffect(() => {
    if (!isAuth) return;
    const timer = setTimeout(() => {
      // 1. Prefetch de datos en segundo plano según permisos de rol
      if (userRole !== 'MECANICO') {
        prefetchNavRoute(queryClient, '/clientes');
        prefetchNavRoute(queryClient, '/cotizaciones');
      }
      prefetchNavRoute(queryClient, '/ordenes');
      prefetchNavRoute(queryClient, '/inventario?tipo=TODOS');
      if (userRole === 'ADMINISTRADOR') {
        prefetchNavRoute(queryClient, '/usuarios');
        prefetchNavRoute(queryClient, '/auditoria');
      }

      // 2. Prefetch de bundles Next.js para navegación instantánea
      try {
        if (userRole !== 'MECANICO') {
          router.prefetch('/clientes');
          router.prefetch('/cotizaciones');
        }
        router.prefetch('/ordenes');
        router.prefetch('/inventario');
        if (userRole === 'ADMINISTRADOR') {
          router.prefetch('/usuarios');
          router.prefetch('/auditoria');
        }
      } catch {
        // Silencioso
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [isAuth, userRole, queryClient, router]);

  // Alertas calculadas al vuelo (Ponytail: sin hooks ni tablas adicionales)
  const alertas = useMemo(() => {
    if (!isAuth) return [];
    const list: Array<{
      id: string;
      tipo: 'stock' | 'ot' | 'cot';
      titulo: string;
      desc: string;
      href: string;
    }> = [];

    // 1. Alertas de Repuestos (Admin y Recepción)
    if (userRole !== 'MECANICO' && repuestosData?.items) {
      const repuestosBajos = repuestosData.items.filter(
        (r) => r.stock <= (r.stockMinimo ?? 5)
      );
      if (repuestosBajos.length > 0) {
        list.push({
          id: 'repuestos-bajos',
          tipo: 'stock',
          titulo: `${repuestosBajos.length} artículo(s) con stock crítico`,
          desc: repuestosBajos
            .slice(0, 2)
            .map((r) => `${r.nombre} (${r.stock} uds)`)
            .join(', ') + (repuestosBajos.length > 2 ? ' y más...' : ''),
          href: '/inventario?tipo=TODOS',
        });
      }
    }

    // 2. Alertas de Órdenes de Trabajo
    if (userRole === 'MECANICO') {
      // Mecánico: OTs asignadas a él en diagnóstico o recibido
      const misOTsPendientes = ordenesData.filter(
        (o) => o.mecanicoId === user?.id && (o.estado === 'RECIBIDO' || o.estado === 'DIAGNOSTICO')
      );
      if (misOTsPendientes.length > 0) {
        list.push({
          id: 'mis-ots-pendientes',
          tipo: 'ot',
          titulo: `${misOTsPendientes.length} OT(s) asignadas por revisar`,
          desc: misOTsPendientes
            .slice(0, 2)
            .map((o) => `${o.vehiculo.patente} (${o.fallaReportada.slice(0, 24)})`)
            .join(', '),
          href: '/ordenes',
        });
      }
    } else {
      // Admin / Recepcionista: OTs listas para entrega
      const otsListas = ordenesData.filter(
        (o) => o.estado === 'CONTROL_CALIDAD' || o.estado === 'ENTREGADO'
      );
      if (otsListas.length > 0) {
        list.push({
          id: 'ots-listas',
          tipo: 'ot',
          titulo: `${otsListas.length} vehículo(s) en control o listos`,
          desc: 'Vehículos con reparaciones completadas listos para retiro.',
          href: '/ordenes',
        });
      }
    }

    // 3. Alertas de Cotizaciones (Admin y Recepcionista)
    if (userRole !== 'MECANICO') {
      const cotizacionesPendientes = cotizacionesData.filter(
        (c) => c.estado === 'BORRADOR' || c.estado === 'ENVIADA'
      );
      if (cotizacionesPendientes.length > 0) {
        list.push({
          id: 'cotizaciones-pendientes',
          tipo: 'cot',
          titulo: `${cotizacionesPendientes.length} cotización(es) pendientes`,
          desc: 'Cotizaciones en borrador o enviadas en espera de aprobación.',
          href: '/cotizaciones',
        });
      }
    }

    return list;
  }, [isAuth, userRole, user?.id, repuestosData, ordenesData, cotizacionesData]);

  if (loading) {
    return (
      <div className={styles.splashContainer}>
        <div className={styles.kineticStack}>
          <span className={`${styles.kineticWord} ${styles.kineticWordGear}`}>GEAR</span>
          <span className={`${styles.kineticWord} ${styles.kineticWordCore}`}>CORE</span>
        </div>
        {cargaLenta && (
          <p className={styles.splashAviso} role="status">
            Iniciando el servidor, esto puede tardar hasta un minuto…
          </p>
        )}
      </div>
    );
  }

  const initialLetter = (user?.nombre || user?.email || 'U').charAt(0).toUpperCase();
  const visibleNavItems = NAV_ITEMS.filter(
    (item) => item.roles.includes(userRole) && item.id !== 'auditoria'
  );
  const auditoriaItem = NAV_ITEMS.find(
    (item) => item.id === 'auditoria' && item.roles.includes(userRole)
  );

  const rolLabel = getNombreRol(userRole);

  const fechaHoy = new Date().toLocaleDateString('es-CL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <DashboardContext.Provider value={{ user, userRole, loading }}>
      <div className={styles.appContainer}>
        {/* Barra Superior Global (AppBar) */}
        <header className={styles.appBar}>
          <div className={styles.appBarLeft}>
            {/* Botón Hamburguesa Móvil (visible solo en < 960px vía CSS) */}
            <button
              type="button"
              className={styles.mobileMenuBtn}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
              title="Menú"
            >
              {mobileMenuOpen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>

            <div className={styles.appBarStatus}>
              <span className={styles.onlineDot} />
              <span>En Línea</span>
            </div>

            <div className={styles.appBarItem}>
              <span className={styles.appBarLabel}>Usuario:</span>
              <span className={styles.appBarValue}>{user?.nombre || 'Usuario'}</span>
            </div>

            <div className={styles.appBarItem}>
              <span className={styles.appBarLabel}>ROL:</span>
              <span className={styles.appBarValue}>{rolLabel}</span>
            </div>
          </div>

          <div className={styles.appBarRight}>
            <span className={styles.appBarDate}>{fechaHoy}</span>

            {/* Conmutador de Modo Oscuro / Modo Claro */}
            <button
              type="button"
              className={styles.themeToggleBtn}
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {theme === 'dark' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            {/* Centro de Notificaciones Activas */}
            <div className={styles.notificationsWrapper} ref={notifRef}>
              <button
                type="button"
                className={styles.notificationBtn}
                onClick={() => setShowNotifications((prev) => !prev)}
                title={alertas.length > 0 ? `${alertas.length} alertas del taller` : 'Notificaciones: Todo al día'}
                aria-label="Notificaciones"
                aria-expanded={showNotifications}
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {alertas.length > 0 && (
                  <span className={styles.notificationBadgeCount}>{alertas.length}</span>
                )}
              </button>

              {/* Popover flotante de notificaciones */}
              {showNotifications && (
                <div className={styles.notificationsPopover}>
                  <div className={styles.notificationsHeader}>
                    <span className={styles.notificationsTitle}>Notificaciones</span>
                    <span className={styles.notificationsCount}>
                      {alertas.length} {alertas.length === 1 ? 'alerta' : 'alertas'}
                    </span>
                  </div>

                  <div className={styles.notificationsList}>
                    {alertas.length === 0 ? (
                      <div className={styles.notificationsEmpty}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#10b981' }}>
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        <span>Todo al día. No hay alertas pendientes.</span>
                      </div>
                    ) : (
                      alertas.map((item) => (
                        <Link
                          key={item.id}
                          href={item.href}
                          className={styles.notificationItem}
                          onClick={() => setShowNotifications(false)}
                        >
                          <div
                            className={`${styles.notificationIcon} ${
                              item.tipo === 'stock'
                                ? styles.notificationIconStock
                                : item.tipo === 'ot'
                                ? styles.notificationIconOT
                                : styles.notificationIconCot
                            }`}
                          >
                            {item.tipo === 'stock' ? (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                              </svg>
                            ) : item.tipo === 'ot' ? (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                              </svg>
                            ) : (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                              </svg>
                            )}
                          </div>
                          <div className={styles.notificationContent}>
                            <div className={styles.notificationItemTitle}>{item.titulo}</div>
                            <div className={styles.notificationItemDesc}>{item.desc}</div>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className={styles.layout}>
          {/* Backdrop para cerrar el drawer en móviles al tocar fuera */}
          {mobileMenuOpen && (
            <div
              className={styles.mobileBackdrop}
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
          )}

          {/* Contenedor Rail para reservar espacio y evitar reflow al expandir por hover */}
          <div className={`${styles.sidebarRailWrapper} ${!sidebarOpen ? styles.sidebarRailWrapperCollapsed : ''}`}>
            {/* Barra Lateral Izquierda (Sidebar con Rail + Hover Expand en escritorio, Drawer en móviles) */}
            <aside className={`${styles.sidebar} ${!sidebarOpen ? styles.sidebarCollapsed : ''} ${mobileMenuOpen ? styles.sidebarMobileOpen : ''}`}>
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
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  title={sidebarOpen ? "Colapsar menú" : "Expandir menú"}
                  aria-label={sidebarOpen ? "Colapsar menú" : "Expandir menú"}
                  data-tooltip={sidebarOpen ? "Colapsar menú" : "Expandir menú"}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                    <line x1="9" y1="3" x2="9" y2="21" />
                    {sidebarOpen ? (
                      <path d="m16 15-3-3 3-3" />
                    ) : (
                      <path d="m13 9 3 3-3 3" />
                    )}
                  </svg>
                </button>
              </div>

              {/* Lista de navegación con submenús e indicador deslizante */}
              <Suspense fallback={null}>
                <SidebarNavList
                  visibleNavItems={visibleNavItems}
                  activeNavHref={activeNavHref}
                  pathname={pathname}
                  sidebarOpen={sidebarOpen}
                />
              </Suspense>
          </div>

          {/* Pie de Barra Lateral (Auditoría, Mi Perfil y Logout) */}
          <div className={styles.sidebarFooter}>
            {auditoriaItem && (
              <Link
                href={auditoriaItem.href}
                prefetch={true}
                className={`${styles.navItem} ${activeNavHref === auditoriaItem.href ? styles.navItemActive : ''}`}
                style={{ textDecoration: 'none' }}
                data-tooltip={auditoriaItem.label}
                onMouseEnter={() => prefetchNavRoute(queryClient, auditoriaItem.href)}
              >
                <span className={styles.navItemContent}>
                  {NAV_ICONS[auditoriaItem.id]}
                  <span className={styles.navLabel}>{auditoriaItem.label}</span>
                </span>
                {activeNavHref === auditoriaItem.href && <span className={styles.activeDot} />}
              </Link>
            )}

            <Link
              href="/perfil"
              prefetch={true}
              className={`${styles.navItem} ${pathname === '/perfil' ? styles.navItemActive : ''}`}
              style={{ textDecoration: 'none' }}
              data-tooltip="Mi Perfil"
              onMouseEnter={() => prefetchNavRoute(queryClient, '/perfil')}
            >
              <span className={styles.navItemContent}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span className={styles.navLabel}>Mi Perfil</span>
              </span>
              {pathname === '/perfil' && <span className={styles.activeDot} />}
            </Link>

            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className={styles.logoutBtn}
              title="Cerrar sesión"
              data-tooltip="Cerrar Sesión"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span className={styles.navLabel}>Cerrar Sesión</span>
            </button>
          </div>
        </aside>
      </div>

        {/* Área Principal de Contenido */}
        <main className={styles.mainContent}>
          {children}
        </main>

        {/* Modal de Confirmación de Cierre de Sesión */}
        {showLogoutConfirm && (
          <div className={styles.modalOverlay}>
            <div className={styles.confirmModalContent}>
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

        {/* Advertencia de Cierre de Sesión por Inactividad */}
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
      </div>
    </DashboardContext.Provider>
  );
}
