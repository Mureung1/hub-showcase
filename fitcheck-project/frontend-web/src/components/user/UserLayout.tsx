import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { syncCourseLibraryToServer } from '../../hooks/useCourseLibrary';
import { useAuth } from '../../hooks/useAuth';
import UserHeader from './UserHeader';
import UserBottomNav from './UserBottomNav';
import './UserLayout.css';

export default function UserLayout() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;
    void syncCourseLibraryToServer();
  }, [isAuthenticated]);

  return (
    <div className="user-layout">
      <UserHeader />
      <div className="user-main">
        <Outlet />
      </div>
      <UserBottomNav />
    </div>
  );
}
