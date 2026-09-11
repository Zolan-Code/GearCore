# GearCore

> **ERP Web Progresivo (PWA) para talleres mecánicos independientes.**

GearCore es una solución integral diseñada para modernizar la gestión operativa de talleres mecánicos, optimizando el ciclo de vida de las órdenes de trabajo, control de inventario, cotizaciones y seguimiento de vehículos.

---

## Stack Tecnológico

| Capa | Tecnología | Descripción |
| :--- | :--- | :--- |
| **Frontend** | [Next.js 14](https://nextjs.org/) (App Router) + React 18 | TypeScript, soporte PWA, arquitectura basada en componentes |
| **Backend** | [NestJS 10](https://nestjs.com/) | REST API modular en Node.js con TypeScript y arquitectura limpia |
| **Base de Datos** | [PostgreSQL](https://www.postgresql.org/) (vía [Supabase](https://supabase.com/)) | Persistencia relacional con pool de conexiones (Supavisor) |
| **ORM** | [Prisma 5](https://www.prisma.io/) | Modelado de datos, migraciones tipadas y consultas seguras |
| **Autenticación** | [Supabase Auth](https://supabase.com/auth) | Flujo JWT (sin almacenamiento de credenciales en backend) |
| **Autorización** | RBAC nativo | Roles `ADMINISTRADOR`, `RECEPCIONISTA`, `MECANICO` con Guards en NestJS |

---

## Estructura del Repositorio

```text
gearcore/
├── GEMINI.md               # Contexto, principios SOLID y reglas para agentes de desarrollo
├── README.md               # Documentación general del proyecto
├── .gitignore              # Configuración de exclusión para Git
├── backend/                # API REST NestJS
│   ├── prisma/             # Modelos y migraciones de base de datos (schema.prisma)
│   ├── src/
│   │   ├── auth/           # Guards de Supabase JWT y autorización por roles (RBAC)
│   │   ├── prisma/         # Servicio global de conexión PrismaClient
│   │   ├── app.module.ts   # Módulo raíz de NestJS
│   │   └── main.ts         # Punto de entrada de la API (prefijo /api, CORS)
│   ├── .env.example        # Plantilla de variables de entorno del backend
│   └── package.json
└── frontend/               # Aplicación cliente Next.js PWA
    ├── app/                # Rutas y páginas (App Router: layout, home, login)
    ├── lib/                # Cliente inicializado de Supabase
    ├── public/             # Assets estáticos y manifest.json (PWA)
    ├── .env.local.example  # Plantilla de variables de entorno del frontend
    └── package.json
```

---

## Roles y Permisos (RBAC)

Los roles están definidos en el enum `RolUsuario` y vinculados a la tabla `perfiles` (1:1 con `auth.users` de Supabase):

- **ADMINISTRADOR**: Acceso total a configuración, usuarios, finanzas, métricas y operaciones.
- **RECEPCIONISTA**: Gestión de clientes, recepción de vehículos, cotizaciones y creación de órdenes de trabajo (OT).
- **MECANICO**: Visualización y actualización del avance técnico en las órdenes de trabajo asignadas.

---

## Puesta en Marcha Local

### Prerrequisitos
- **Node.js**: v20 o superior
- **npm**: v10 o superior
- Proyecto activo en **Supabase** (PostgreSQL + Auth)

---

### 1. Clonar el repositorio

```bash
git clone https://github.com/Zolan-Code/GearCore.git
cd GearCore
```

---

### 2. Configurar Variables de Entorno

#### Backend (`backend/.env`):
Copia la plantilla:
```bash
cp backend/.env.example backend/.env
```
Completa los valores obtenidos de tu panel de Supabase (*Project Settings*):
```env
# Puerto 6543 (Transaction mode pooler)
DATABASE_URL="postgresql://postgres.[REF]:PASSWORD@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Puerto 5432 (Session mode pooler para migraciones)
DIRECT_URL="postgresql://postgres.[REF]:PASSWORD@aws-0-[REGION].pooler.supabase.com:5432/postgres"

SUPABASE_URL="https://[REF].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key"
SUPABASE_JWT_SECRET="tu-jwt-secret"
PORT=3001
```

#### Frontend (`frontend/.env.local`):
Copia la plantilla:
```bash
cp frontend/.env.local.example frontend/.env.local
```
Completa los valores:
```env
NEXT_PUBLIC_SUPABASE_URL="https://[REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="tu-anon-key"
NEXT_PUBLIC_API_URL="http://localhost:3001/api"
```

---

### 3. Instalar Dependencias

```bash
# Instalar en backend
cd backend
npm install

# Instalar en frontend
cd ../frontend
npm install
```

---

### 4. Base de Datos y Migraciones

Desde la carpeta `backend/`:
```bash
# Aplicar migraciones a Supabase
npx prisma migrate deploy

# Generar cliente tipado de Prisma
npx prisma generate
```

---

### 5. Ejecutar en Modo Desarrollo

Abre dos terminales:

**Terminal 1 — Backend (NestJS):**
```bash
cd backend
npm run start:dev
```
> Servidor disponible en: `http://localhost:3001/api`

**Terminal 2 — Frontend (Next.js):**
```bash
cd frontend
npm run dev
```
> Aplicación web disponible en: `http://localhost:3000`

---

## Convenciones de Desarrollo

- **Reglas del Proyecto**: Consulta [`GEMINI.md`](./GEMINI.md) antes de comenzar cualquier módulo nuevo.
- **Nomenclatura**: Nombres en español para entidades de dominio (`Cliente`, `Vehiculo`, `OrdenTrabajo`), en inglés para infraestructura (`Controller`, `Service`, `Module`, `Guard`).
- **Control de Acceso**: Todo endpoint de negocio en NestJS debe protegerse con `@UseGuards(SupabaseAuthGuard, RolesGuard)` y el decorador `@Roles(...)`.
- **Acceso a Datos**: Exclusivamente a través de Prisma ORM.
