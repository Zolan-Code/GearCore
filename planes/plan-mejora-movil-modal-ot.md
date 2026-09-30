# Plan de Mejora Móvil: Modal de Gestión de Orden de Trabajo (Ficha Integral OT)

## 1. Diagnóstico y Objetivo (Enfoque Ponytail)

### Problemas Detectados en Móvil (≤ 640px)
1. **Footer gigante apilado (~170px de altura):** Los botones `Completar Diagnóstico`, `WhatsApp`, `Cerrar` y `Guardar Cambios` se apilan en hasta 3 filas descoordinadas, tapando más del 30% del área visible de la pantalla e impidiendo ver los campos de trabajo sin scroll forzado.
2. **Stepper de ciclo de vida roto:** La cuadrícula de 7 estados se divide forzosamente en `repeat(4, 1fr)`, dejando una fila incompleta de 3 elementos con textos mutilados ("En Reparación", "Control Calidad") y consumiendo ~120px verticales.
3. **Dropdown de Repuestos colapsado:** Al buscar repuestos o insumos, la fila `.itemResultRow` colapsa horizontalmente; los títulos largos de productos colisionan y se superponen con las columnas de stock y precio.
4. **Pestañas superiores largas:** Los títulos "1. Diagnóstico & Reparación", "2. Repuestos & Insumos", "3. Ficha & Recepción" desbordan el ancho del teléfono.
5. **Espacio desperdiciado en bordes:** El modal flota como tarjeta con márgenes exteriores de 8px en lugar de comportarse como una vista de pantalla completa nativa (`100dvh`).

### La Solución Perezosa y Robusta (/ponytail)
- **Cero cambios al flujo de negocio:** Se conservan intactas todas las mutaciones (actualizar OT, registrar horas, asignar repuestos, cambio de estado, WhatsApp).
- **CSS-First:** El 90% de las mejoras se resuelven refinando las media queries de `ordenes-trabajo.module.css`.
- **Garantía Escritorio:** Todo cambio está encapsulado en `@media (max-width: 640px)`. La vista de escritorio (`> 768px`) permanece **100% idéntica** en estética y funcionalidad.

---

## 2. Cambios Propuestos por Archivo

### Archivo 1: `frontend/app/components/ordenes-trabajo.module.css`

1. **Modal Fullscreen Nativo en Móvil (`≤ 640px`):**
   - `.modalOverlay`: `padding: 0;`
   - `.modalContentLarge`: `height: 100dvh; max-height: 100dvh; border-radius: 0; border: none;`
   - Permite que el operario del taller use el 100% de la pantalla táctil de su teléfono.

2. **Footer Compacto en 2 Filas Eficientes:**
   - Rediseño de `.modalFooter` en móvil:
     - **Fila 1:** Botón de avance de estado (`.btnNextStep`, 100% ancho, altura táctil 40px).
     - **Fila 2:** Contenedor en grid/flex:
       - `Guardar Cambios` (botón principal destacado).
       - `WhatsApp` (botón compacto con icono).
       - `Cerrar` (botón secundario neutro).
   - **Resultado:** Altura del footer reducida de 170px a ~85px. Se liberan casi 100px para el cuerpo del diagnóstico.

3. **Stepper Lineal Compacto en Móvil:**
   - En `≤ 640px`: ocultar la cuadrícula pesada de 7 botones (`display: none`).
   - Mostrar una barra de progreso continua moderna:
     - `height: 6px; border-radius: 3px; background: var(--bg-subtle)`
     - Relleno activo: `background: #10b981; width: calc((pasoActual / 7) * 100%)`
   - Pasa de ocupar 120px verticales a solo 26px.

4. **Dropdown de Repuestos Responsive en 2 Niveles:**
   - En `≤ 640px`, `.itemResultRow` cambia de flex horizontal apretado a estructura de 2 líneas:
     - **Línea superior:** SKU badge + Nombre completo del artículo (ancho completo, legible).
     - **Línea inferior:** Badge `Repuesto / Insumo` · `Stock: X uds` · `$Precio CLP`.
   - Cero solapamiento de textos o números.

5. **Pestañas Móviles Táctiles:**
   - Ocultar textos largos en favor de etiquetas concisas en móvil:
     - `1. Diagnóstico`
     - `2. Repuestos` (+ badge contador)
     - `3. Ficha`

---

### Archivo 2: `frontend/app/components/OrdenesTrabajoView.tsx`

1. **Pestañas:** Agregar spans adaptables para texto desktop (`.tabLabelDesktop`) y móvil (`.tabLabelMobile`), o texto conciso.
2. **Barra de Progreso Móvil:** Renderizar la barra lineal de paso actual para pantallas táctiles.
3. **Reorganización semántica del footer:** Agrupar los botones de acción secundaria (`WhatsApp`, `Cerrar`, `Guardar`) en un contenedor coherente que fluya limpiamente tanto en desktop como en móvil.

---

### Archivo 3: `frontend/test/ordenes-modal-movil.spec.ts`

- Test de verificación automatizada:
  - Validar reglas CSS de footer compacto, fullscreen 100dvh y dropdown responsive en `ordenes-trabajo.module.css`.
  - Asegurar que la suite general de tests continúe en 100% pasando (cero regresiones).

---

## 3. Plan de Verificación

1. **Desktop (> 768px):** Abrir modal de OT y comprobar que el header, las 3 pestañas completas, el stepper de 7 bloques y el footer mantengan exactamente el diseño original.
2. **Móvil (360px–420px):**
   - Modal ocupa toda la pantalla del teléfono sin desbordes.
   - Pestañas legibles y accesibles con el pulgar.
   - Stepper consume mínima altura vertical.
   - Footer no tapa el contenido; permite leer la falla y el diagnóstico.
   - Al buscar repuestos, la lista desplegable es 100% legible y no colisiona con el precio ni con el stock.
