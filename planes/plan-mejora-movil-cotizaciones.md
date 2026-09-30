# Plan de Mejora Móvil: Cotizaciones y Facturación (/ponytail)

## 1. Diagnóstico y Objetivo (Enfoque Ponytail)

### Problemas Detectados en Móvil (≤ 640px / Pantallas 375px–414px)
1. **Tarjetas KPI apiladas verticalmente (~600px de altura):** Las 4 tarjetas de resumen ("Cotizaciones emitidas", "Aprobadas por cliente", "Monto total aprobado", "Margen neto taller") se muestran en 1 columna debido a `minmax(220px, 1fr)`. El usuario debe hacer dos scrolls completos solo para superar los números iniciales y ver la lista.
2. **Tabla con scroll horizontal de 8 columnas:** `DataTable` cae por defecto en `<table>` de escritorio al no tener definida la prop `renderCard`. Columnas como Total, IVA, Margen, Estado y botones de acción quedan fuera de la pantalla requiriendo deslizamiento lateral incómodo.
3. **Pestañas de estado apretadas:** Los botones de filtro rápido (`Todas`, `Borrador`, `Enviadas`, `Aprobadas`, `Rechazadas`) requieren scroll horizontal suave sin desbordar el contenedor.
4. **Modales de creación y edición desproporcionados:** Formularios con márgenes fijos que pueden recortar campos en pantallas pequeñas si no se adaptan al viewport dinámico (`100dvh`).

### La Solución Perezosa y Robusta (/ponytail)
- **Reutilización directa de infraestructura existente (Rung 2 del Ladder):** `DataTable` ya incluye soporte nativo para tarjetas móviles mediante la prop `renderCard`. Al proveerla en `CotizacionesView.tsx`, `DataTable` oculta automáticamente la tabla en `< 768px` y dibuja tarjetas táctiles manteniendo búsqueda, paginación y filtros activos sin agregar librerías ni reescribir lógica.
- **Grilla KPI 2×2 compacta:** Con CSS puro (`grid-template-columns: repeat(2, 1fr)` en `≤ 640px`), las 4 métricas se condensan a ~150px de altura vertical, permitiendo ver el inicio de la lista de cotizaciones de inmediato.
- **Garantía Escritorio:** 100% de los cambios aislados en `@media (max-width: 640px)` y en la rama responsiva de `DataTable`. La vista de escritorio (`> 768px`) se mantiene **100% idéntica**.

---

## 2. Cambios Propuestos por Archivo

### Archivo 1: `frontend/app/components/cotizaciones.module.css`
1. **KPIs en Rejilla 2×2 Compacta (`≤ 640px`):**
   - `.kpisGrid`: `grid-template-columns: repeat(2, 1fr); gap: 0.5rem;`
   - `.kpiCard`: `padding: 0.75rem; border-radius: 10px; gap: 0.25rem;`
   - `.kpiValue`: `font-size: 1.25rem;`
   - `.kpiHeader span`: `font-size: 0.7rem;`
   - `.kpiDetail`: `font-size: 0.65rem;` (o línea única concisa).
   - **Resultado:** Reducción de ~600px a ~150px de altura total para el bloque métrico.

2. **Estilos para Tarjetas Móviles `.cotizacionCard` (`≤ 768px`):**
   - Tarjeta interactiva táctil con elevación suave y feedback `:active`.
   - **Encabezado:** Badge de Folio (`COT-XXXXX`), estado comercial con color semántico, e ID de OT (`#OT-XXXX`).
   - **Cuerpo:**
     - Nombre del cliente y vehículo (marca, modelo, patente).
     - Fila de importes: Monto Total destacado en negrita y badge de Margen Neto Taller (solo administradores).
   - **Pie:** Botón de descarga de PDF comercial y botón/indicador de edición o visualización de detalle.

3. **Pestañas Táctiles:**
   - `.tabsGroup`: `overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 4px;`
   - Botones con `white-space: nowrap;` y padding cómodo para dedos.

4. **Modales de Edición y Creación Fullscreen Móvil (`≤ 640px`):**
   - Modal adaptado a `height: 100dvh; max-height: 100dvh; border-radius: 0; padding: 0 !important;` en pantallas reducidas.
   - **Tabla de partidas con scroll horizontal seguro:** Contenedor `.modalTableWrapper` con `overflow-x: auto; -webkit-overflow-scrolling: touch;` y `min-width: 480px` en `<table>` para que la columna Subtotal nunca se corte.
   - **Panel de Rentabilidad Interna 2×2:** `.profitGrid` pasa a 2 columnas con tipografía compacta, reduciendo 60% su altura vertical.
   - **Grillas de inputs adaptables:** `.formGrid2Col` y `.formGrid3Col` pasan de columnas fijas a 1 columna en teléfonos pequeños (`≤ 640px`).

---

### Archivo 2: `frontend/app/components/CotizacionesView.tsx`
1. **Inyección de `renderCard` en `<DataTable<Cotizacion>>`:**
   - Definir función `renderCard={(c) => ...}`:
     - Header con folio `COT-XXXXX`, badge de estado (`Borrador`, `Aprobada`, etc.), y enlace/referencia a la OT.
     - Bloque de cliente y vehículo (`patente`, `modelo`).
     - Importe total en `$ CLP` y margen de rentabilidad si el usuario es `ADMINISTRADOR`.
     - Acciones rápidas: botón PDF con indicador de carga (`descargandoPdfId`) y toque de tarjeta para abrir detalle/edición `handleAbrirEdicion(c)`.
2. **Adopción de `.modalTableWrapper` y `.formGrid2Col` / `.formGrid3Col`** en los modales de detalle/edición y creación.

---

### Archivo 3: `frontend/test/cotizaciones-movil.spec.ts`
- Test automatizado:
  - Verificar presencia de prop `renderCard` en `CotizacionesView.tsx`.
  - Verificar reglas responsivas `@media (max-width: 640px)` en `cotizaciones.module.css` (2x2 kpis, `.cotizacionCard`).
  - Asegurar compilación TypeScript limpia (`npx tsc --noEmit`) y 100% de la suite de tests pasando.

---

## 3. Plan de Verificación

1. **Escritorio (> 768px):**
   - Revisar que la vista de cotizaciones mantenga sus 4 KPIs horizontales, la tabla de 8 columnas completa, ordenamiento de columnas, y botones de acción.
2. **Móvil (375px - iPhone SE / 390px - iPhone 14):**
   - Las 4 KPIs caben en una cuadrícula compacta 2x2 sin forzar scroll excesivo.
   - La tabla se transforma automáticamente en tarjetas legibles con toda la información crítica visible sin scroll horizontal.
   - El botón de descargar PDF funciona desde la tarjeta móvil.
   - Al tocar la tarjeta se abre la edición/detalle de la cotización.
3. **Suite de pruebas:**
   - Ejecutar `node --experimental-strip-types --test "test/**/*.spec.ts"` en `frontend/` y validar 82/82 tests pasando.
