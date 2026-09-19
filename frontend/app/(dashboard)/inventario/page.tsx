'use client';

import { useDashboard } from '../DashboardContext';
import InventarioView from '../../components/InventarioView';

export default function InventarioPage() {
  const { userRole } = useDashboard();
  return <InventarioView userRole={userRole} />;
}
