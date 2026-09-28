export type Rol = 'ADMINISTRADOR' | 'RECEPCIONISTA' | 'MECANICO';

export interface NavSubItemConfig {
  id: string;
  href: string;
  label: string;
}

export interface NavItemConfig {
  id: string;
  href: string;
  label: string;
  roles: Rol[];
  children?: NavSubItemConfig[];
}

export const NAV_ITEMS: NavItemConfig[] = [
  {
    id: 'dashboard',
    href: '/',
    label: 'Dashboard',
    roles: ['ADMINISTRADOR', 'RECEPCIONISTA', 'MECANICO'],
  },
  {
    id: 'clientes-vehiculos',
    href: '/clientes',
    label: 'Gestión de Clientes y Vehículos',
    roles: ['ADMINISTRADOR', 'RECEPCIONISTA'],
  },
  {
    id: 'ordenes-trabajo',
    href: '/ordenes',
    label: 'Órdenes de Trabajo (OT)',
    roles: ['ADMINISTRADOR', 'RECEPCIONISTA', 'MECANICO'],
  },
  {
    id: 'inventario',
    href: '/inventario',
    label: 'Inventario',
    roles: ['ADMINISTRADOR', 'RECEPCIONISTA', 'MECANICO'],
    children: [
      {
        id: 'inventario-general',
        href: '/inventario?tipo=TODOS',
        label: 'Inventario General',
      },
      {
        id: 'repuestos',
        href: '/inventario?tipo=REPUESTO',
        label: 'Repuestos',
      },
      {
        id: 'insumos',
        href: '/inventario?tipo=INSUMO',
        label: 'Insumos de Taller',
      },
    ],
  },
  {
    id: 'cotizaciones',
    href: '/cotizaciones',
    label: 'Cotizaciones y Facturación',
    roles: ['ADMINISTRADOR', 'RECEPCIONISTA'],
  },
  {
    id: 'usuarios-seguridad',
    href: '/usuarios',
    label: 'Usuarios y Roles',
    roles: ['ADMINISTRADOR'],
  },
  {
    id: 'auditoria',
    href: '/auditoria',
    label: 'Auditoría',
    roles: ['ADMINISTRADOR'],
  },
  {
    id: 'ajustes',
    href: '/ajustes',
    label: 'Ajustes',
    roles: ['ADMINISTRADOR'],
  },
];

export function getVisibleNavItems(rol: Rol): NavItemConfig[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(rol));
}

export function isRouteAllowed(pathname: string, rol: Rol): boolean {
  if (pathname === '/' || pathname === '/perfil') return true;
  const match = NAV_ITEMS.find((item) => item.href !== '/' && pathname.startsWith(item.href));
  if (!match) return true; // Rutas no listadas en sidebar (ej. perfil) se permiten si está autenticado
  return match.roles.includes(rol);
}

export function getActiveNavHref(pathname: string): string {
  if (pathname === '/') return '/';
  const match = NAV_ITEMS.find((item) => item.href !== '/' && pathname.startsWith(item.href));
  return match ? match.href : pathname;
}

export function getNombreRol(rol: Rol | string | null | undefined): string {
  if (rol === 'ADMINISTRADOR') return 'Administrador';
  if (rol === 'RECEPCIONISTA') return 'Asesor de Servicios';
  if (rol === 'MECANICO') return 'Mecánico';
  return rol || 'Sin Rol';
}

