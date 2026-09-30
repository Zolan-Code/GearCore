# Plan de Mejora Móvil: Módulo Órdenes de Trabajo (OT)

## 1. Diagnóstico y Objetivo (Enfoque Ponytail)

### Problema Actual
En pantallas móviles (`≤ 768px`, ancho estándar de smartphones ~360px–420px):
1. **Desbordamiento horizontal en tabla:** La tabla principal de Órdenes de Trabajo contiene 9 columnas (`OT #`, `Patente`, `Vehículo`, `Cliente`, `Mecánico`, `Motivo / Falla`, `Horas`, `Estado`, `Acciones`). En móvil se visualizan únicamente 2 columnas y media, forzando un incómodo desplazamiento horizontal en un entorno operativo de taller mecánico (PWA).
2. **Saturación en Barra de Herramientas:** Los botones "Columnas (9/9)" y "Vistas guardadas" saturan el ancho disponible en móvil, cuando en un teléfono nadie reordena columnas de tabla.

### La Solución Perezosa y Robusta (/ponytail)
- **Cero duplicación de lógica:** No crear un componente nuevo de listado móvil aislado ni reimplementar filtros, paginación o búsqueda en memoria.
- **Extensión nativa en `DataTable` mediante prop opcional `renderCard`:**
  - Si un módulo provee `renderCard`, en pantallas móviles (`≤ 768px`) la tabla estándar se oculta y se renderiza automáticamente una lista de tarjetas optimizadas para tacto.
  - En pantallas de escritorio (`> 768px`), la tabla tradicional de 9 columnas se mantiene **100% intacta**, sin alteraciones visuales ni de funcionalidad.
- **Limpieza de Toolbar móvil:** Ocultar selectores irrelevantes en móvil ("Columnas" y "Vistas guardadas") vía CSS (`display: none` en `@media (max-width: 640px)`).

---

## 2. Cambios Propuestos por Archivo

### Archivo 1: `frontend/app/components/DataTable.tsx`
- **Nueva prop opcional:**
  ```ts
  renderCard?: (item: T, index: number) => React.ReactNode;
  ```
- **Markup condicional:**
  Debajo de `<div className={styles.tableContainer}>`, si `renderCard` está definido:
  ```tsx
  {renderCard && (
    <div className={styles.mobileCardsContainer}>
      {paginatedData.map((item, idx) => (
        <div key={keyExtractor(item, idx)} className={styles.mobileCardWrapper}>
          {renderCard(item, idx)}
        </div>
      ))}
    </div>
  )}
  ```
- **Ventaja:** La paginación, conteo de registros, buscador textual y estados de carga (`loading`, `error`, `emptyMessage`) son compartidos automáticamente entre la tabla desktop y las tarjetas móviles.

### Archivo 2: `frontend/app/components/data-table.module.css`
- **Estilos de conmutación Responsive:**
  - `.mobileCardsContainer`: En desktop (`> 768px`) siempre tiene `display: none !important;`.
  - En `@media (max-width: 768px)`:
    - Cuando el contenedor tiene tarjetas móviles activas (`.wrapperWithCards`), `.tableContainer` pasa a `display: none !important;` y `.mobileCardsContainer` pasa a `display: flex; flex-direction: column; gap: 10px; padding: 12px;`.
    - Ocultar botones de gestión de columnas y presets en móvil (`.columnVisibilityWrapper`, `.savedLayoutWrapper`).
- **Garantía Escritorio:** `> 768px` no recibe ninguna regla de alteración sobre `.tableContainer` ni `.table`.

### Archivo 3: `frontend/app/components/OrdenesTrabajoView.tsx`
- **Inyección de `renderCard` en `<DataTable<OrdenTrabajo>>`:**
  Proveer un renderizado limpio, ergonómico y con contraste de taller mecánico:
  1. **Header de Tarjeta:**
     - Patente destacada con badge de bandera chilena (`plateBadge`).
     - Badge de estado con color semántico (`RECIBIDO`, `EN_REPARACION`, `APROBADO`, etc.).
     - Código corto `#OT`.
  2. **Cuerpo de Tarjeta:**
     - Vehículo: Marca, Modelo, Año y Kilometraje de recepción.
     - Cliente: Nombre y enlace directo para llamada/WhatsApp (si el rol no es mecánico).
     - Falla reportada: Texto legible a 2 líneas máx. con `text-overflow: ellipsis`.
  3. **Footer de Tarjeta:**
     - Mecánico asignado con icono de herramienta.
     - Contador de horas hombre registradas (`{ot.horasHombre || 0}h`).
     - Botón de acción táctil "Gestionar →".
  4. **Interacción:**
     - Tocar cualquier parte de la tarjeta ejecuta `abrirGestionOT(ot, 'tecnico')`, manteniendo idéntico comportamiento a `onRowClick` de la tabla de escritorio.

### Archivo 4: `frontend/app/components/ordenes-trabajo.module.css`
- **Estilos de tarjeta móvil:**
  - `.otCard`: Fondo `var(--bg-surface)`, bordes suaves `var(--border-color)`, hover y active states con feedback háptico visual.
  - Tipografía y espaciados pensados para pulgares (botones de al menos 40px de altura táctil).

---

## 3. Plan de Verificación

1. **Prueba de No-Regresión en Escritorio:**
   - Cargar `/ordenes-trabajo` en resolución estándar (1920x1080 / 1440x900).
   - Verificar que la tabla de 9 columnas, reordenamiento arrastrable, filtros por columna, selección de mecánico y botón "Nueva OT" sigan exactamente iguales.
2. **Prueba en Emulador Móvil (Chrome DevTools / Vista iPhone / Android 375px–412px):**
   - Verificar que no exista scroll horizontal en la página de OTs.
   - Confirmar que la búsqueda en tiempo real filtre las tarjetas instantáneamente.
   - Confirmar que las pestañas de estado ("Todas", "Recibido", "Diagnóstico", etc.) filtren las tarjetas.
   - Confirmar que el selector de mecánico filtre las tarjetas.
   - Tocar una tarjeta y validar que abra correctamente el modal de gestión técnica / inspección.
