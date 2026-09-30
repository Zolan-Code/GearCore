# Plan de Mejora Móvil: Módulo de Inventario (/ponytail)

## 1. Diagnóstico y Objetivo (Enfoque Ponytail)

### Problemas Detectados en Móvil (≤ 640px / iPhone SE 375px–414px)
1. **Navegación engorrosa entre las 3 vistas:** El módulo está dividido en *Inventario General*, *Repuestos* e *Insumos de Taller*. En teléfonos, alternar entre ellas obliga al operario o recepcionista a pulsar el menú hamburguesa (`☰`), buscar *Inventario*, desplegar el submenú y elegir la subcategoría en cada ocasión.
2. **KPIs apilados en 1 columna vertical (~600px de altura):** En `inventario.module.css`, la media query móvil tiene forzado `grid-template-columns: 1fr;`. Las 4 tarjetas de stock ocupan 2 pantallas completas antes de que el usuario pueda ver o buscar un solo artículo.
3. **Tabla con scroll horizontal kilométrico:** `DataTable` cae en la tabla de escritorio de 8 columnas (Código, Repuesto/Insumo, Stock Actual, Stock Mínimo, P. Compra, P. Venta, Margen, Acciones). La mitad de los datos y los botones de acción quedan ocultos hacia la derecha.
4. **Herramientas de cabecera desbalanceadas:** Los botones "Exportar CSV" e "Importar CSV" compiten por espacio en pantallas angostas.

### La Solución Perezosa y Robusta (/ponytail)
- **Botonera de pestañas en la cabecera (Sin dependencias ni estado extra):** Agregar pestañas rápidas `[Inventario General] [Repuestos] [Insumos]` en la parte superior mediante enlaces nativos de Next.js (`next/link`). Permite cambiar de categoría con un solo toque del pulgar sin tocar la barra lateral.
- **Grilla KPI 2×2 compacta:** Cambiar `grid-template-columns: 1fr;` por `repeat(2, 1fr);` con padding optimizado. Reduce la altura total de ~600px a ~140px.
- **Tarjetas táctiles vía `renderCard` en `DataTable` (Reutilización de patrón existente):**
  - **Encabezado:** Badge de código SKU (`INS-001`), badge de tipo (`Insumo` / `Repuesto`) y estado de stock con semáforo de color (`Verde: Saludable`, `Amarillo: Crítico`, `Rojo: Agotado`).
  - **Cuerpo:** Nombre del producto, consumo histórico (`Usado en X OTs`), precio venta `$ CLP` y margen comercial.
  - **Pie:** Acciones rápidas con botones táctiles: **Ajuste rápido de stock (+ / -)**, historial de movimientos y edición.
- **Garantía Escritorio:** 100% de compatibilidad garantizada. La vista de escritorio (`> 768px`) con sus 8 columnas, submenús y 4 KPIs horizontales permanece **100% idéntica**.

---

## 2. Cambios Propuestos por Archivo

### Archivo 1: `frontend/app/components/inventario.module.css`
1. **Pestañas Rápidas de Tipo (`.tipoTabsGroup`):**
   - Contenedor con `overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none;`.
   - Botones tipo píldora interactiva con estado activo marcado.
2. **KPIs en 2×2 Móvil (`≤ 640px`):**
   - Reemplazar `grid-template-columns: 1fr;` por `grid-template-columns: repeat(2, 1fr); gap: 8px;`.
   - Ajustar padding interior a `10px 12px;`, tamaño de icono a `34px` y tipografía de valor a `1.15rem;`.
3. **Estilos para Tarjetas Móviles `.repuestoCard` (`≤ 768px`):**
   - `.repuestoCard`: Tarjeta táctil interactiva con feedback `:active`.
   - `.cardHeader`: Código SKU en tipografía monoespaciada, etiqueta de tipo y pastilla de stock.
   - `.cardBody`: Título del producto, métrica de uso en OTs, precio unitario de venta y margen.
   - `.cardFooter`: Botón de ajuste rápido de inventario (+ / -), botón de historial y botón de edición.
4. **Ajuste de Botones CSV en Móvil:**
   - Botones compactos en flex horizontal adaptable.
5. **Modal de Crear/Editar Repuesto Optimizado (`.rowCompactCols`):**
   - Campos numéricos cortos (Stock Mínimo + Stock Inicial, y Costo Compra + Precio Venta) en 2 columnas compactas en móvil.
   - Botones del footer con `flex: 1` balanceado y texto "Guardar Repuesto/Insumo" que nunca se trunca ni desborda.

---

### Archivo 2: `frontend/app/components/InventarioView.tsx`
1. **Importar `Link` desde `next/link`.**
2. **Renderizar barra de navegación por tipo (`General | Repuestos | Insumos`)** justo debajo del título o antes de los filtros.
3. **Inyectar `renderCard={(r) => ...}` en `<DataTable<Repuesto>>`:**
   - Renderizar la tarjeta móvil con datos esenciales y accesos directos (`abrirAjusteModal`, `abrirHistorial`, `abrirEditarModal`).
4. **Campos del formulario con `.rowCompactCols`:**
   - Etiquetas claras y concisas (*"Stock Mínimo *"*, *"Costo Compra *"*, *"Precio Venta (PVP) *"*) y reducción de altura total del diálogo al 50%.

---

### Archivo 3: `frontend/test/inventario-movil.spec.ts`
- Test automatizado:
  - Verificar presencia de prop `renderCard` en `InventarioView.tsx`.
  - Verificar presencia de pestañas rápidas de navegación (`/inventario?tipo=...`).
  - Verificar que `inventario.module.css` use `grid-template-columns: repeat(2, 1fr)` en móviles y defina `.repuestoCard`.
  - Validar suite de tests en 100% pasando.

---

## 3. Plan de Verificación

1. **Escritorio (> 768px):**
   - Navegar por `/inventario?tipo=TODOS`, `/inventario?tipo=REPUESTO` y `/inventario?tipo=INSUMO`.
   - Comprobar que la tabla completa con 8 columnas, ordenamiento y 4 KPIs apaisados siga 100% igual.
2. **Móvil (375px - iPhone SE / 390px - iPhone 14):**
   - Cambiar entre General, Repuestos e Insumos directamente desde las pestañas superiores sin abrir el sidebar.
   - Los 4 KPIs se leen en una cuadrícula compacta 2x2.
   - La tabla se transforma en tarjetas táctiles legibles.
   - El botón de Ajuste Rápido de Stock abre el diálogo de incremento/decremento desde la propia tarjeta móvil.
3. **Suite automatizada:**
   - Correr `npm test` en `frontend/` y validar que todos los tests pasen (83/83).
