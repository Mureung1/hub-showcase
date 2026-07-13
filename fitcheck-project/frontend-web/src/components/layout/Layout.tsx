import { Outlet } from 'react-router-dom';
import Sidebar, { useSidebarState } from './Sidebar';
import Header from './Header';
import Toast from './Toast';
import BottomNav from './BottomNav';
import './Layout.css';

export default function Layout() {
  const { collapsed, toggle } = useSidebarState();

  return (
    <div className={`app-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <div className="main-wrapper">
        <Header />
        <Outlet />
      </div>
      <BottomNav />
      <Toast />
    </div>
  );
}
