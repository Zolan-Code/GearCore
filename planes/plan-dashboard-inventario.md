# Plan de Adaptación: Dashboard Consistente con Inventario Dual (Repuestos e Insumos)

## 1. Diagnóstico y Objetivo (Enfoque Ponytail)
Con la separación del inventario en **Repuestos**, **Insumos de Taller** e **Inventario General**, el Dashboard principal (`/`) aún presenta referencias mono-catálogo:
1. **Tarjeta 4 de Resumen ("Inventario Operativo"):**
   - Muestra "Top repuestos en OT" y un campo genérico "Clientes Registrados: Activo".
   - Enlaza únicamente a `/inventario` con el texto "Ver Catálogo de Repuestos".
2. **Ranking de Movimientos ("Repuestos Más Utilizados en Reparaciones"):**
   - Agrupa ítems de OTs sin distinguir si lo consumido fue un repuesto mecánico o un insumo de taller (químicos, aceites, consumibles).
   - Al hacer clic, redirige a `/inventario?search=...` sin especificar `tipo=TODOS`, arriesgando búsquedas inconsistentes si el usuario estaba filtrando otra categoría.
3. **Backend (`dashboard.service.ts`):**
   - En la consulta del ranking `detalleOTRepuesto`, no incluye el campo `tipo` del ítem en el `select`.

**La Solución Perezosa (y Óptima - /ponytail):**
- Cero tablas nuevas, cero endpoints adicionales.
- Reutilizar el hook `useRepuestos()` que ya reside en caché de TanStack Query (iniciado por el layout) para mostrar en la tarjeta de resumen las cifras exactas de Repuestos, Insumos y alertas críticas sin costo de red.
- Agregar `tipo: true` en el `select` del backend para etiquetar con un badge sutil (`Repuesto` vs `Insumo`) los ítems del ranking.
- Ofrecer accesos directos al Inventario General (`/inventario?tipo=TODOS`), Repuestos (`/inventario?tipo=REPUESTO`) e Insumos (`/inventario?tipo=INSUMO`).

---

## 2. Cambios Propuestos por Archivo

### Archivo 1: Backend (`backend/src/dashboard/dashboard.service.ts`)
- **Diff mínimo (3 líneas):**
  - En la consulta `detalleOTRepuesto.findMany`:
    ```ts
    repuesto: {
      select: {
        id: true,
        codigo: true,
        nombre: true,
        tipo: true, // <-- Nuevo campo discriminador
        stock: true,
        precioVenta: true,
      }
    }
    ```
  - En la construcción del mapa de ranking: propagar `tipo: d.repuesto.tipo || 'REPUESTO'`.
- **Resultado:** El endpoint `/dashboard/metricas` entrega el tipo de cada artículo sin sobrecarga.

### Archivo 2: Tipos Frontend (`frontend/hooks/dashboard/useDashboardMetricas.ts`)
- **Diff mínimo (1 línea):**
  - Extender la interfaz `rankingRepuestos`:
    ```ts
    rankingRepuestos: Array<{
      id: string;
      codigo: string;
      nombre: string;
      tipo?: 'REPUESTO' | 'INSUMO'; // <-- Nuevo
      cantidad: number;
      totalGenerado: number;
    }>;
    ```

### Archivo 3: Vista Principal del Dashboard (`frontend/app/(dashboard)/page.tsx`)
1. **Tarjeta 4 de Métricas ("Inventario de Taller"):**
   - Consumir `const { data: inventarioData } = useRepuestos();` (Instantáneo, lee del caché de TanStack Query ya poblado por el layout).
   - Calcular en memoria (O(N) trivial):
     - `conteoRepuestos = items.filter(i => i.tipo !== 'INSUMO').length`
     - `conteoInsumos = items.filter(i => i.tipo === 'INSUMO').length`
     - `criticos = items.filter(i => i.stock <= (i.stockMinimo ?? 5)).length`
   - Reemplazar las filas estáticas por:
     - **Repuestos:** X disponibles
     - **Insumos:** Y consumibles
     - **Estado Stock:** Alerta si hay críticos / "Niveles Óptimos"
   - Footer con botones de acceso rápido:
     - Enlace principal: `Inventario General →` (`/inventario?tipo=TODOS`)
     - Enlaces secundarios compactos: `Repuestos` (`/inventario?tipo=REPUESTO`) | `Insumos` (`/inventario?tipo=INSUMO`)

2. **Panel "Artículos Más Utilizados en Reparaciones":**
   - Actualizar título: de *"Repuestos Más Utilizados"* a *"Repuestos e Insumos Más Utilizados"*.
   - Enlace superior: apuntar a `/inventario?tipo=TODOS`.
   - En cada fila del ranking:
     - Mostrar un micro-badge: `Repuesto` (azul/gris sutil) o `Insumo` (verde/ámbar sutil).
     - Al hacer clic, navegar a `/inventario?tipo=TODOS&search=${item.codigo}` para garantizar que el buscador siempre encuentre el ítem sin importar la categoría.

### Archivo 4: Notificaciones de Barra Superior (`frontend/app/(dashboard)/layout.tsx`)
- Actualizar el enlace de la alerta de stock crítico a `/inventario?tipo=TODOS&stockBajo=true` (o `/inventario?tipo=TODOS`).

---

## 3. Plan de Verificación y Pruebas
1. **Tests unitarios:**
   - Crear o extender spec en `frontend/test/dashboard-inventario.spec.ts` verificando:
     - Detección y renderizado de enlaces a `tipo=TODOS`, `tipo=REPUESTO`, `tipo=INSUMO` desde el Dashboard.
     - Presencia de micro-badges de tipo en el ranking.
   - Ejecutar `npm test` en `frontend/` asegurando 100% de tests passing (63+ tests).
2. **Compilación TypeScript:**
   - `npx tsc --noEmit` en `backend/` y `frontend/` sin errores de tipado.
3. **Comprobación funcional en dev:**
   - Cargar Dashboard con ambos servidores activos y verificar que los números cuadren exactamente con las pantallas de Repuestos e Insumos.
