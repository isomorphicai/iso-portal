import TenantsList from './TenantsList';
import SystemSettings from './SystemSettings';
import Analytics from './Analytics';
import Ingestion from './Ingestion';
import ConversationHistory from './ConversationHistory';
import ChatPlayground from '../client/ChatPlayground';
import { Building2, BarChart3, Database, MessageSquare, History, Shield } from 'lucide-react';

export const adminRoutes = [
  {
    path: 'tenants',
    label: 'Tenants',
    icon: Building2,
    component: TenantsList
  },
  {
    path: 'system_settings',
    label: 'Roles & Pages',
    icon: Shield,
    component: SystemSettings,
    superAdminOnly: true
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
  },
  {
    path: 'conversations',
    label: 'Conversation History',
    icon: History,
    component: ConversationHistory
  },
  {
    path: 'chat',
    label: 'Chat Playground',
    icon: MessageSquare,
    component: ChatPlayground
  }
];

