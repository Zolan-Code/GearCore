# Plan de Implementación: División de Inventario (Repuestos e Insumos) con Submenú Lateral

## 1. Contexto y Diagnóstico
Actualmente, el sistema gestiona un único catálogo bajo el modelo `Repuesto`, sin diferenciar entre piezas de recambio para vehículos (bujías, frenos, filtros) y consumibles/insumos de uso interno en taller (paños de limpieza, desengrasantes, lijas, guantes).

Siguiendo el principio de máxima eficiencia (**Ponytail** / anti-sobreingeniería):
- **NO** crearemos tablas duplicadas ni controladores separados.
- Se agregará un único discriminador `tipo` al modelo existente.
- Se reutilizará la misma pantalla de inventario [`InventarioView.tsx`](file:///c:/Users/Benjamin/Desktop/Tesis/GearCore/frontend/app/components/InventarioView.tsx) parametrizada por URL (`?tipo=REPUESTO` vs `?tipo=INSUMO`).
- Se implementará un submenú colapsable en el Sidebar con estética moderna (estilo línea vertical conector), tal como en la referencia visual.

---

## 2. Cambios Arquitectónicos Detallados

### Fase 1: Base de Datos y Migración (Prisma)
1. **Archivo:** `backend/prisma/schema.prisma`
   - Definir enum:
     ```prisma
     enum TipoItemInventario {
       REPUESTO
       INSUMO
     }
     ```
   - Agregar campo al modelo `Repuesto`:
     ```prisma
     tipo TipoItemInventario @default(REPUESTO)
     ```
2. **Migración:**
   - Ejecutar `prisma migrate dev` (o `prisma db push` según el entorno Supabase).
   - Todos los ítems existentes quedan automáticamente asignados como `REPUESTO` (cero pérdida de datos y retrocompatibilidad total).

---

### Fase 2: Backend (NestJS REST API)
1. **DTOs (`backend/src/repuestos/dto/`):**
   - `crear-repuesto.dto.ts`: Agregar propiedad opcional `tipo?: TipoItemInventario` con decoradores `@IsOptional() @IsEnum(TipoItemInventario)`.
   - `actualizar-repuesto.dto.ts`: Hereda o incluye `tipo?: TipoItemInventario`.
2. **Controlador (`backend/src/repuestos/repuestos.controller.ts`):**
   - En el endpoint `GET /repuestos`, recibir `@Query('tipo') tipo?: TipoItemInventario`.
3. **Servicio (`backend/src/repuestos/repuestos.service.ts`):**
   - En `listar({ busqueda, stockBajo, tipo })`:
     - Incluir condición `tipo ? { tipo } : {}` en el filtro `where` de Prisma.
   - En `crear`: persistir el campo `tipo` recibido (o `REPUESTO` por defecto).
   - En `importarMasivo`: permitir columna opcional `TIPO` en CSV.

---

### Fase 3: Navegación y Sidebar Desplegable (Frontend)
1. **Archivo:** `frontend/app/(dashboard)/navConfig.ts`
   - Extender la interfaz `NavItemConfig` para soportar sub-ítems:
     ```ts
     export interface NavSubItemConfig {
       id: string;
       href: string;
       label: string;
     }
     export interface NavItemConfig {
       ...
       children?: NavSubItemConfig[];
     }
     ```
   - Configurar `NAV_ITEMS`:
     ```ts
     {
       id: 'inventario',
       href: '/inventario',
       label: 'Inventario',
       roles: ['ADMINISTRADOR', 'RECEPCIONISTA', 'MECANICO'],
       children: [
         { id: 'repuestos', href: '/inventario?tipo=REPUESTO', label: 'Repuestos' },
         { id: 'insumos', href: '/inventario?tipo=INSUMO', label: 'Insumos de Taller' },
       ],
     }
     ```
2. **Archivo:** `frontend/app/(dashboard)/layout.tsx` y `page.module.css`:
   - Renderizar el ítem padre con indicador de expansión (chevron `v` rotatorio).
   - Detectar si la ruta actual o el query param corresponden al módulo de inventario para auto-expandir el menú.
   - Renderizar la lista de sub-ítems con la guía visual vertical y estado activo independiente (`activeDot` o estilo destacado).
   - Manejar el comportamiento tanto en modo expandido como colapsado (rail flotante o tooltip).

---

### Fase 4: Vista Unificada de Inventario (Frontend)
1. **Hook:** `frontend/hooks/repuestos/useRepuestos.ts`
   - Permitir pasar parámetro `tipo` en `useRepuestos(filtro?: { busqueda?: string; stockBajo?: boolean; tipo?: string })`.
2. **Componente:** `frontend/app/components/InventarioView.tsx`
   - Leer `searchParams.get('tipo')` mediante `useSearchParams()`.
   - **Títulos y encabezados contextuales:**
     - Si `tipo === 'INSUMO'`: "Inventario de Insumos de Taller" — *Control de insumos de limpieza, herramientas menores, lubricantes de taller y consumibles operativos.*
     - Si `tipo === 'REPUESTO'`: "Inventario de Repuestos" — *Control de stock de repuestos vehiculares, alertas de reposición y trazabilidad.*
     - Si no se especifica: "Inventario General (Repuestos e Insumos)".
   - **Formulario de Creación / Edición:**
     - Agregar selector desplegable:
       - `Repuesto Vehicular (Facturable a OT)`
       - `Insumo de Taller (Consumible operativo)`
     - Si se está en la vista filtrada por insumos, preseleccionar automáticamente `Insumo de Taller`.
   - **Columna en DataTable:**
     - Mostrar tag/badge `Repuesto` o `Insumo` en la tabla para rápida identificación visual.
   - **KPIs superiores:**
     - Calcular conteo y valor monetario según el filtro activo (valor de insumos vs valor de repuestos).

---

## 3. Plan de Verificación y Testing
1. **Compilación y Linters:**
   - `npx tsc --noEmit` en backend y frontend.
2. **Suite de Tests Existente:**
   - Ejecutar `npm test` en frontend para certificar que los 58 tests actuales continúan en verde (incluyendo `inventario-route.spec.ts`).
3. **Nuevas Pruebas:**
   - Crear test específico para validar la navegación con submenú y la persistencia del tipo en inventario.
4. **Verificación en Navegador:**
   - Comprobar apertura y cierre del submenú en el Sidebar.
   - Navegación hacia `/inventario?tipo=REPUESTO` y `/inventario?tipo=INSUMO`.
   - Crear un insumo (ej. "Paños de microfibra") y un repuesto (ej. "Pastillas de freno").
   - Validar que cada uno aparezca exclusivamente en su vista filtrada.
   - Validar compatibilidad total con Modo Oscuro y Modo Claro.
