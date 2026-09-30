# Plan de Mejora Móvil: Módulo de Clientes y Vehículos (/ponytail)

## 1. Diagnóstico y Objetivo (Enfoque Ponytail)

### Problemas Detectados en Móvil (≤ 640px / iPhone SE 375px–414px)
1. **Tabla con scroll horizontal:** El directorio de clientes se renderizaba como tabla de escritorio tradicional, cortando los campos de teléfono, email y acciones hacia la derecha.
2. **Espacio vertical desperdiciado en estado inicial:** La tarjeta de bienvenida (*"Consulta rápida de Vehículos"*) ocupaba ~200px de altura con padding y SVG sobredimensionados, empujando el directorio de clientes bajo el pliegue inicial.
3. **Especificaciones del vehículo apiladas:** En la ficha técnica del vehículo (`specsGrid`), las 4 especificaciones (Año, Kilometraje, VIN, Teléfono) estaban forzadas a `grid-template-columns: 1fr`, ocupando 4 filas verticales.
4. **Modales flotantes estrechos:** Los modales de *Ficha del Cliente*, *Nuevo Cliente* y *Nuevo Vehículo* flotaban en el centro con padding y márgenes que comprimían el contenido en teléfonos angostos.

### La Solución Perezosa y Robusta (/ponytail)
- **Tarjetas táctiles de cliente (`renderCard` en `DataTable`):** Reutilización del patrón nativo de `DataTable` ya usado en OTs, Inventario y Cotizaciones. Cada cliente se muestra como una tarjeta con nombre destacado, RUT en badge, contador de vehículos y enlace directo `tel:` para llamar con 1 toque.
- **Selector predictivo de cliente en modal Nuevo Vehículo (Opción 1):** Reemplazo del `<select>` tradicional por un buscador predictivo que filtra en tiempo real por Nombre o RUT, con chip de cliente fijado y botón para cambiar de cliente sin scroll infinito. Funciona tanto en móvil como en escritorio.
- **Grilla 2x2 en ficha técnica del vehículo:** `grid-template-columns: repeat(2, 1fr)` en `specsGrid` para leer las 4 especificaciones técnicas sin scroll excesivo.
- **Estado de consulta rápida compacto:** Reducción de padding de `36px` a `20px` y tamaño de SVG a `28px`.
- **Modales en pantalla completa (`100dvh`):** En `≤ 640px`, `.modalCard` pasa a `width: 100%; height: 100dvh; border-radius: 0;` con botones de acción `flex: 1`.

---

## 2. Archivos Modificados

1. **`frontend/app/components/ClientesVehiculosView.tsx`:**
   - Inyección de `renderCard={(c) => ...}` en `<DataTable<Cliente>>`.
   - Inclusión de llamada telefónica con `href="tel:..."` y `e.stopPropagation()`.
   - Uso de `minmax(0, 1fr)` en la grilla del modal de cliente.

2. **`frontend/app/components/clientes-vehiculos.module.css`:**
   - Estilos para `.clientCard`, `.clientPhoneLink`, `.clientCardHeader`, `.clientCardFooter`.
   - Breakpoint móvil `≤ 640px` optimizado: `specsGrid` 2x2, `emptyState` compacto y `modalCard` a `100dvh`.

3. **`frontend/test/clientes-movil.spec.ts`:**
   - Test unitario validando `renderCard`, llamada `tel:`, grilla 2x2 y `100dvh`.

---

## 3. Plan de Verificación

1. **Escritorio (> 768px):** Tabla tradicional de clientes de 5 columnas permanece 100% idéntica.
2. **Móvil (375px - iPhone SE / 390px - iPhone 14):**
   - Directorio de clientes se presenta en tarjetas táctiles legibles sin scroll horizontal.
   - Pulsar sobre el teléfono lanza la marcación nativa del smartphone.
   - La ficha técnica del vehículo muestra las 4 especificaciones en grilla 2x2 compacta.
   - Los modales abren en pantalla completa táctil sin franjas laterales.
3. **Suite automatizada:** 84 tests ejecutados exitosamente (`npm test`).
