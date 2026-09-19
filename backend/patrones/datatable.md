# Patrón Global: Componente DataTable Avanzado en GearCore

## 1. Contexto y Propósito

El componente global **`DataTable`** estandariza y centraliza la presentación, interacción y manipulación de datos tabulares en toda la plataforma GearCore. Cumple de forma nativa con las especificaciones del diseño editable (*mockup*) y las directrices de arquitectura del proyecto:

- **Búsqueda Global Reactiva**: Filtrado en tiempo real sobre todas las columnas de la tabla.
- **Filtros por Columna**: Popover flotante individual en cada encabezado con botón de limpieza y detección de filtros activos.
- **Ordenamiento (Sort) Tri-Estado**: Clic en cabecera con alternancia ascendente (`asc`), descendente (`desc`) y neutro (`null`), con soporte para orden alfabético en español (`localeCompare`), numérico y comparadores personalizados (`sortFn`).
- **Visibilidad y Reordenamiento de Columnas**: Menú desplegable con checkboxes para ocultar/mostrar columnas y controles dobles de reordenamiento (botones ▲/▼ en el menú y Drag & Drop nativo en los encabezados con `dragHandle`).
- **Persistencia de Layout en `localStorage`**: Botón condicional "Guardar layout" (solo activo cuando el layout ha sido modificado) y botón "Restablecer vista inicial" asociados a una clave única (`storageKey`).
- **Paginación Integrada**: Selector de filas por página (`10, 25, 50, 100`), conteo informativo dinámico y controles de navegación de página.
- **Estados de Interfaz Nativos**: Manejo visual consistente para estados de carga con spinner, alertas de error con botón de reintento (`onRetry`), y mensaje de tabla vacía con opción de limpiar filtros activos.
- **Cero Dependencias Externas**: Construido exclusivamente con HTML semántico nativo, CSS Modules y TypeScript estricto, sin librerías pesadas adicionales (como AG Grid o DataTables de jQuery).

### Ubicación de Archivos en el Repositorio
- **Componente**: `frontend/app/components/DataTable.tsx`
- **Estilos**: `frontend/app/components/data-table.module.css`
- **Pruebas Automatizadas**: `frontend/test/datatable.spec.ts`

---

## 2. Especificación de Props (API Contract)

### 2.1 Interfaz `Column<T>`

Representa la configuración de una columna individual dentro de la tabla:

```typescript
export interface Column<T> {
  id?: string;                               // Identificador único (opcional si accessor es string)
  key?: string;                              // Identificador alternativo
  header: React.ReactNode;                   // Encabezado visual de la columna
  accessor?: keyof T;                        // Propiedad del objeto a mostrar
  cell?: (row: T, index: number) => React.ReactNode; // Render custom de celda (prevalece sobre accessor)
  align?: 'left' | 'center' | 'right';       // Alineación horizontal (default: 'left')
  width?: string | number;                   // Ancho fijo o porcentual (ej. '120px', '25%')
  className?: string;                        // Clase CSS para el <td>
  headerClassName?: string;                  // Clase CSS para el <th>
  style?: React.CSSProperties;               // Estilos en línea para el <td>
  headerStyle?: React.CSSProperties;         // Estilos en línea para el <th>
  sortable?: boolean;                        // Si es ordenable (default: true si tiene accessor o sortFn)
  filterable?: boolean;                      // Si es filtrable (default: true si tiene accessor o filterFn)
  sortFn?: (a: T, b: T) => number;           // Comparador de ordenamiento personalizado opcional
  filterFn?: (row: T, filterValue: string) => boolean; // Filtro de coincidencia personalizado opcional
}
```

### 2.2 Interfaz `DataTableProps<T>`

Representa las propiedades de entrada para inicializar el componente:

```typescript
export interface DataTableProps<T> {
  columns: Column<T>[];                      // Definición de columnas
  data: T[];                                 // Arreglo de datos tipados
  keyExtractor: (row: T, index: number) => string | number; // Identificador único por fila
  storageKey?: string;                       // Clave de localStorage para guardar layout personalizado
  title?: string;                            // Título opcional
  searchPlaceholder?: string;                // Placeholder de búsqueda (default: 'Buscar en todos los registros...')
  enableSearch?: boolean;                    // Activar barra de búsqueda global (default: true)
  enableColumnVisibility?: boolean;          // Activar menú de columnas visibles/orden (default: true)
  enablePagination?: boolean;                // Activar paginación inferior (default: true)
  defaultPageSize?: number;                  // Filas iniciales por página (default: 10)
  pageSizeOptions?: number[];                // Opciones de paginación (default: [10, 25, 50, 100])
  loading?: boolean;                         // Estado de carga (isLoading de TanStack Query)
  loadingMessage?: string;                   // Mensaje de carga (default: 'Cargando registros...')
  error?: Error | null | unknown;            // Error capturado (isError de TanStack Query)
  errorMessage?: string;                     // Mensaje de error personalizado
  onRetry?: () => void;                      // Función de reintento vinculada a refetch()
  emptyMessage?: string;                     // Mensaje si no hay registros
  emptyIcon?: React.ReactNode;               // Icono para estado vacío
  className?: string;                        // Clase CSS exterior del wrapper
  tableClassName?: string;                   // Clase CSS del elemento <table>
  rowClassName?: (row: T, index: number) => string; // Clase CSS dinámica por fila
  onRowClick?: (row: T, index: number) => void;     // Callback opcional al pulsar una fila
  actions?: React.ReactNode;                 // Botones extra en la barra de herramientas (ej. "+ Nuevo...")
  footer?: React.ReactNode;                  // Pie de tabla adicional opcional
  sort?: { id: string; direction: 'asc' | 'desc' } | null; // Estado de ordenamiento controlado (backend)
  onSortChange?: (sort: { id: string; direction: 'asc' | 'desc' }) => void; // Callback al hacer click en cabecera sortable
}
```

---

## 3. Mecánicas y Características Clave

### 3.1 Persistencia de Layout en `localStorage`
- Al definir `storageKey`, la tabla lee al montarse la configuración guardada (orden de columnas, columnas visibles y tamaño de página).
- Si el usuario modifica columnas o paginación, el botón **"Guardar layout"** aparece automáticamente (`isLayoutDirty`).
- Al guardar, emite retroalimentación visual inmediata ("¡Layout guardado!") durante 1.8 segundos y persiste el JSON en el navegador.
- El botón con icono de papelera / **"Restablecer vista inicial"** limpia la clave en `localStorage` y regresa la tabla a su estado de fábrica.

### 3.2 Búsqueda Global y Filtros por Columna Acumulativos
- La búsqueda global inspecciona todas las columnas visibles y no visibles (accesores y comparadores).
- Cada cabecera puede desplegar un popover con input de texto focalizado automáticamente.
- Cuando hay un filtro activo, el icono de embudo se resalta visualmente en azul (`#2563eb`).
- Los filtros se combinan mediante una intersección lógica `AND`. Una fila debe cumplir tanto la búsqueda general como todos los filtros de columna aplicados.
- Si se aplican filtros, la tabla muestra una barra informativa con el total de coincidencias y un botón de un clic para **"Limpiar búsqueda y filtros"**.

### 3.3 Ordenamiento en Backend y Frontend (Iconos Mockup)
- **Iconografía con Doble Chevron Reactivo**:
  - Se mantiene siempre el indicador de doble flecha vertical (`ChevronsUpDown`).
  - Al ordenar en forma ascendente (`asc`), la flecha superior cambia al color activo (`currentColor` / `#1e1b4b`) y la inferior se atenúa (`#cbd5e1`).
  - Al ordenar en forma descendente (`desc`), la flecha inferior cambia al color activo y la superior se atenúa.
  - Cuando la columna no está ordenada, ambas flechas permanecen en tono neutro (`#94a3b8`).
- **Alternancia de 2 estados (`asc` <-> `desc`)**: Cada clic en una cabecera conmuta directamente entre ascendente y descendente (comenzando por `asc` en una nueva columna).
- **Ordenamiento a Nivel de Backend (Server-side)**:
  - Cuando se provee `onSortChange`, `DataTable` **omite el ordenamiento en memoria** y delega la responsabilidad al backend.
  - La vista envía `sortBy` y `sortOrder` en los query params a la API de NestJS (ej. `/api/usuarios?sortBy=nombre&sortOrder=asc`).
  - Prisma en el backend aplica `orderBy: { [columna]: sortOrder }`.
  - Si `onSortChange` no se provee, `DataTable` realiza el ordenamiento local en memoria de manera transparente.

### 3.4 Reordenamiento de Columnas Dual
1. **Visual en popover**: Botones ▲ y ▼ para mover columnas arriba o abajo de forma precisa y accesible.
2. **Arrastre directo en tabla (Drag & Drop)**: El usuario puede arrastrar cualquier cabecera mediante el `dragHandle` y soltarla sobre otra posición.

### 3.5 Integración Obligatoria con TanStack Query
Siguiendo las reglas de [`GEMINI.md`](./GEMINI.md), `DataTable` se enlaza directamente con los estados del hook de TanStack Query:
- `loading={isLoading}` (distinguiendo primera carga de revalidaciones en segundo plano).
- `error={isError ? error : null}`.
- `onRetry={() => refetch()}`.

---

## 4. Ejemplos Reales de Implementación en GearCore

### 4.1 Ejemplo 1: Directorio de Usuarios (`UsuariosSeguridadView.tsx`)

Muestra el uso de celdas compuestas (`cell`), selectores interactivos embebidos, badges de estado y botones de acción por fila:

```tsx
import DataTable from './DataTable';
import { useUsuarios, useActualizarRolUsuario, useToggleEstadoUsuario } from '@/hooks/usuarios/useUsuarios';

export default function UsuariosTable() {
  const { data: usuarios = [], isLoading, isError, error, refetch } = useUsuarios();
  const { mutate: actualizarRol, isPending: actualizandoRol } = useActualizarRolUsuario();
  const { mutate: toggleEstado, isPending: alternandoEstado } = useToggleEstadoUsuario();

  return (
    <DataTable<Usuario>
      data={usuarios}
      keyExtractor={(u) => u.id}
      storageKey="usuarios-table-layout"
      searchPlaceholder="Buscar por nombre, correo o rol..."
      sort={sortUsuarios}
      onSortChange={setSortUsuarios}
      loading={isLoading}
      loadingMessage="Cargando usuarios..."
      error={isError ? error : null}
      errorMessage="Error al cargar la lista de usuarios."
      onRetry={() => refetch()}
      emptyMessage="No se encontraron usuarios coincidentes."
      columns={[
        {
          header: 'Usuario',
          cell: (u) => {
            const initial = (u.nombre || u.email || 'U').charAt(0).toUpperCase();
            return (
              <div className={styles.userCell}>
                <div className={styles.userAvatar}>{initial}</div>
                <div>
                  <p className={styles.userName}>{u.nombre}</p>
                  <p className={styles.userEmail}>{u.email}</p>
                </div>
              </div>
            );
          },
        },
        {
          header: 'Rol en Sistema',
          cell: (u) => (
            <select
              value={u.rol}
              disabled={actualizandoRol}
              onChange={(e) => actualizarRol({ id: u.id, rol: e.target.value as Rol })}
              className={styles.roleSelect}
            >
              <option value="ADMINISTRADOR">ADMINISTRADOR</option>
              <option value="RECEPCIONISTA">RECEPCIONISTA</option>
              <option value="MECANICO">MECANICO</option>
            </select>
          ),
        },
        {
          header: 'Estado',
          cell: (u) => (
            <span className={u.activo ? styles.statusActive : styles.statusInactive}>
              {u.activo ? 'Activo' : 'Suspendido'}
            </span>
          ),
        },
        {
          header: 'OTs Asignadas',
          accessor: 'ordenesAsignadas',
          cell: (u) => <strong>{u._count?.ordenesAsignadas || 0}</strong>,
        },
        {
          header: 'Fecha Registro',
          accessor: 'creadoEn',
          cell: (u) =>
            new Date(u.creadoEn).toLocaleDateString('es-CL', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            }),
        },
        {
          header: 'Acciones',
          align: 'right',
          sortable: false,
          filterable: false,
          cell: (u) => (
            <button
              type="button"
              disabled={alternandoEstado}
              onClick={() => toggleEstado(u.id)}
              className={u.activo ? styles.btnDeactivate : styles.btnActivate}
            >
              {u.activo ? 'Desactivar' : 'Reactivar'}
            </button>
          ),
        },
      ]}
    />
  );
}
```

### 4.2 Ejemplo 2: Registro de Auditoría (`UsuariosSeguridadView.tsx`)

Demuestra el uso de formateo de fecha con hora, badges condicionales de severidad y visualización compacta:

```tsx
<DataTable<RegistroAuditoria>
  data={auditorias}
  keyExtractor={(a) => a.id}
  storageKey="auditoria-table-layout"
  searchPlaceholder="Buscar por acción, autor, entidad o detalles..."
  loading={loadingAuditoria}
  loadingMessage="Cargando registros de auditoría..."
  error={errorAuditoria ? errAuditoria : null}
  onRetry={() => refetchAuditoria()}
  emptyMessage="No hay registros de auditoría aún."
  columns={[
    {
      header: 'Fecha / Hora',
      accessor: 'creadoEn',
      cell: (a) => (
        <span>
          {new Date(a.creadoEn).toLocaleString('es-CL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
    {
      header: 'Acción Crítica',
      accessor: 'accion',
      cell: (a) => renderAuditBadge(a.accion),
    },
    {
      header: 'Autor',
      cell: (a) => (
        <div>
          <strong>{a.usuario ? a.usuario.nombre : 'Sistema'}</strong>
          {a.usuario && <small>[{a.usuario.rol}]</small>}
        </div>
      ),
    },
    {
      header: 'Entidad / Módulo',
      accessor: 'entidad',
      cell: (a) => <code>{a.entidad}</code>,
    },
    {
      header: 'Detalles del Evento',
      accessor: 'detalles',
    },
  ]}
/>
```

---

## 5. Guía de Adopción para Nuevos Módulos

Al construir o refactorizar vistas de tabla (Cotizaciones, Inventario de Repuestos, Clientes y Vehículos):

1. **Importar el componente**:
   ```tsx
   import DataTable, { Column } from '@/app/components/DataTable';
   ```
2. **Definir una clave de almacenamiento única (`storageKey`)**:
   - Usar el formato estándar: `<modulo>-table-layout` (ej. `cotizaciones-table-layout`, `inventario-table-layout`).
3. **Identificador único por fila (`keyExtractor`)**:
   - Siempre proveer una función que retorne un identificador estable: `keyExtractor={(item) => item.id}`.
4. **Columnas no ordenables / no filtrables**:
   - Para columnas de botones o acciones compuestas, marcar explícitamente `sortable: false` y `filterable: false`.
5. **Alineación de números y acciones**:
   - Utilizar `align: 'right'` para columnas monetarias, cantidades numéricas y botones de acción en el extremo derecho.
6. **Integración con TanStack Query**:
   - Pasar `loading={isLoading}`, `error={isError ? error : null}` y `onRetry={() => refetch()}`.
