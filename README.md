# GearCore

> **ERP Web Progresivo (PWA) para talleres mecánicos independientes.**

GearCore es una plataforma integral diseñada para modernizar y digitalizar la gestión operativa, técnica y administrativa de talleres mecánicos, optimizando el ciclo de vida de las órdenes de trabajo, control de inventario con afectación atómica de stock, emisión de cotizaciones con cálculo de margen comercial, trazabilidad por auditoría y gestión de clientes y vehículos.

---

## Módulos del Sistema

| Módulo | Ruta Frontend | Requerimientos | Descripción |
| :--- | :--- | :--- | :--- |
| **Panel de Control (Dashboard)** | `/` | BI / Métricas | Resumen operativo en tiempo real, accesos rápidos, alertas y control de jornada. |
| **Clientes y Vehículos** | `/clientes` | RF-01 a RF-05 | Directorio de clientes con RUT chileno, catálogo de vehículos por patente, kilometraje y fichas completas. |
| **Órdenes de Trabajo (OT)** | `/ordenes` | RF-06 a RF-12 | Ciclo de vida de 7 estados (`RECIBIDO` a `ENTREGADO`), checklist de recepción, diagnóstico, horas-hombre, fotos y WhatsApp. |
| **Inventario de Repuestos** | `/inventario` | RF-13 a RF-17 | Catálogo con SKU, precio de costo y venta, control de stock mínimo con alertas críticas y kardex de movimientos. |
| **Cotizaciones y Facturación** | `/cotizaciones` | RF-18 a RF-21 | Emisión de presupuestos, márgenes comerciales, generación de PDF oficial con PDFKit y conversión directa a OT. |
| **Usuarios y Roles** | `/usuarios` | RF-26 a RF-29 | Control de acceso basado en roles (RBAC), cambio de roles en caliente e interruptor interactivo ON/OFF de cuentas. |
| **Auditoría** | `/auditoria` | RNF / Seguridad | Registro inmutable de eventos críticos, creación de usuarios, cambios de estado y modificaciones del sistema. |
| **Ajustes del Taller** | `/ajustes` | Configuración | Datos corporativos (nombre, RUT, dirección, logo), IVA por defecto y vigencia de presupuestos. |
| **Mi Perfil** | `/perfil` | Autenticación | Consulta de credenciales activas, rol del operador y cierre de sesión seguro. |

---

## Stack Tecnológico

### Frontend
- **Framework**: [Next.js 14](https://nextjs.org/) (App Router) con React 18 y TypeScript estricto.
- **Gestión de Estado y Servidor**: [TanStack Query v5](https://tanstack.com/query) con caché reactivo, revalidaciones en segundo plano e invalidación granular por mutación.
- **Componente Global de Datos**: `DataTable` con búsqueda reactiva, reordenamiento y visibilidad de columnas por arrastre, ordenamiento tipado, filtros por columna y persistencia en `localStorage`.
- **Navegación y Layout**: Barra superior global (AppBar) con estado de conexión en línea, usuario activo, rol, fecha dinámica y centro de notificaciones; barra lateral colapsable con guardias de ruta.
- **Estilos**: CSS Modules con diseño corporativo de alta gama, variables tipográficas y micro-animaciones sin librerías externas pesadas.
- **PWA**: Preparado para instalación progresiva y modo offline (IndexedDB + Service Workers).

### Backend
- **Framework**: [NestJS 10](https://nestjs.com/) (Node.js) con TypeScript y arquitectura modular limpia.
- **Persistencia**: [Prisma ORM 5](https://www.prisma.io/) conectado a PostgreSQL.
- **Autenticación**: [Supabase Auth](https://supabase.com/auth) mediante validación criptográfica de JSON Web Tokens (JWT) vía SDK oficial de Supabase.
- **Autorización**: Control de acceso granular (RBAC) con `SupabaseAuthGuard` y `RolesGuard` en cada endpoint de negocio.
- **Generación de Documentos**: [PDFKit](https://pdfkit.org/) para la emisión de cotizaciones formales descargables.

---

## Estructura del Repositorio

```text
gearcore/
├── GEMINI.md                   # Contexto de arquitectura, principios SOLID y directrices
├── README.md                   # Documentación técnica general
├── .gitignore                  # Reglas de exclusión seguras (credenciales, logs, builds)
│
├── backend/                    # API REST NestJS
│   ├── prisma/
│   │   ├── schema.prisma       # Modelado relacional completo
│   │   └── migrations/         # Historial de migraciones SQL
│   ├── src/
│   │   ├── ajustes/            # Configuración corporativa del taller
│   │   ├── auditoria/          # Servicio de log inmutable de auditoría
│   │   ├── auth/               # Guards de Supabase JWT y RolesGuard (RBAC)
│   │   ├── clientes/           # Gestión de clientes y validadores de RUT
│   │   ├── cotizaciones/       # Cotizaciones, cálculo de márgenes y exportación PDF
│   │   ├── ordenes-trabajo/    # Lógica de OTs, asignaciones y notificaciones WhatsApp
│   │   ├── perfil/             # Información del usuario autenticado
│   │   ├── prisma/             # PrismaService y ciclo de vida de conexión
│   │   ├── repuestos/          # Control de inventario y movimientos de stock
│   │   ├── usuarios/           # Gestión de cuentas y asignación de roles
│   │   ├── vehiculos/          # Vehículos vinculados a clientes y validación de patente
│   │   ├── app.module.ts       # Módulo raíz
│   │   └── main.ts             # Entrada del servidor (prefijo /api, CORS, validación)
│   ├── .env.example
│   └── package.json
│
└── frontend/                   # Cliente web Next.js
    ├── app/
    │   ├── (dashboard)/        # Layout protegido con AppBar (modo oscuro, notificaciones) y Sidebar
    │   │   ├── clientes/       # Vista de Clientes y Vehículos con DataTable
    │   │   ├── ordenes/        # Vista de Órdenes de Trabajo y seguimiento técnico
    │   │   ├── inventario/     # Vista de Inventario con DataTable
    │   │   ├── cotizaciones/   # Vista de Cotizaciones con DataTable
    │   │   ├── usuarios/       # Vista de Usuarios con DataTable y switch ON/OFF
    │   │   ├── auditoria/      # Vista de Auditoría con DataTable
    │   │   ├── ajustes/        # Formulario de configuración del taller
    │   │   └── perfil/         # Perfil del operador conectado
    │   ├── components/         # Componentes reutilizables (DataTable, modales, vistas)
    │   ├── context/            # Contextos nativos (ThemeContext con persistencia y detección de sistema)
    │   ├── login/              # Pantalla de autenticación Supabase
    │   └── providers.tsx       # Providers de TanStack Query y ThemeProvider
    ├── hooks/                  # Hooks desacoplados por dominio (React Query)
    ├── lib/                    # Cliente de Supabase y cliente fetchWithAuth
    ├── test/                   # Suite de pruebas unitarias automatizadas (Node.js test runner)
    ├── .env.local.example
    └── package.json
```

---

## Matriz de Roles y Autorización (RBAC)

Los roles del sistema están definidos en el enum `RolUsuario` de Prisma y vinculados a la tabla `perfiles` (asociada 1 a 1 con `auth.users` de Supabase):

| Módulo / Acción | ADMINISTRADOR | RECEPCIONISTA | MECANICO |
| :--- | :---: | :---: | :---: |
| **Panel de Control** | Completo | Operativo | Solo técnico |
| **Clientes y Vehículos** | Total | Total | Solo lectura |
| **Órdenes de Trabajo** | Total | Total | Solo asignadas |
| **Inventario de Repuestos** | Total (Costos y Precios) | Lectura / Venta | Consulta técnica |
| **Cotizaciones y Facturación** | Total (Márgenes visibles) | Creación (Sin costos) | Denegado |
| **Usuarios y Roles** | Total | Denegado | Denegado |
| **Auditoría del Taller** | Total | Denegado | Denegado |
| **Ajustes del Taller** | Total | Denegado | Denegado |

---

## Puesta en Marcha Local

### Prerrequisitos
- **Node.js**: versión 20.x o superior
- **npm**: versión 10.x o superior
- Proyecto activo en **Supabase** (PostgreSQL + Supabase Auth)

---

### 1. Clonar el repositorio

```bash
git clone https://github.com/Zolan-Code/GearCore.git
cd GearCore
```

---

### 2. Configuración de Variables de Entorno

#### Backend (`backend/.env`):
Copia la plantilla y completa las credenciales de tu proyecto Supabase:
```bash
cp backend/.env.example backend/.env
```
Contenido requerido:
```env
DATABASE_URL="postgresql://postgres.[REF]:PASSWORD@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[REF]:PASSWORD@aws-0-[REGION].pooler.supabase.com:5432/postgres"
SUPABASE_URL="https://[REF].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key"
PORT=3001
```

#### Frontend (`frontend/.env.local`):
Copia la plantilla para la aplicación web:
```bash
cp frontend/.env.local.example frontend/.env.local
```
Contenido requerido:
```env
NEXT_PUBLIC_SUPABASE_URL="https://[REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="tu-anon-key"
NEXT_PUBLIC_API_URL="http://localhost:3001/api"
```

---

### 3. Instalación de Dependencias

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

---

### 4. Base de Datos y Generación de Tipos

Desde la carpeta `backend/`:
```bash
# Aplicar migraciones a la base de datos
npx prisma migrate deploy

# Generar cliente tipado de Prisma
npx prisma generate
```

---

### 5. Ejecución en Entorno de Desarrollo

Abre dos terminales independientes en la raíz del proyecto:

**Terminal 1 — Backend (NestJS):**
```bash
cd backend
npm run start:dev
```
> API disponible en: `http://localhost:3001/api`

**Terminal 2 — Frontend (Next.js):**
```bash
cd frontend
npm run dev
```
> Aplicación web disponible en: `http://localhost:3000`

---

## Pruebas y Control de Calidad

### Pruebas Automatizadas del Frontend
El proyecto cuenta con una suite completa de pruebas unitarias y de integración de rutas utilizando el test runner nativo de Node.js:

```bash
cd frontend
npm test
```

### Verificación Estricta de Tipos (TypeScript)
Para asegurar que no existan errores de tipado en compilación:

```bash
# Frontend
cd frontend
npx tsc --noEmit

# Backend
cd backend
npx nest build
```

---

## Reglas de Arquitectura

1. **Protección de Endpoints**: Todo endpoint de negocio en NestJS debe llevar `@UseGuards(SupabaseAuthGuard, RolesGuard)` y el decorador `@Roles(...)`.
2. **Acceso a Datos**: Exclusivamente mediante Prisma ORM para garantizar consultas tipadas y transacciones atómicas seguras.
3. **Cero Secretos en Cliente**: Los márgenes de costo y llaves de servicio de Supabase nunca se exponen al frontend.
4. **Manejo de Estado**: Se prohíbe el uso de `fetch` directo en componentes; toda interacción con la API debe realizarse mediante hooks de TanStack Query ubicados en `frontend/hooks/`.
5. **Modo Oscuro y Ergonomía Visual**: Paleta de alto contraste para entornos de taller (`[data-theme="dark"]`), soporte de `color-scheme: dark`, persistencia en `localStorage` y prevención de destello (anti-FOUT) sin dependencias externas.
