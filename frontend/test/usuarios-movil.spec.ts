import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('Usuarios y Roles: Optimización móvil con tarjetas táctiles y modal 100dvh', () => {
  const viewTsx = fs.readFileSync(
    path.join(process.cwd(), 'app/components/UsuariosSeguridadView.tsx'),
    'utf-8'
  );
  const css = fs.readFileSync(
    path.join(process.cwd(), 'app/components/usuarios-seguridad.module.css'),
    'utf-8'
  );

  // 1. DataTable recibe renderCard para tarjetas móviles de usuario
  assert.ok(
    viewTsx.includes('renderCard={(u) => {'),
    'UsuariosSeguridadView debe pasar renderCard a DataTable'
  );
  assert.ok(
    viewTsx.includes('className={styles.userCard}'),
    'renderCard debe renderizar userCard'
  );
  assert.ok(
    viewTsx.includes('className={styles.userCardRoleRow}'),
    'renderCard debe incluir fila de rol sin truncarse'
  );
  assert.ok(
    viewTsx.includes('handleToggleEstado(u)'),
    'renderCard debe permitir accionar switch ON/OFF junto al nombre del usuario'
  );

  // 2. CSS define las tarjetas móviles de usuarios
  assert.ok(
    css.includes('.userCard {'),
    'usuarios-seguridad.module.css debe definir .userCard'
  );
  assert.ok(
    css.includes('.userCardHeader {'),
    'usuarios-seguridad.module.css debe definir .userCardHeader'
  );

  // 3. CSS define optimizaciones en breakpoint móvil (<= 640px)
  assert.ok(
    css.includes('@media (max-width: 640px)'),
    'usuarios-seguridad.module.css debe incluir breakpoint 640px'
  );
  assert.ok(
    css.includes('height: 100dvh'),
    'modalContent debe adaptarse a 100dvh en pantallas móviles'
  );
});
