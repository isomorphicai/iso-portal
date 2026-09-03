import TenantsList from './TenantsList';
import Analytics from './Analytics';
import Ingestion from './Ingestion';
import { Building2, BarChart3, Database } from 'lucide-react';

export const adminRoutes = [
  {
    path: 'tenants',
    label: 'Tenants & Roles',
    icon: Building2,
    component: TenantsList
  },
  {
    path: 'analytics',
    label: 'Bot Analytics',
    icon: BarChart3,
    component: Analytics
  },
  {
    path: 'ingestion',
    label: 'Ingestion Manager',
    icon: Database,
    component: Ingestion
  }
];
