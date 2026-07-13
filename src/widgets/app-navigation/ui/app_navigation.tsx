import type { ReactNode } from 'react';
import { Bookmark, Home, PlusCircle } from 'lucide-react';

import { NavigationBar } from '@/shared/ui';

import './app_navigation.css';

export type WorkspaceTab = 'home' | 'library' | 'save';

const NAVIGATION_ITEMS = [
  {
    icon: <Bookmark aria-hidden="true" />,
    label: '보관함',
    value: 'library',
  },
  { icon: <Home aria-hidden="true" />, label: '홈', value: 'home' },
  {
    icon: <PlusCircle aria-hidden="true" />,
    label: '저장',
    value: 'save',
  },
] satisfies Array<{
  icon: ReactNode;
  label: string;
  value: WorkspaceTab;
}>;

export function AppNavigation({
  onTabChange,
  tab,
}: {
  onTabChange: (tab: WorkspaceTab) => void;
  tab: WorkspaceTab;
}) {
  return (
    <NavigationBar
      className="app-navigation"
      items={NAVIGATION_ITEMS}
      onValueChange={onTabChange}
      value={tab}
    />
  );
}
