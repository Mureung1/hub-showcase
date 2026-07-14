import { Dumbbell, UserRound, Building2 } from 'lucide-react';
import type { GymPlace } from '../../data/userMock';

interface GymThumbnailProps {
  gym: GymPlace;
  size?: 'sm' | 'md';
}

const TONE_BY_TYPE: Record<GymPlace['type'], string> = {
  '골목 헬스장': 'tone-red',
  '1인 PT숍': 'tone-amber',
  '개인 트레이너': 'tone-teal',
};

function TypeIcon({ type }: { type: GymPlace['type'] }) {
  if (type === '개인 트레이너') return <UserRound size={22} strokeWidth={2} />;
  if (type === '1인 PT숍') return <Building2 size={22} strokeWidth={2} />;
  return <Dumbbell size={22} strokeWidth={2} />;
}

export default function GymThumbnail({ gym, size = 'md' }: GymThumbnailProps) {
  const photo = gym.photos[0];

  if (photo) {
    return (
      <div className={`gym-thumb gym-thumb-${size} gym-thumb-photo`} aria-hidden="true">
        <img src={photo} alt="" loading="lazy" />
      </div>
    );
  }

  return (
    <div
      className={`gym-thumb gym-thumb-${size} ${TONE_BY_TYPE[gym.type]}`}
      aria-hidden="true"
    >
      <TypeIcon type={gym.type} />
    </div>
  );
}
