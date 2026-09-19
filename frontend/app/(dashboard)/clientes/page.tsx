'use client';

import { useDashboard } from '../DashboardContext';
import ClientesVehiculosView from '../../components/ClientesVehiculosView';

export default function ClientesPage() {
  const { userRole } = useDashboard();
  return <ClientesVehiculosView userRole={userRole} />;
}
