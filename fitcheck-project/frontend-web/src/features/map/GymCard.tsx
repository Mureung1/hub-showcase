import type { GymPlace } from '../../data/userMock';
import { MapPin, Star } from 'lucide-react';
import './map.css';

interface GymCardProps {
  gym: GymPlace;
}

export default function GymCard({ gym }: GymCardProps) {
  return (
    <article className="gym-card panel">
      <div className="gym-card-top">
        <span className="status-badge badge-red">{gym.type}</span>
        <span className="gym-distance">{gym.distanceKm.toFixed(1)}km</span>
      </div>
      <h3>{gym.name}</h3>
      <div className="gym-card-meta">
        <span>
          <Star size={14} />
          {gym.rating.toFixed(1)}
        </span>
        <span>
          <MapPin size={14} />
          {gym.address}
        </span>
      </div>
      <div className="gym-tags">
        {gym.tags.map((tag) => (
          <span key={tag} className="gym-tag">
            {tag}
          </span>
        ))}
      </div>
      <button type="button" className="btn btn-secondary">
        상담 신청
      </button>
    </article>
  );
}
