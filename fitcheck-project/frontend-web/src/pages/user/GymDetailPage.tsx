import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Link2,
  MapPin,
  MessageSquareHeart,
  Star,
  Wallet,
  Dumbbell,
  Sparkles,
} from 'lucide-react';
import type { GymTrainer } from '../../data/userMock';
import { getGymById } from '../../data/userMock';
import ConsultRequestSheet from '../../features/map/ConsultRequestSheet';
import { useConsultRequests } from '../../hooks/useConsultRequests';
import { formatRelativeTime } from '../../utils/date';
import {
  getActiveHistoryShareRequest,
  getMemberVisibleConsultFeedback,
  hasActiveHistoryShare,
} from '../../utils/historyShare';
import '../../features/map/map.css';
import '../../features/map/gymDetail.css';
import './user.css';

type DetailTab = 'gym' | 'trainers';

export default function GymDetailPage() {
  const { id } = useParams<{ id: string }>();
  const gym = id ? getGymById(id) : undefined;
  const { requests } = useConsultRequests();
  const [tab, setTab] = useState<DetailTab>('gym');
  const [consultOpen, setConsultOpen] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState<GymTrainer | null>(null);

  const isLinked = useMemo(
    () => (gym ? hasActiveHistoryShare(requests, gym.id) : false),
    [gym, requests],
  );
  const linkedRequest = useMemo(
    () => (gym ? getActiveHistoryShareRequest(requests, gym.id) : undefined),
    [gym, requests],
  );
  const trainerFeedback = useMemo(
    () => (gym ? getMemberVisibleConsultFeedback(requests, gym.id) : undefined),
    [gym, requests],
  );

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
            <div className="gym-detail-badge-row">
              <span className="status-badge badge-red">{gym.type}</span>
              {isLinked && (
                <span className="gym-link-badge" title="식단·운동 기록 공유 중">
                  <Link2 size={12} />
                  연동 중
                  {linkedRequest?.trainerName
                    ? ` · ${linkedRequest.trainerName}`
                    : ''}
                </span>
              )}
            </div>
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

      {trainerFeedback && (
        <section className="gym-feedback-card panel" aria-label="트레이너 상담 피드백">
          <div className="gym-feedback-head">
            <span className="gym-feedback-icon" aria-hidden="true">
              <MessageSquareHeart size={16} />
            </span>
            <div>
              <p className="gym-feedback-eyebrow">트레이너가 피드백 해드립니다</p>
              <h2>상담 피드백</h2>
              <p className="gym-feedback-sub">
                {trainerFeedback.trainerName
                  ? `${trainerFeedback.trainerName} 트레이너`
                  : gym.name}
                {trainerFeedback.reportSavedAt
                  ? ` · ${formatRelativeTime(trainerFeedback.reportSavedAt)}`
                  : ''}
              </p>
            </div>
          </div>

          {trainerFeedback.userFeedback?.trim() && (
            <div className="gym-feedback-block">
              <span>한 줄 총평</span>
              <p>{trainerFeedback.userFeedback}</p>
            </div>
          )}

          {trainerFeedback.shareMemoWithMember &&
            trainerFeedback.trainerReportMemo?.trim() && (
              <div className="gym-feedback-block">
                <span>상담 메모</span>
                <p>{trainerFeedback.trainerReportMemo}</p>
              </div>
            )}
        </section>
      )}

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
