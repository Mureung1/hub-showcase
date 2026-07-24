import { Link } from 'react-router-dom';
import { Bell, ChevronRight } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';

function displayName(name: string | null | undefined, email: string | undefined): string {
  if (name?.trim()) return name.trim();
  if (email) return email.split('@')[0] ?? '회원';
  return '회원';
}

export default function HomeGreeting() {
  const { profile, session } = useAuth();
  const name = displayName(profile?.name, session?.user.email);

  return (
    <header className="home-greeting">
      <div className="home-greeting-text">
        <p className="home-greeting-hello">안녕하세요, {name}님!</p>
        <p className="home-greeting-sub">오늘도 건강한 하루 보내세요 💪</p>
      </div>
      <div className="home-greeting-actions">
        <button type="button" className="home-icon-btn" aria-label="알림">
          <Bell size={18} />
          <span className="home-icon-dot" aria-hidden="true" />
        </button>
        <Link to="/user/meals" className="home-profile-link">
          식단 기록
          <ChevronRight size={14} />
        </Link>
      </div>
    </header>
  );
}
