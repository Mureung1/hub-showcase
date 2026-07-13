import { Heart } from 'lucide-react';
import './courses.css';

interface FavoriteButtonProps {
  active: boolean;
  onToggle: () => void;
  size?: 'sm' | 'md';
}

export default function FavoriteButton({
  active,
  onToggle,
  size = 'md',
}: FavoriteButtonProps) {
  return (
    <button
      type="button"
      className={`favorite-btn size-${size}${active ? ' active' : ''}`}
      aria-label={active ? '즐겨찾기 해제' : '즐겨찾기 추가'}
      aria-pressed={active}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle();
      }}
    >
      <Heart
        size={size === 'sm' ? 16 : 18}
        fill={active ? 'currentColor' : 'none'}
        strokeWidth={2.2}
      />
    </button>
  );
}
