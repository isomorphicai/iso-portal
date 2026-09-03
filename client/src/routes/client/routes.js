import ChatPlayground from './ChatPlayground';
import { MessageSquare } from 'lucide-react';

export const clientRoutes = [
  {
    path: 'chat',
    label: 'Chat Playground',
    icon: MessageSquare,
    component: ChatPlayground
  }
];
