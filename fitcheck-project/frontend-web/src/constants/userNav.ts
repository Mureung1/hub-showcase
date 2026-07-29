import { Home, MapPinned, PlayCircle, UtensilsCrossed } from 'lucide-react';

export const USER_NAV_ITEMS = [
  { to: '/user', label: '홈', icon: Home, end: true },
  { to: '/user/courses', label: '강좌', icon: PlayCircle, end: false },
  { to: '/user/meals', label: '식단', icon: UtensilsCrossed, end: false },
  { to: '/user/map', label: '지도', icon: MapPinned, end: false },
] as const;
