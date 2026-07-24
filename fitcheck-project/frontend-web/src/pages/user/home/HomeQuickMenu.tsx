import { Link } from 'react-router-dom';
import { PlayCircle, UtensilsCrossed, MapPinned } from 'lucide-react';

const ITEMS = [
  { to: '/user/courses', label: '강좌', icon: PlayCircle },
  { to: '/user/meals', label: '식단', icon: UtensilsCrossed },
  { to: '/user/map', label: '지도', icon: MapPinned },
] as const;

export default function HomeQuickMenu() {
  return (
    <section className="home-quick-section">
      <h2 className="showcase-section-title">빠른 메뉴</h2>
      <div className="home-quick-grid">
        {ITEMS.map((item) => (
          <Link key={item.to} to={item.to} className="home-quick-item">
            <span className="home-quick-icon">
              <item.icon size={22} />
            </span>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
