import { Outlet } from 'react-router-dom';
import UserHeader from './UserHeader';
import UserBottomNav from './UserBottomNav';
import './UserLayout.css';

export default function UserLayout() {
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
