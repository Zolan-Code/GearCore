import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { isRouteAllowed, NAV_ITEMS } from '../app/(dashboard)/navConfig.ts';

test('Fase 5: Módulos Administrativos (/usuarios, /ajustes, /perfil) y Limpieza', async (t) => {
  await t.test('Control de acceso RBAC estricto a /usuarios (solo Admin)', () => {
    assert.equal(isRouteAllowed('/usuarios', 'ADMINISTRADOR'), true);
    assert.equal(isRouteAllowed('/usuarios', 'RECEPCIONISTA'), false);
    assert.equal(isRouteAllowed('/usuarios', 'MECANICO'), false);
  });

  await t.test('Control de acceso RBAC estricto a /ajustes (solo Admin)', () => {
    assert.equal(isRouteAllowed('/ajustes', 'ADMINISTRADOR'), true);
    assert.equal(isRouteAllowed('/ajustes', 'RECEPCIONISTA'), false);
    assert.equal(isRouteAllowed('/ajustes', 'MECANICO'), false);
  });

  await t.test('Acceso a /perfil permitido para todos los roles autenticados', () => {
    assert.equal(isRouteAllowed('/perfil', 'ADMINISTRADOR'), true);
    assert.equal(isRouteAllowed('/perfil', 'RECEPCIONISTA'), true);
    assert.equal(isRouteAllowed('/perfil', 'MECANICO'), true);
  });

  await t.test('Archivos de ruta administrativa y perfil existen y renderizan componentes', () => {
    const usuariosPath = path.resolve('app/(dashboard)/usuarios/page.tsx');
    assert.ok(fs.existsSync(usuariosPath), 'Debe existir app/(dashboard)/usuarios/page.tsx');
    const contentUsuarios = fs.readFileSync(usuariosPath, 'utf8');
    assert.ok(contentUsuarios.includes('UsuariosSeguridadView'));

    const ajustesPath = path.resolve('app/(dashboard)/ajustes/page.tsx');
    assert.ok(fs.existsSync(ajustesPath), 'Debe existir app/(dashboard)/ajustes/page.tsx');
    const contentAjustes = fs.readFileSync(ajustesPath, 'utf8');
    assert.ok(contentAjustes.includes('AjustesView'));

    const perfilPath = path.resolve('app/(dashboard)/perfil/page.tsx');
    assert.ok(fs.existsSync(perfilPath), 'Debe existir app/(dashboard)/perfil/page.tsx');
    const contentPerfil = fs.readFileSync(perfilPath, 'utf8');
    assert.ok(contentPerfil.includes('MiPerfilView'));
  });

  await t.test('Switch monolítico app/page.tsx eliminado exitosamente', () => {
    const oldPagePath = path.resolve('app/page.tsx');
    assert.equal(fs.existsSync(oldPagePath), false, 'app/page.tsx no debe existir (reemplazado por app/(dashboard)/page.tsx)');
  });
});
