import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { syncCourseLibraryToServer } from '../../hooks/useCourseLibrary';
import { useAuth } from '../../hooks/useAuth';
import { useDesktopShell } from '../../hooks/useDesktopShell';
import UserHeader from './UserHeader';
import UserSidebar from './UserSidebar';
import UserBottomNav from './UserBottomNav';
import './UserLayout.css';

export default function UserLayout() {
  const { isAuthenticated } = useAuth();
  const useDesktop = useDesktopShell();

  useEffect(() => {
    if (!isAuthenticated) return;
    void syncCourseLibraryToServer();
  }, [isAuthenticated]);

  const layoutClass = [
    'user-layout',
    useDesktop ? 'user-layout--desktop' : 'user-layout--mobile',
  ].join(' ');

  return (
    <div className={layoutClass}>
      {useDesktop ? <UserSidebar /> : <UserHeader />}
      <div className="user-main">
        <Outlet />
      </div>
      {!useDesktop ? <UserBottomNav /> : null}
    </div>
  );
}
