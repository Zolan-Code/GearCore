'use client';

import { useDashboard } from '../DashboardContext';
import AuditoriaView from '../../components/AuditoriaView';

export default function AuditoriaPage() {
  const { userRole } = useDashboard();
  return <AuditoriaView userRole={userRole} />;
}
