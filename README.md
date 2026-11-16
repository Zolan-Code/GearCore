# GearCore

> **ERP Web Progresivo (PWA) de Alto Rendimiento para Talleres Mecánicos Independientes.**

GearCore es una plataforma integral de nivel empresarial diseñada para modernizar, digitalizar y optimizar la gestión operativa, técnica y administrativa de talleres mecánicos automotrices. Cubre el ciclo de vida completo del servicio: recepción de vehículos con inspección visual e interactiva de daños en carrocería, decodificación automatizada de VIN, órdenes de trabajo (OT) con seguimiento de estados y horas-hombre, inventario dual de repuestos e insumos de taller, cotizaciones formales con cálculo de rentabilidad según principios SOLID, generación de documentos PDF profesionales, notificaciones directas por WhatsApp, trazabilidad inmutable por auditoría y un panel de Business Intelligence (BI) con reportes ejecutivos.

Diseñado bajo un enfoque **Mobile-First**, ergonómico para uso rudo en taller mediante tablets o smartphones, con soporte de modo oscuro de alto contraste y preparado para instalarse como PWA.

---

## Módulos del Sistema

| Módulo | Ruta Frontend | Requerimientos | Descripción |
| :--- | :--- | :--- | :--- |
| **Panel de Control (Dashboard)** | `/` | BI / Métricas | Business Intelligence en tiempo real: KPIs operativos y financieros, embudo de OTs, órdenes y repuestos recientes interactivos, filtros por fecha y descarga de **informe ejecutivo en PDF**. |
| **Clientes y Vehículos** | `/clientes` | RF-01 a RF-05 | Directorio de clientes con validación estricta de RUT chileno, catálogo de vehículos por patente, kilometraje, ficha técnica y **decodificador automático de VIN (NHTSA vPIC)**. |
| **Órdenes de Trabajo (OT)** | `/ordenes` | RF-06 a RF-12 | Ciclo de vida de 7 estados (`RECIBIDO` a `ENTREGADO`), **inspección interactiva de daños en carrocería en 5 perspectivas**, imputación de horas-hombre, asignación diferenciada de repuestos vs insumos de taller y mensajería editable por **WhatsApp**. |
| **Inventario de Repuestos e Insumos** | `/inventario` | RF-13 a RF-17 | Catálogo dual categorizado (Repuestos vs. Insumos de taller), control de SKU, precio de costo/venta, kardex de movimientos atómicos, alertas críticas de stock mínimo y personalización de vistas. |
| **Cotizaciones y Facturación** | `/cotizaciones` | RF-18 a RF-21 | Emisión de presupuestos, snapshots inmutables de precios, cálculo de margen neto y rentabilidad mediante estrategia SOLID, emisión de **PDF oficial membretado con PDFKit** y conversión directa a OT. |
| **Usuarios y Roles** | `/usuarios` | RF-26 a RF-29 | Control de acceso basado en roles (RBAC: Administrador, Asesor de Servicios, Mecánico), auditoría de accesos y switch interactivo ON/OFF para activación/bloqueo instantáneo de cuentas. |
| **Auditoría del Taller** | `/auditoria` | RNF / Seguridad | Registro inmutable de eventos críticos, creación/modificación de usuarios, transiciones de estado de OTs y ajustes de configuración. |
| **Ajustes del Taller** | `/ajustes` | Configuración | Parámetros corporativos singleton: razón social, RUT, dirección, teléfono, IVA dinámico, días de vigencia de cotizaciones y plantilla personalizable de mensajes WhatsApp. |
| **Mi Perfil** | `/perfil` | Autenticación | Consulta de credenciales activas, rol del operador, actualización de datos de perfil y cambio de contraseña con validación de clave actual en Supabase Auth. |

---

## Novedades y Avances Recientes

1. **Inspección Visual e Interactiva de Carrocería:**
   - Mapeo interactivo de daños (abolladuras, rayones, roturas, pintura) sobre siluetas automotrices en 5 perspectivas (frontal, lateral derecha, lateral izquierda, trasera y superior).
   - Generación de reportes gráficos y compatibilidad con interfaces táctiles (`100dvh` y touch targets ampliados para tablets y teléfonos).

2. **Decodificador Inteligente de VIN (NHTSA vPIC API):**
   - Autocompletado instantáneo y gratuito de marca, modelo, año y características técnicas al ingresar el número de chasis (VIN) en la ficha del vehículo.

3. **Inventario Dual (Repuestos vs. Insumos de Taller):**
   - Segmentación clara entre partes reemplazables para clientes (repuestos) y fluidos/materiales de taller consumibles (insumos: lubricantes, refrigerantes, líquidos de freno).
   - Menú de navegación rápida con filtros tipados (`TODOS`, `REPUESTO`, `INSUMO`), alertas de stock mínimo con badges de severidad y protección de costos para mecánicos.

4. **Dashboard de Business Intelligence e Informe Ejecutivo en PDF:**
   - Métricas financieras y operativas adaptativas según el rol conectado.
   - Generador de informe ejecutivo consolidado en PDF con gráficos vectoriales y desglose contable mediante PDFKit en el backend.

5. **Experiencia Móvil de Primer Nivel (Mobile-First UI):**
   - Transformación de tablas en tarjetas táctiles interactivas en pantallas menores a 768px, eliminando desplazamientos horizontales incómodos.
   - Modales ergonómicos en pantalla completa (`100dvh`), navegación rápida y eliminación de zonas de toque pequeñas.

6. **Componente Global `DataTable` de Alto Rendimiento:**
   - Búsqueda reactiva, filtros dinámicos por columna, ordenamiento tipado ascendente/descendente.
   - Guardado y restauración de presets de columnas personalizadas por nombre en `localStorage`.
   - Skeletons animados de carga, click en fila para inspección rápida y exportación CSV con codificación UTF-8 compatible con Microsoft Excel.

7. **Modo Oscuro Ergonómico y Anti-FOUT:**
   - Soporte nativo de tema oscuro/claro con tokens HSL de alto contraste adaptados para ambientes de poca luz o talleres, persistencia en almacenamiento local y sincronización con preferencias del sistema operativo.

8. **Suite de Pruebas Automatizadas:**
   - 87 pruebas unitarias e integrales 100% pasando utilizando el test runner nativo de Node.js, cubriendo navegación RBAC, lógica de negocio de OTs, inspección de carrocería, datatable y diseño móvil.

---

## Stack Tecnológico

### Frontend
- **Framework**: [Next.js 14](https://nextjs.org/) (App Router) con React 18 y TypeScript estricto.
- **Gestión de Estado y Servidor**: [TanStack Query v5](https://tanstack.com/query) con caché reactivo, revalidación en segundo plano e invalidación granular por mutación (staleTime 60s).
- **Componente Global de Datos**: `DataTable` con ordenamiento tipado, selección de columnas, búsqueda, presets con nombre y vista alternativa en tarjetas para móviles.
- **Navegación y Layout**: Barra superior global (AppBar) con fecha dinámica, usuario activo, rol y centro de notificaciones; Sidebar colapsable en modo Rail (72px) con tooltips flotantes.
- **Inspección Visual**: Siluetas automotrices vectoriales y marcado de coordenadas de impacto en tiempo real.
- **Estilos**: CSS Modules puros de alto rendimiento, micro-animaciones fluidas sin frameworks pesados, tokenización semántica y modo oscuro (`[data-theme="dark"]`).
- **PWA**: Manifest para instalación progresiva. El modo offline (IndexedDB + Service Workers) queda como trabajo futuro.

### Backend
- **Framework**: [NestJS 10](https://nestjs.com/) (Node.js) con TypeScript y arquitectura modular basada en principios SOLID.
- **Persistencia**: [Prisma ORM 5](https://www.prisma.io/) conectado a PostgreSQL en Supabase.
- **Autenticación**: [Supabase Auth](https://supabase.com/auth) mediante validación criptográfica de tokens JWT vía SDK oficial.
- **Autorización (RBAC)**: Control de acceso con `SupabaseAuthGuard` y `RolesGuard` en cada endpoint de negocio.
- **Generación de Documentos**: [PDFKit](https://pdfkit.org/) para cotizaciones formales descargables y reportes ejecutivos de Business Intelligence.
- **Integraciones Externas**: API NHTSA vPIC (decodificación de VIN) y enlace directo a WhatsApp Web/App para notificaciones al cliente.

---

## Estructura del Repositorio

```text
gearcore/
├── GEMINI.md                   # Contexto de arquitectura, principios SOLID y directrices
├── README.md                   # Documentación técnica general del proyecto
├── .gitignore                  # Reglas de exclusión seguras (credenciales, logs, builds)
├── planes/                     # Planes de diseño y requerimientos técnicos por módulo
│
├── backend/                    # API REST NestJS
│   ├── prisma/
│   │   ├── schema.prisma       # Modelado relacional completo (PostgreSQL)
│   │   └── migrations/         # Historial de migraciones SQL
│   ├── src/
│   │   ├── ajustes/            # Configuración corporativa del taller (Singleton)
│   │   ├── auditoria/          # Servicio de log inmutable de auditoría
│   │   ├── auth/               # Guards de Supabase JWT y RolesGuard (RBAC)
│   │   ├── clientes/           # Gestión de clientes y validación de RUT
│   │   ├── cotizaciones/       # Cotizaciones, cálculo de márgenes (SOLID) y PDF
│   │   ├── dashboard/          # Métricas BI adaptativas por rol y reporte ejecutivo PDF
│   │   ├── ordenes-trabajo/    # Lógica de OTs, inspección de daños, repuestos/insumos y WhatsApp
│   │   ├── perfil/             # Información del usuario autenticado y perfil
│   │   ├── prisma/             # PrismaService y ciclo de vida de conexión
│   │   ├── repuestos/          # Control de inventario dual (repuestos e insumos) y kardex
│   │   ├── usuarios/           # Gestión de cuentas y asignación de roles
│   │   ├── vehiculos/          # Vehículos, validación de patente y decodificador VIN (NHTSA)
│   │   ├── app.module.ts       # Módulo raíz de la aplicación
│   │   └── main.ts             # Entrypoint del servidor (/api, CORS, validación DTOs, 50mb limit)
│   ├── .env.example
│   └── package.json
│
└── frontend/                   # Cliente web Next.js (PWA)
    ├── app/
    │   ├── (dashboard)/        # Layout protegido con AppBar y Sidebar colapsable
    │   │   ├── page.tsx        # Dashboard / Panel de control con métricas e informes
    │   │   ├── clientes/       # Directorio de Clientes y Vehículos con DataTable
    │   │   ├── ordenes/        # Vista de Órdenes de Trabajo, pipeline y seguimiento técnico
    │   │   ├── inventario/     # Inventario dual con tabs (General, Repuestos, Insumos)
    │   │   ├── cotizaciones/   # Cotizaciones, cálculo de margen y generación PDF
    │   │   ├── usuarios/       # Administración de usuarios y roles con toggle ON/OFF
    │   │   ├── auditoria/      # Registro de eventos y auditoría del sistema
    │   │   ├── ajustes/        # Formulario de configuración corporativa del taller
    │   │   └── perfil/         # Ficha del operador conectado y cambio de clave
    │   ├── components/         # Componentes UI (DataTable, InspeccionCarroceriaModal, modales)
    │   ├── context/            # Contextos de React (ThemeContext con anti-FOUT)
    │   ├── login/              # Pantalla de autenticación Supabase con diseño pulido
    │   └── providers.tsx       # QueryClientProvider de TanStack Query y ThemeProvider
    ├── hooks/                  # Custom hooks desacoplados por dominio (React Query)
    ├── lib/                    # Cliente de Supabase, API helpers y validadores
    ├── public/                 # Assets estáticos, siluetas vehiculares y blueprints
    ├── test/                   # Suite de 87 pruebas automatizadas (Node.js test runner)
    ├── .env.local.example
    └── package.json
```

---

## Matriz de Roles y Autorización (RBAC)

Los roles del sistema están definidos en el enum `RolUsuario` de Prisma y vinculados a la tabla `perfiles` (asociada 1 a 1 con `auth.users` de Supabase):

> **Nota:** En la interfaz de usuario, el rol técnico `RECEPCIONISTA` se presenta como **Asesor de Servicios**, denominación estándar y moderna en la industria de talleres mecánicos.

| Módulo / Acción | ADMINISTRADOR | ASESOR DE SERVICIOS (`RECEPCIONISTA`) | MECÁNICO |
| :--- | :---: | :---: | :---: |
| **Panel de Control (Dashboard)** | Completo (Financiero + Operativo + PDF) | Operativo de Taller | Solo asignaciones técnicas |
| **Clientes y Vehículos** | Total (Crear, Editar, Eliminar) | Total (Crear, Editar, Consultar) | Solo lectura de ficha técnica |
| **Órdenes de Trabajo** | Total (Aprobación, Gestión, WhatsApp) | Total (Recepción, Asignación, WhatsApp) | Diagnóstico, Horas y OTs asignadas |
| **Inventario (Repuestos e Insumos)**| Total (Costos, Precios, Ajustes) | Gestión de stock y consulta de PVP | Consulta técnica (Costos ocultos) |
| **Cotizaciones y Facturación** | Total (Márgenes de ganancia visibles) | Creación y emisión (Sin ver costos) | Denegado |
| **Usuarios y Roles** | Total (Crear, Roles, Switch ON/OFF) | Denegado | Denegado |
| **Auditoría del Taller** | Total (Consulta inmutable) | Denegado | Denegado |
| **Ajustes del Taller** | Total (Edición de parámetros e IVA) | Denegado | Denegado |
| **Mi Perfil** | Propio (Datos y Contraseña) | Propio (Datos y Contraseña) | Propio (Datos y Contraseña) |

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
Variables clave:
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
Variables clave:
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
El proyecto cuenta con una suite completa de **87 pruebas unitarias e integrales** que validan el comportamiento de rutas, componentes, inspección de carrocería, RBAC y diseño móvil:

```bash
cd frontend
npm test
```
> Resultado esperado: `87 pass, 0 fail`

### Verificación Estricta de Tipos y Compilación (TypeScript)
Para asegurar que no existan errores de tipado o regresiones:

```bash
# Frontend (Next.js build & typecheck)
cd frontend
npm run build

# Backend (NestJS build)
cd backend
npm run build
```

---

## Reglas de Arquitectura

1. **Protección de Endpoints**: Todo endpoint de negocio en NestJS debe llevar `@UseGuards(SupabaseAuthGuard, RolesGuard)` y el decorador `@Roles(...)`.
2. **Acceso a Datos**: Exclusivamente mediante Prisma ORM para garantizar consultas tipadas y transacciones atómicas seguras.
3. **Cero Secretos en Cliente**: Los márgenes de costo, utilidades y llaves de servicio de Supabase nunca se exponen al frontend.
4. **Manejo de Estado con TanStack Query**: Prohibido el uso de `fetch` directo en componentes; toda interacción con la API debe realizarse mediante hooks ubicados en `frontend/hooks/<dominio>/`.
5. **Ergonomía Mobile-First**: Los componentes interactivos deben adaptarse a dispositivos táctiles con targets amplios (mínimo 44px) y vistas tipo tarjeta en pantallas reducidas.
6. **Modo Oscuro de Alto Contraste**: Paleta ergonómica para entornos de taller (`[data-theme="dark"]`), soporte de `color-scheme: dark`, persistencia en `localStorage` y prevención de destello (anti-FOUT) sin librerías externas.
