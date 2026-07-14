import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  MapPin,
  Star,
  Wallet,
  Dumbbell,
  Sparkles,
} from 'lucide-react';
import type { GymTrainer } from '../../data/userMock';
import { getGymById } from '../../data/userMock';
import ConsultRequestSheet from '../../features/map/ConsultRequestSheet';
import '../../features/map/map.css';
import '../../features/map/gymDetail.css';
import './user.css';

type DetailTab = 'gym' | 'trainers';

export default function GymDetailPage() {
  const { id } = useParams<{ id: string }>();
  const gym = id ? getGymById(id) : undefined;
  const [tab, setTab] = useState<DetailTab>('gym');
  const [consultOpen, setConsultOpen] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState<GymTrainer | null>(null);

  if (!gym) {
    return <Navigate to="/user/map" replace />;
  }

  const openConsult = (trainer: GymTrainer | null = null) => {
    setSelectedTrainer(trainer);
    setConsultOpen(true);
  };

  return (
    <div className="user-page gym-detail">
      <Link to="/user/map" className="gym-back">
        <ArrowLeft size={16} />
        지도로 돌아가기
      </Link>

      <section className="gym-detail-hero panel">
        <div className="gym-detail-gallery" aria-label={`${gym.name} 사진`}>
          {gym.photos.map((photo, index) => (
            <img
              key={photo}
              src={photo}
              alt={`${gym.name} 사진 ${index + 1}`}
              loading={index === 0 ? 'eager' : 'lazy'}
            />
          ))}
        </div>

        <div className="gym-detail-head">
          <div className="gym-detail-badges">
            <span className="status-badge badge-red">{gym.type}</span>
            <span className="gym-distance">{gym.distanceKm.toFixed(1)}km</span>
          </div>
          <h1>{gym.name}</h1>
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
        </div>
      </section>

      <div className="gym-detail-tabs" role="tablist" aria-label="상세 정보 탭">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'gym'}
          className={`gym-detail-tab${tab === 'gym' ? ' is-active' : ''}`}
          onClick={() => setTab('gym')}
        >
          헬스장
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'trainers'}
          className={`gym-detail-tab${tab === 'trainers' ? ' is-active' : ''}`}
          onClick={() => setTab('trainers')}
        >
          트레이너
        </button>
      </div>

      {tab === 'gym' && (
        <section className="gym-detail-panel panel" role="tabpanel">
          <ul className="gym-info-list">
            <li>
              <span className="gym-info-icon">
                <Clock size={16} />
              </span>
              <div>
                <strong>운영 시간</strong>
                <p>{gym.hours}</p>
              </div>
            </li>
            <li>
              <span className="gym-info-icon">
                <Wallet size={16} />
              </span>
              <div>
                <strong>비용</strong>
                <p>{gym.price}</p>
              </div>
            </li>
            <li>
              <span className="gym-info-icon">
                <Dumbbell size={16} />
              </span>
              <div>
                <strong>보유 기구</strong>
                <div className="gym-chip-row">
                  {gym.equipment.map((item) => (
                    <span key={item} className="gym-tag">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </li>
            <li>
              <span className="gym-info-icon">
                <Sparkles size={16} />
              </span>
              <div>
                <strong>편의 시설</strong>
                <div className="gym-chip-row">
                  {gym.amenities.map((item) => (
                    <span key={item} className="gym-tag">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </li>
          </ul>
        </section>
      )}

      {tab === 'trainers' && (
        <section className="gym-trainer-grid" role="tabpanel">
          {gym.trainers.map((trainer) => (
            <article key={trainer.id} className="gym-trainer-card panel">
              <img
                className="gym-trainer-photo"
                src={trainer.photoUrl}
                alt={`${trainer.name} 프로필`}
                loading="lazy"
              />
              <div className="gym-trainer-body">
                <h2>{trainer.name}</h2>
                <span className="status-badge badge-yellow">{trainer.specialty}</span>
                <p>{trainer.bio}</p>
                <button
                  type="button"
                  className="btn btn-secondary gym-trainer-cta"
                  onClick={() => openConsult(trainer)}
                >
                  상담 신청
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      <div className="gym-detail-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => openConsult(null)}
        >
          상담 신청
        </button>
      </div>

      <ConsultRequestSheet
        open={consultOpen}
        gym={gym}
        trainer={selectedTrainer}
        onClose={() => setConsultOpen(false)}
      />
    </div>
  );
}
