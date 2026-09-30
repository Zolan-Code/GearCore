# Plan de Mejora Móvil: Módulo de Usuarios y Roles (/ponytail)

## 1. Diagnóstico y Objetivo (Enfoque Ponytail)

### Problemas Detectados en Móvil (≤ 640px / iPhone SE 375px–414px)
1. **Riesgo crítico de error humano con el switch ON/OFF:** La tabla de 6 columnas requería scroll horizontal para ver y alternar el switch de estado activo/suspendido. Al scrollear a la derecha, los nombres y correos quedaban fuera de pantalla, arriesgando activar o suspender al usuario equivocado a ciegas.
2. **Selector de rol truncado:** El rol *"Asesor de Servicios"* se cortaba (*"Asesor de Servi..."*) por el ancho rígido de columna.
3. **Modal flotante comprimido:** El modal para crear usuario flotaba en el centro con padding que restaba espacio útil en pantallas angostas.

### La Solución Perezosa y Robusta (/ponytail)
- **Tarjetas táctiles de usuario (`renderCard` en `DataTable`):** Cada usuario se muestra como una tarjeta donde el Avatar, Nombre, Correo y el switch **ON/OFF** de activación conviven en la misma cabecera. Cero scroll horizontal e imposible equivocarse de usuario.
- **Selector de rol full-width:** El rol se selecciona cómodamente en su propia fila dentro de la tarjeta con colores semánticos (*Administrador* en morado, *Asesor de Servicios* en azul, *Mecánico* en verde).
- **Metadatos en el pie:** Contador de OTs asignadas y fecha de registro.
- **Modal en `100dvh`:** En `≤ 640px`, `.modalContent` pasa a ocupar la altura completa con botones táctiles `flex: 1`.

---

## 2. Archivos Modificados

1. **`frontend/app/components/UsuariosSeguridadView.tsx`:**
   - Inyección de `renderCard={(u) => ...}` en `<DataTable<Usuario>>`.
2. **`frontend/app/components/usuarios-seguridad.module.css`:**
   - Estilos para `.userCard`, `.userCardHeader`, `.userCardRoleRow`, `.userCardFooter`.
   - Reglas en `@media (max-width: 640px)` para `100dvh` y botones `flex: 1`.
3. **`frontend/test/usuarios-movil.spec.ts`:**
   - Test unitario validando `renderCard`, switch ON/OFF, selector de rol y `100dvh`.

---

## 3. Plan de Verificación

1. **Escritorio (> 768px):** Tabla tradicional de usuarios de 6 columnas permanece 100% idéntica.
2. **Móvil (375px - iPhone SE / 390px - iPhone 14):**
   - Lista de usuarios se presenta en tarjetas táctiles sin scroll horizontal.
   - Cada switch ON/OFF está al lado del nombre de la persona correspondiente.
   - Selector de rol legible en su totalidad.
   - El modal "Crear Nuevo Usuario" abre en pantalla completa adaptada.
3. **Suite automatizada:** 85 tests ejecutados exitosamente (`npm test`).
