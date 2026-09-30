import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('Dashboard y Pipeline: Enlaces filtrados por estado y optimización móvil', () => {
  const dashboardTsx = fs.readFileSync(
    path.join(process.cwd(), 'app/(dashboard)/page.tsx'),
    'utf-8'
  );
  const ordenesTsx = fs.readFileSync(
    path.join(process.cwd(), 'app/components/OrdenesTrabajoView.tsx'),
    'utf-8'
  );
  const pageCss = fs.readFileSync(
    path.join(process.cwd(), 'app/page.module.css'),
    'utf-8'
  );

  // 1. Enlaces del pipeline transmiten parámetro estado
  assert.ok(
    dashboardTsx.includes('href={`/ordenes?estado=${step.key}`}'),
    'Los enlaces del pipeline deben navegar con ?estado=...'
  );

  // 2. OrdenesTrabajoView sincroniza filtroEstado con searchParams
  assert.ok(
    ordenesTsx.includes("const estadoParam = searchParams.get('estado');"),
    'OrdenesTrabajoView debe leer el parámetro estado de searchParams'
  );
  assert.ok(
    ordenesTsx.includes('filtroEstado'),
    'OrdenesTrabajoView debe mantener el estado filtroEstado'
  );

  // 3. CSS de Dashboard incluye dateFieldWrapper y media query móvil 640px
  assert.ok(
    pageCss.includes('.dateFieldWrapper'),
    'page.module.css debe definir .dateFieldWrapper'
  );
  assert.ok(
    pageCss.includes('@media (max-width: 640px)'),
    'page.module.css debe incluir breakpoint móvil 640px'
  );
  assert.ok(
    pageCss.includes('.recentTable thead'),
    'page.module.css debe transformar la tabla reciente en tarjetas móviles'
  );
});
