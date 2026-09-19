'use client';

import { useDashboard } from '../DashboardContext';
import OrdenesTrabajoView from '../../components/OrdenesTrabajoView';

export default function OrdenesPage() {
  const { userRole, user } = useDashboard();
  return <OrdenesTrabajoView userRole={userRole} userId={user?.id} />;
}
