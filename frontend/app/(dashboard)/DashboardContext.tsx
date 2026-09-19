'use client';

import { createContext, useContext } from 'react';
import { Rol } from './navConfig';

export interface UserProfile {
  id: string;
  email: string;
  nombre?: string;
  rol?: Rol;
}

interface DashboardContextType {
  user: UserProfile | null;
  userRole: Rol;
  loading: boolean;
}

export const DashboardContext = createContext<DashboardContextType>({
  user: null,
  userRole: 'MECANICO',
  loading: true,
});

export function useDashboard() {
  return useContext(DashboardContext);
}
