'use client';

import { Suspense } from 'react';
import { useDashboard } from '../DashboardContext';
import InventarioView from '../../components/InventarioView';

export default function InventarioPage() {
  const { userRole } = useDashboard();
  return (
    <Suspense fallback={<div style={{ padding: '24px', color: 'var(--text-secondary)' }}>Cargando inventario...</div>}>
      <InventarioView userRole={userRole} />
    </Suspense>
  );
}

