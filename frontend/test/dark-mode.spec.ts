import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Modo Oscuro (Dark Mode) y Persistencia', async (t) => {
  await t.test('ThemeContext existe y expone ThemeProvider y useTheme', () => {
    const themeContextPath = path.resolve('app/context/ThemeContext.tsx');
    assert.ok(fs.existsSync(themeContextPath), 'ThemeContext.tsx debe existir');
    const content = fs.readFileSync(themeContextPath, 'utf-8');
    assert.ok(content.includes('export function ThemeProvider'), 'Debe exportar ThemeProvider');
    assert.ok(content.includes('export function useTheme'), 'Debe exportar useTheme');
    assert.ok(content.includes('gearcore-theme'), 'Debe utilizar la clave de almacenamiento gearcore-theme');
    assert.ok(content.includes('data-theme'), 'Debe establecer el atributo data-theme');
  });

  await t.test('globals.css define variables semanticas para modo claro y oscuro', () => {
    const globalsCssPath = path.resolve('app/globals.css');
    assert.ok(fs.existsSync(globalsCssPath), 'globals.css debe existir');
    const content = fs.readFileSync(globalsCssPath, 'utf-8');
    assert.ok(content.includes(':root'), 'Debe definir tokens en :root');
    assert.ok(content.includes('[data-theme="dark"]'), 'Debe definir tokens en [data-theme="dark"]');
    assert.ok(content.includes('--bg-app'), 'Debe definir token --bg-app');
    assert.ok(content.includes('--bg-surface'), 'Debe definir token --bg-surface');
    assert.ok(content.includes('--text-primary'), 'Debe definir token --text-primary');
    assert.ok(content.includes('--accent-primary'), 'Debe definir token --accent-primary');
    assert.ok(content.includes('color-scheme: dark'), 'Debe incluir soporte nativo de color-scheme: dark');
  });

  await t.test('layout.tsx root contiene script anti-flicker FOUT y suppressHydrationWarning', () => {
    const layoutPath = path.resolve('app/layout.tsx');
    assert.ok(fs.existsSync(layoutPath), 'app/layout.tsx debe existir');
    const content = fs.readFileSync(layoutPath, 'utf-8');
    assert.ok(content.includes('suppressHydrationWarning'), 'html debe incluir suppressHydrationWarning');
    assert.ok(content.includes('gearcore-theme'), 'El script inline debe leer gearcore-theme');
    assert.ok(content.includes('prefers-color-scheme'), 'Debe respetar preferencia del sistema prefers-color-scheme');
  });

  await t.test('layout.tsx dashboard incluye boton de cambio de tema con accesibilidad', () => {
    const dashboardLayoutPath = path.resolve('app/(dashboard)/layout.tsx');
    assert.ok(fs.existsSync(dashboardLayoutPath), 'app/(dashboard)/layout.tsx debe existir');
    const content = fs.readFileSync(dashboardLayoutPath, 'utf-8');
    assert.ok(content.includes('useTheme'), 'Dashboard layout debe consumir useTheme()');
    assert.ok(content.includes('toggleTheme'), 'Debe permitir invocar toggleTheme');
    assert.ok(content.includes('themeToggleBtn'), 'Debe aplicar estilo themeToggleBtn');
    assert.ok(content.includes('aria-label'), 'Debe incluir aria-label accesible');
  });

  await t.test('DataTable module css consume tokens de variables semanticas', () => {
    const dataTableCssPath = path.resolve('app/components/data-table.module.css');
    assert.ok(fs.existsSync(dataTableCssPath), 'data-table.module.css debe existir');
    const content = fs.readFileSync(dataTableCssPath, 'utf-8');
    assert.ok(content.includes('var(--bg-surface)'), 'DataTable debe utilizar var(--bg-surface)');
    assert.ok(content.includes('var(--text-primary)'), 'DataTable debe utilizar var(--text-primary)');
    assert.ok(content.includes('var(--border-color)'), 'DataTable debe utilizar var(--border-color)');
  });
});
