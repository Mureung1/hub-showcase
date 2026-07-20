import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  ExternalLink,
  Info,
  Link2,
  LoaderCircle,
  MapPin,
  MessageSquareHeart,
  Star,
  Wallet,
  Dumbbell,
  Sparkles,
} from 'lucide-react';
import type { GymPlace, GymTrainer } from '../../data/userMock';
import ConsultRequestSheet from '../../features/map/ConsultRequestSheet';
import GymThumbnail from '../../features/map/GymThumbnail';
import { useConsultRequests } from '../../hooks/useConsultRequests';
import { fetchGymById } from '../../services/gymsApi';
import { formatRelativeTime } from '../../utils/date';
import {
  hasGymDetailProfile,
  hasGymRating,
  hasNaverExternalLink,
  isNaverSourcedGym,
} from '../../utils/gymProfile';
import {
  getActiveHistoryShareRequest,
  getMemberVisibleConsultFeedback,
  hasActiveHistoryShare,
} from '../../utils/historyShare';
import '../../features/map/map.css';
import '../../features/map/gymDetail.css';
import './user.css';

type DetailTab = 'gym' | 'trainers';

function InfoPlaceholder() {
  return <p className="gym-info-placeholder">정보 준비 중</p>;
}

export default function GymDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { requests } = useConsultRequests();
  const [gym, setGym] = useState<GymPlace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<DetailTab>('gym');
  const [consultOpen, setConsultOpen] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState<GymTrainer | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const fetched = await fetchGymById(id!);
        if (!cancelled) setGym(fetched);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : '헬스장 정보를 불러오지 못했습니다.',
          );
          setGym(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

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

  if (loading) {
    return (
      <div className="user-page gym-detail gym-detail-loading">
        <LoaderCircle size={24} className="map-locate-spin" aria-hidden="true" />
        <p>헬스장 정보를 불러오는 중…</p>
      </div>
    );
  }

  if (!gym) {
    return <Navigate to="/user/map" replace state={{ error }} />;
  }

  const showDetailProfile = hasGymDetailProfile(gym);
  const showNaverLink = hasNaverExternalLink(gym);
  const fromNaver = isNaverSourcedGym(gym);

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
        {gym.photos.length > 0 ? (
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
        ) : (
          <div className="gym-detail-gallery gym-detail-gallery-placeholder" aria-hidden="true">
            <GymThumbnail gym={gym} size="md" />
            <p>사진 정보 준비 중</p>
          </div>
        )}

        <div className="gym-detail-head">
          <div className="gym-detail-badges">
            <div className="gym-detail-badge-row">
              <span className="status-badge badge-red">{gym.type}</span>
              {fromNaver && (
                <span className="gym-source-badge">네이버 연동</span>
              )}
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
            {hasGymRating(gym) && (
              <span>
                <Star size={14} />
                {gym.rating.toFixed(1)}
              </span>
            )}
            <span>
              <MapPin size={14} />
              {gym.address}
            </span>
          </div>
          {gym.tags.length > 0 && (
            <div className="gym-tags">
              {gym.tags.map((tag) => (
                <span key={tag} className="gym-tag">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {!showDetailProfile && (
        <section className="gym-naver-notice panel" aria-label="상세 정보 안내">
          <div className="gym-naver-notice-head">
            <Info size={18} aria-hidden="true" />
            <div>
              <h2>상세 정보 준비 중</h2>
              <p>
                운영 시간, 비용, 보유 기구 등은 FitCheck에 아직 등록되지 않았습니다.
                {fromNaver
                  ? ' 네이버 지도에서 최신 정보를 확인해 보세요.'
                  : ' 헬스장 등록이 완료되면 이곳에 표시됩니다.'}
              </p>
            </div>
          </div>
          {showNaverLink && (
            <a
              href={gym.externalLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary gym-naver-link-btn"
            >
              <ExternalLink size={16} />
              네이버 지도에서 더보기
            </a>
          )}
        </section>
      )}

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
                {gym.hours.trim() ? <p>{gym.hours}</p> : <InfoPlaceholder />}
              </div>
            </li>
            <li>
              <span className="gym-info-icon">
                <Wallet size={16} />
              </span>
              <div>
                <strong>비용</strong>
                {gym.price.trim() ? <p>{gym.price}</p> : <InfoPlaceholder />}
              </div>
            </li>
            <li>
              <span className="gym-info-icon">
                <Dumbbell size={16} />
              </span>
              <div>
                <strong>보유 기구</strong>
                {gym.equipment.length > 0 ? (
                  <div className="gym-chip-row">
                    {gym.equipment.map((item) => (
                      <span key={item} className="gym-tag">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <InfoPlaceholder />
                )}
              </div>
            </li>
            <li>
              <span className="gym-info-icon">
                <Sparkles size={16} />
              </span>
              <div>
                <strong>편의 시설</strong>
                {gym.amenities.length > 0 ? (
                  <div className="gym-chip-row">
                    {gym.amenities.map((item) => (
                      <span key={item} className="gym-tag">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <InfoPlaceholder />
                )}
              </div>
            </li>
          </ul>
        </section>
      )}

      {tab === 'trainers' && (
        <section className="gym-trainer-grid" role="tabpanel">
          {gym.trainers.length > 0 ? (
            gym.trainers.map((trainer) => (
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
            ))
          ) : (
            <div className="gym-trainer-empty panel">
              <p>등록된 트레이너 정보가 아직 없습니다.</p>
              {showNaverLink && (
                <a
                  href={gym.externalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost gym-trainer-empty-link"
                >
                  <ExternalLink size={14} />
                  네이버 지도에서 문의하기
                </a>
              )}
            </div>
          )}
        </section>
      )}

      <div className="gym-detail-actions">
        {showNaverLink && (
          <a
            href={gym.externalLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            <ExternalLink size={16} />
            네이버 지도
          </a>
        )}
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
