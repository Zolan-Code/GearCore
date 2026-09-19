# Hand-off Técnico: Módulo de Órdenes de Trabajo (OT)

## 1. Propósito y Alcance del Módulo

El módulo de **Órdenes de Trabajo (OT)** es el núcleo operativo de GearCore. Centraliza el ciclo de vida completo de un vehículo dentro del taller mecánico, desde la recepción física y registro del estado de ingreso, hasta el diagnóstico técnico, la cotización comercial, la asignación de repuestos, el registro de horas-hombre invertidas y la entrega final al cliente con trazabilidad completa.

### Requerimientos Funcionales Cubiertos
- **RF-06 (Recepción y Checklist de Ingreso)**: Creación de la OT vinculada a un vehículo/cliente con registro de kilometraje, nivel de combustible, estado de carrocería y accesorios dejados.
- **RF-07 (Ciclo de Vida y Estados de OT)**: Transición controlada a través de las 7 etapas del taller (`RECIBIDO`, `DIAGNOSTICO`, `COTIZACION`, `APROBADO`, `EN_REPARACION`, `CONTROL_CALIDAD`, `ENTREGADO`).
- **RF-08 (Diagnóstico Técnico y Bitácora)**: Registro de hallazgos del mecánico, trabajos ejecutados y registro incremental de horas-hombre.
- **RF-09 (Registro Fotográfico)**: Carga y compresión en cliente de evidencias visuales del estado del vehículo y piezas defectuosas.
- **RF-10 (Asignación de Mecánicos)**: Distribución de trabajos entre el personal técnico disponible en el taller.
- **RF-11 (Notificaciones por WhatsApp)**: Generación de mensajes pre-redactados y enlace directo a la API de WhatsApp para mantener informado al cliente.
- **RF-12 (Integración con Inventario y Cotizaciones)**: Descuento atómico de repuestos utilizados en la OT con afectación del stock físico e integración con el módulo comercial de cotizaciones.

---

## 2. Arquitectura y Consumo de Datos (Frontend a Backend)

El módulo se compone de la vista principal [OrdenesTrabajoView.tsx](file:///c:/Users/Benjamin/Desktop/Tesis/GearCore/frontend/app/components/OrdenesTrabajoView.tsx), montada en la ruta App Router [app/(dashboard)/ordenes/page.tsx](file:///c:/Users/Benjamin/Desktop/Tesis/GearCore/frontend/app/%28dashboard%29/ordenes/page.tsx), orquestada mediante TanStack Query en [useOrdenesTrabajo.ts](file:///c:/Users/Benjamin/Desktop/Tesis/GearCore/frontend/hooks/ordenes-trabajo/useOrdenesTrabajo.ts) y respaldada por el controlador NestJS [ordenes-trabajo.controller.ts](file:///c:/Users/Benjamin/Desktop/Tesis/GearCore/backend/src/ordenes-trabajo/ordenes-trabajo.controller.ts).

### 2.1 Hooks de TanStack Query y Query Keys

| Hook | Query Key / Mutación | Endpoint Backend | Descripción |
| :--- | :--- | :--- | :--- |
| `useOrdenesTrabajo()` | `['ordenes-trabajo']` | `GET /ordenes-trabajo` | Obtiene el listado completo de OTs filtradas según el rol del usuario solicitante. |
| `useMecanicos()` | `['mecanicos']` | `GET /ordenes-trabajo/mecanicos` | Lista de usuarios activos con rol `MECANICO` para asignación de órdenes. |
| `useRepuestos()` | `['repuestos']` | `GET /repuestos` | Catálogo de inventario para seleccionar repuestos a asociar a la orden. |
| `useCrearOT()` | Mutación (`POST`) | `POST /ordenes-trabajo` | Crea una nueva orden de trabajo con su checklist de recepción inicial. |
| `useCambiarEstadoOT()` | Mutación (`PATCH`) | `PATCH /ordenes-trabajo/:id/estado` | Actualiza la fase de ciclo de vida con validaciones de negocio y RBAC. |
| `useActualizarOT()` | Mutación (`PATCH`) | `PATCH /ordenes-trabajo/:id/diagnostico` | Actualiza diagnóstico, bitácora de trabajos y fotos de evidencia. |
| `useRegistrarHorasOT()` | Mutación (`POST`) | `POST /ordenes-trabajo/:id/horas` | Suma horas-hombre con bitácora cronológica comentada. |
| `useAgregarRepuestoOT()` | Mutación (`POST`) | `POST /ordenes-trabajo/:id/repuestos` | Asocia repuesto a la OT, genera movimiento `SALIDA_OT` y descuenta stock. Invalida `['ordenes-trabajo']` y `['repuestos']`. |
| `useQuitarRepuestoOT()` | Mutación (`DELETE`) | `DELETE /ordenes-trabajo/:id/repuestos/:detalleId` | Desvincula repuesto, genera movimiento `DEVOLUCION_OT` y restituye stock. Invalida `['ordenes-trabajo']` y `['repuestos']`. |

---

## 3. Inventario Detallado de Datos Mostrados y Consumidos por Vista / Pantalla

### 3.1 Vista Principal (Tablero de Control y Listado de Tarjetas)

#### Datos Consumidos del Backend:
- Listado de `OrdenTrabajo[]` que incluye relaciones con `vehiculo` (marca, modelo, año, patente, kilometraje), `vehiculo.cliente` (nombre, rut, teléfono, email), `mecanico` (id, nombre, email), `detalleRepuestos` (cantidad, precioUnitario, repuesto asociado) y `cotizacion` (id, numero, estado, total).
- Catálogo de `mecanicos[]` para poblar el selector de filtrado.

#### Datos Mostrados en Interfaz:
1. **Encabezado y Barra Superior**:
   - Título principal con indicador discreto de revalidación en segundo plano (`Actualizando...` cuando `isFetching === true`).
   - Subtítulo contextualizado por rol:
     - `MECANICO`: "Bandeja de órdenes asignadas: diagnóstico técnico, fotos y registro de horas hombre".
     - `ADMINISTRADOR` / `RECEPCIONISTA`: "Recepción, diagnóstico técnico, registro de horas y trazabilidad en taller".
   - Botón de acción `+ Nueva Orden de Trabajo` (restringido para el rol `MECANICO`).
2. **Barra de Filtros Reactiva**:
   - Campo de búsqueda libre: filtra en memoria por patente, nombre del cliente, motivo de falla o marca/modelo.
   - Selector de mecánico: opciones `Todos los mecánicos`, `Sin asignar` y cada mecánico activo. Si el usuario autenticado tiene rol `MECANICO`, el selector se reemplaza por una insignia fija: "Mis Órdenes Asignadas".
   - Pestañas rápidas de estado (Tabs): `Todas` y las 7 etapas oficiales con insignias numéricas reactivas (`countBadge`) que reflejan la cantidad exacta de vehículos en cada etapa.
3. **Tarjetas de Orden de Trabajo (Grid de OTs)**:
   - **Identificador**: Código corto formateado (`OT #XXXXXXXX` usando los primeros 8 caracteres del UUID en mayúsculas).
   - **Insignia de Estado**: Etiqueta visual con estilo cromático por estado (`statusRecibido`, `statusDiagnostico`, `statusCotizacion`, `statusAprobado`, `statusReparacion`, `statusCalidad`, `statusEntregado`).
   - **Datos del Vehículo**: Marca, modelo y año entre paréntesis.
   - **Patente**: Badge estilizado con la bandera de Chile y tipografía monoespaciada en mayúsculas.
   - **Propietario**: Nombre completo del cliente con icono de usuario.
   - **Motivo de Ingreso**: Falla reportada original documentada en recepción.
   - **Stepper de Progreso Visual**: Barra segmentada de 7 pasos que muestra visualmente los pasos completados, el paso actual activo y los pasos pendientes.
   - **Metadatos en Pastillas (Pills)**:
     - Mecánico asignado (o "Sin asignar").
     - Horas-hombre invertidas acumuladas (ej: `2.5 hrs`).
     - Insignia de repuestos asignados con cantidad de repuestos y suma monetaria total en CLP. Al hacer clic abre directamente la gestión técnica.
     - Insignia de fotografías adjuntas con conteo. Al hacer clic abre la gestión técnica.
   - **Acciones Rápidas en Tarjeta**:
     - Selector desplegable de cambio de estado directo: permite avanzar o retroceder de estado con validación RBAC y bloqueo de cotizaciones pendientes. Muestra spinner inline mientras guarda.
     - Botón `Diagnóstico & Fotos`: abre el modal técnico.
     - Botón `WhatsApp`: genera notificación directa con spinner de carga si está resolviendo la petición.
     - Indicador inferior `Ver ficha completa`: abre el modal de ficha integral.

---

### 3.2 Modal 1: Crear Nueva Orden de Trabajo (Ingreso de Vehículo)

Permite la recepción ágil del vehículo en el taller con checklist de condición física inicial.

#### Datos Consumidos:
- Búsqueda en vivo vía endpoint `GET /vehiculos/buscar?patente={query}` con debounce de 250ms.
- Catálogo de mecánicos activos para asignación opcional temprana.

#### Formulario y Datos Solicitados / Enviados (`CreateOrdenDto`):
1. **Selección del Vehículo**:
   - Input de autocompletado por patente o modelo.
   - Panel de vehículo seleccionado con patente destacada, marca, modelo, año, nombre del cliente y RUT. Botón para cambiar vehículo si hubo equivocación.
2. **Kilometraje de Recepción (`kilometrajeRecepcion`)**:
   - Input numérico. Si el kilometraje ingresado es mayor al registrado actualmente en la base de datos para el vehículo, el backend actualiza automáticamente el kilometraje maestro del vehículo.
3. **Mecánico Asignado (`mecanicoId`)**:
   - Selector opcional (`-- Asignar después --` o mecánico específico).
4. **Falla Reportada / Motivo de Ingreso (`fallaReportada`)**:
   - Chips visuales de atajo rápido (Frenos, Cambio de Aceite, Batería, Suspensión, Afinamiento, Scanner Check Engine, Aire Acondicionado, Ruido Motor). Al hacer clic en un chip, concatena la descripción estándar en el área de texto.
   - Textarea obligatorio para el detalle pormenorizado del síntoma.
5. **Checklist de Recepción (Inspección Visual)**:
   - **Nivel de Combustible (`nivelCombustible`)**: Selector de botones segmentados (`Reserva`, `1/4`, `1/2`, `3/4`, `Lleno`).
   - **Estado de Carrocería / Rayones (`rayonesCarroceria`)**: Campo de texto para documentar golpes, abolladuras o rayones preexistentes.
   - **Elementos de Valor / Accesorios (`elementosValor`)**: Campo de texto para registrar rueda de repuesto, gata hidráulica, radio, documentos, etc.

---

### 3.3 Modal 2: Diagnóstico Técnico, Horas y Repuestos (Seguimiento Técnico)

Espacio de trabajo del mecánico y supervisor para documentar los hallazgos y recursos invertidos.

#### Datos Mostrados:
- Cabecera con código OT, patente, marca y modelo del vehículo.
- Panel resumen del checklist de ingreso: nivel de combustible, kilometraje de recepción, observaciones de carrocería y elementos de valor declarados.

#### Funcionalidades y Datos Editables:
1. **Registro de Horas-Hombre (`RegistrarHorasDto`)**:
   - Visualización del total acumulado actual de horas-hombre.
   - Atajos rápidos de incremento: botones `+0.5h`, `+1h`, `+1.5h`, `+2h`, `+3h`.
   - Input manual para horas a sumar (con soporte decimal, mínimo 0.1).
   - Input de comentario o tarea realizada. El backend concatena este comentario a la bitácora con estampilla de tiempo en formato chileno (`[DD/MM/AAAA HH:mm:ss] +Xh: comentario`).
2. **Diagnóstico Técnico (`ActualizarDiagnosticoDto.diagnostico`)**:
   - Textarea para documentar causas raíces de la avería y componentes mecánicos o eléctricos comprometidos.
3. **Trabajo Realizado / Bitácora (`ActualizarDiagnosticoDto.trabajoRealizado`)**:
   - Textarea para registrar procedimientos de reparación efectuados, calibraciones y ajustes.
4. **Repuestos y Materiales Utilizados (Integración con Inventario)**:
   - **Tabla de repuestos ya asignados**:
     - Código de repuesto.
     - Descripción / nombre del repuesto.
     - Cantidad utilizada.
     - Precio unitario en CLP.
     - Subtotal calculado (`cantidad * precioUnitario`).
     - Botón de eliminación (icono papelera): solicita confirmación en diálogo modal y ejecuta `DELETE /ordenes-trabajo/:id/repuestos/:detalleId`. Al eliminarse, el backend restituye automáticamente el stock al inventario y registra un movimiento `DEVOLUCION_OT`.
   - **Formulario de Adición de Repuesto (`AgregarRepuestoOTDto`)**:
     - Selector del catálogo de repuestos disponibles en el taller. Muestra código, descripción, stock actual disponible y precio de venta. Deshabilita automáticamente opciones con stock en 0.
     - Campo de cantidad a utilizar.
     - Previsualización en vivo del subtotal a sumar y advertencia en rojo si la cantidad excede el stock físico en almacén.
     - Botón `Añadir a OT`: descuenta atómicamente el stock en la base de datos vía transacción Prisma, crea el registro en `DetalleOTRepuesto` y genera un movimiento `SALIDA_OT`.
5. **Fotografías del Diagnóstico (`ActualizarDiagnosticoDto.fotosDiagnostico`)**:
   - **Carga desde dispositivo**: Soporta subida múltiple desde PC o cámara/galería de smartphone.
   - **Compresión nativa en navegador**: Cada imagen seleccionada se procesa localmente en un `<canvas>` HTML5 limitando las dimensiones a 1280x1280px con compresión JPEG al 75%, reduciendo fotos de 5-10MB a menos de 80KB en formato Data URL.
   - **Carga por URL**: Campo de texto alternativo para pegar enlaces web de fotografías externas.
   - **Grilla de Miniaturas**: Muestra las fotos cargadas con opción de eliminar individualmente o hacer clic para abrir en el visor Lightbox.

---

### 3.4 Modal 3: Notificación por WhatsApp al Cliente

Herramienta de comunicación para enviar actualizaciones de estado al cliente sin salir del ERP.

#### Datos Consumidos del Backend (`GET /ordenes-trabajo/:id/whatsapp`):
- `telefono`: Teléfono del cliente asociado al vehículo de la OT.
- `texto`: Plantilla redactada profesionalmente generada por `NotificadorWhatsAppService` conteniendo:
  - Nombre del cliente.
  - Nombre comercial del taller (leído desde la configuración del taller).
  - Patente y código de la orden de trabajo.
  - Estado actual del vehículo en lenguaje comprensible.
  - Detalle técnico relevante (diagnóstico o trabajos realizados).
- `url`: Enlace base `https://wa.me/{telefono}?text={encoded}`.

#### Datos Mostrados y Funcionalidad:
- Visualización del número destinatario formateado.
- Textarea editable que permite al recepcionista o mecánico personalizar el mensaje antes de enviarlo.
- Botón `Abrir WhatsApp y Enviar`: limpia caracteres no numéricos del teléfono, codifica el texto editado con `encodeURIComponent` y abre WhatsApp Web o la app nativa de WhatsApp en una pestaña nueva.

---

### 3.5 Modal 4: Ficha Integral de la Orden de Trabajo (Vista de Detalle Completo)

Hoja de vida completa de la orden en formato de solo lectura estructurado para auditoría o consulta rápida.

#### Datos Mostrados:
1. **Encabezado Integral**: Código OT, estado actual, patente destacada con bandera chilena y botón de cierre.
2. **Stepper de Ciclo de Vida Expandido**: Representación visual horizontal de las 7 etapas con barras coloreadas e indicador textual de la fase actual (`Etapa X de 7`).
3. **Tarjeta de Vehículo y Propietario**:
   - Vehículo: Marca, modelo y año.
   - Patente: En tipografía monoespaciada.
   - Cliente: Nombre completo, RUT, teléfono con enlace de llamada y correo electrónico.
4. **Tarjeta de Checklist e Inspección de Recepción**:
   - Kilometraje registrado al momento del ingreso.
   - Nivel de combustible con insignia visual.
   - Fecha y hora exacta de recepción.
   - Fecha y hora de entrega (o "Pendiente de entrega").
   - Observaciones de carrocería / rayones declarados.
   - Elementos de valor declarados bajo custodia del taller.
5. **Tarjeta de Diagnóstico y Ejecución Técnica**:
   - Mecánico responsable asignado.
   - Horas-hombre acumuladas.
   - Motivo de ingreso reportado por el cliente.
   - Diagnóstico registrado por el mecánico.
   - Bitácora cronológica de trabajos realizados.
6. **Desglose de Repuestos e Insumos**:
   - Conteo de repuestos asignados y monto total acumulado en CLP.
   - Tabla formal con columnas: Código, Descripción, Cantidad, Precio Unitario y Subtotal.
7. **Galería de Evidencia Fotográfica**:
   - Conteo de fotos adjuntas.
   - Cuadrícula de fotos con insignia de zoom que abre el visor a resolución completa.
8. **Botones de Pie de Ficha**:
   - `Notificar por WhatsApp`: dispara el modal de mensajería.
   - `Gestionar Diagnóstico / Repuestos`: conmuta directamente al modal de edición técnica.
   - `Cerrar`: retorna a la grilla principal.

---

### 3.6 Modal 5: Visor de Fotografía Ampliada (Lightbox)

- Superposición en pantalla completa con fondo oscuro translúcido.
- Imagen ampliada en su resolución original.
- Botón directo para "Abrir en pestaña nueva / Descargar" (`diagnostico-gearcore.jpg`).

---

### 3.7 Modal 6: Sistema de Diálogos y Confirmaciones Personalizados

Reemplaza los diálogos nativos del navegador (`window.alert`, `window.confirm`) por modales accesibles y corporativos:
- **`success`**: Notificación de éxito con icono de verificación verde (ej: repuesto asociado exitosamente).
- **`error`**: Alerta con icono de advertencia rojo y mensaje de error amigable devuelto por la API.
- **`confirm`**: Confirmación de doble vía con botón cancelar y botón de acción destructiva rojo (usado para confirmar la devolución de repuestos al inventario).

---

## 4. Matriz de Roles y Reglas de Negocio (RBAC)

| Operación / Acción | ADMINISTRADOR | RECEPCIONISTA | MECANICO | Reglas de Negocio / Validaciones Clave |
| :--- | :---: | :---: | :---: | :--- |
| **Listar OTs** (`GET /ordenes-trabajo`) | Si (Todas) | Si (Todas) | Si (Solo Asignadas) | El backend fuerza `where.mecanicoId = perfil.id` para usuarios con rol `MECANICO`. |
| **Crear OT** (`POST /ordenes-trabajo`) | Si | Si | No | Requiere vehículo existente. Actualiza kilometraje del vehículo si el de recepción es mayor. |
| **Cambiar Estado** (`PATCH .../estado`) | Si | Si | Condicionado | 1. Si existe cotización y no está `APROBADA`, nadie puede avanzar a `APROBADO` o `EN_REPARACION`.<br>2. Un `MECANICO` no puede marcar una orden como `APROBADO` (la aprobación comercial es exclusiva de recepción/cliente).<br>3. Si la orden está en `COTIZACION`, el mecánico no puede avanzar los trabajos sin aprobación previa. |
| **Diagnóstico y Fotos** (`PATCH .../diagnostico`) | Si | Si | Si (Solo Asignadas) | El mecánico solo puede editar sus órdenes asignadas. |
| **Registrar Horas** (`POST .../horas`) | Si | No | Si (Solo Asignadas) | Valida mínimo 0.1 horas (6 minutos). Genera entrada fechada en la bitácora. |
| **Asociar Repuesto** (`POST .../repuestos`) | Si | Si | Si | Transacción Prisma: valida stock disponible, descuenta stock físico, crea detalle y genera `MovimientoInventario` con tipo `SALIDA_OT`. |
| **Quitar Repuesto** (`DELETE .../repuestos/:id`) | Si | Si | Si | Transacción Prisma: incrementa stock físico, elimina detalle y genera `MovimientoInventario` con tipo `DEVOLUCION_OT`. |
| **WhatsApp** (`GET .../whatsapp`) | Si | Si | Si | Requiere que el cliente tenga número de teléfono registrado. |
| **Eliminar OT** (`DELETE /ordenes-trabajo/:id`) | Si | No | No | Exclusivo del Administrador. Genera registro permanente en `RegistroAuditoria`. |

---

## 5. Contrato de Datos (Modelos Prisma y DTOs)

### Modelo Prisma: `OrdenTrabajo`
```prisma
model OrdenTrabajo {
  id                    String    @id @default(uuid())
  vehiculoId            String
  vehiculo              Vehiculo  @relation(fields: [vehiculoId], references: [id])
  mecanicoId            String?
  mecanico              Perfil?   @relation("MecanicoAsignado", fields: [mecanicoId], references: [id])
  fallaReportada        String
  estado                EstadoOT  @default(RECIBIDO)
  horasHombre           Float     @default(0)
  fechaRecepcion        DateTime  @default(now())
  fechaEntrega          DateTime?
  
  // Checklist de recepción
  nivelCombustible      String?
  rayonesCarroceria     String?
  elementosValor        String?
  kilometrajeRecepcion  Int?

  // Diagnóstico técnico y fotos
  diagnostico           String?
  trabajoRealizado      String?
  fotosDiagnostico      String[]  @default([])

  creadoEn              DateTime  @default(now())

  detalleRepuestos      DetalleOTRepuesto[]
  cotizacion            Cotizacion?
}
```

### Ciclo de Vida: Enum `EstadoOT`
```typescript
export type EstadoOT =
  | 'RECIBIDO'
  | 'DIAGNOSTICO'
  | 'COTIZACION'
  | 'APROBADO'
  | 'EN_REPARACION'
  | 'CONTROL_CALIDAD'
  | 'ENTREGADO';
```

### Tipado Frontend: Interfaz `OrdenTrabajo`
```typescript
export interface OrdenTrabajo {
  id: string;
  vehiculoId: string;
  mecanicoId: string | null;
  fallaReportada: string;
  estado: EstadoOT;
  horasHombre: number;
  fechaRecepcion: string;
  fechaEntrega: string | null;
  nivelCombustible: string | null;
  rayonesCarroceria: string | null;
  elementosValor: string | null;
  kilometrajeRecepcion: number | null;
  diagnostico: string | null;
  trabajoRealizado: string | null;
  fotosDiagnostico: string[];
  creadoEn: string;
  actualizadoEn?: string;
  vehiculo: {
    id: string;
    patente: string;
    marca: string;
    modelo: string;
    anio: number | null;
    kilometraje: number | null;
    cliente: {
      id: string;
      nombre: string;
      rut: string;
      telefono: string | null;
      email: string | null;
    };
  };
  mecanico: {
    id: string;
    nombre: string;
    email: string;
  } | null;
  detalleRepuestos?: DetalleOTRepuestoItem[];
  cotizacion?: {
    id: string;
    numero: number;
    estado: 'BORRADOR' | 'ENVIADA' | 'APROBADA' | 'RECHAZADA' | 'VENCIDA';
    total: number;
  } | null;
}
```
