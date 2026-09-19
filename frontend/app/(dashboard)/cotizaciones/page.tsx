'use client';

import { useDashboard } from '../DashboardContext';
import CotizacionesView from '../../components/CotizacionesView';

export default function CotizacionesPage() {
  const { userRole } = useDashboard();
  return <CotizacionesView userRole={userRole} />;
}
