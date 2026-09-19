'use client';

import { useDashboard } from '../DashboardContext';
import UsuariosSeguridadView from '../../components/UsuariosSeguridadView';

export default function UsuariosPage() {
  const { userRole } = useDashboard();
  return <UsuariosSeguridadView userRole={userRole} />;
}
