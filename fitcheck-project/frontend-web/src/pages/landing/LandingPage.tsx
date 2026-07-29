import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Building2,
  Camera,
  HeartHandshake,
  Lock,
  MapPin,
  Sparkles,
  UtensilsCrossed,
  Wallet,
  Megaphone,
  Link2,
} from 'lucide-react';
import LandingCta from '../../components/landing/LandingCta';
import Reveal from '../../components/landing/Reveal';
import './landing.css';

const SOLUTIONS = [
  {
    icon: BookOpen,
    title: '스마트 비대면 셀프 케어',
    desc: '부위·목적별 맞춤 VOD 강좌와 AI 식단 피드백으로 혼자서도 체계적으로 관리해요.',
    color: 'coral',
  },
  {
    icon: MapPin,
    title: '로컬 오프라인 매칭',
    desc: '지도에서 주변 동네 헬스장·프리랜서 트레이너를 찾고 상담까지 신청할 수 있어요.',
    color: 'lime',
  },
  {
    icon: Link2,
    title: 'O2O Bridge',
    desc: '비대면 운동·식단 기록이 오프라인 상담으로 자연스럽게 이어져요.',
    color: 'coral',
  },
] as const;

const PAINS = [
  {
    icon: Wallet,
    title: 'PT, 시작하기 전에 막막해요',
    desc: '수십~수백만 원대 비용 부담과 정보 파편화 때문에 운동을 미루게 돼요.',
  },
  {
    icon: Megaphone,
    title: '동네 헬스장, 알리기가 어려워요',
    desc: '대형 프랜차이즈와 달리 신규 회원을 만날 채널이 부족해요.',
  },
] as const;

export default function LandingPage() {
  const [compareTab, setCompareTab] = useState<'user' | 'business'>('user');

  return (
    <div className="landing-page">
      <header className="landing-nav">
        <Link to="/" className="landing-nav-brand">
          <span className="landing-logo-mark">F</span>
          <span>FitCheck</span>
        </Link>
        <nav className="landing-nav-links" aria-label="랜딩 내비게이션">
          <a href="#solution">기능</a>
          <a href="#compare">비교</a>
          <a href="#preview">미리보기</a>
          <a href="#business">사장님</a>
        </nav>
        <LandingCta variant="secondary" className="landing-nav-cta">
          시작하기
        </LandingCta>
      </header>

      {/* 1. Hero */}
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <Reveal>
            <p className="landing-eyebrow">비대면 피드백 × 위치 기반 매칭</p>
            <h1 className="landing-hero-title">
              PT 없이도,
              <br />
              체계적으로 시작하세요
            </h1>
            <p className="landing-hero-sub">
              맞춤 강좌 · AI 식단 · 동네 헬스장 매칭까지.
              <br />
              골목상권과 상생하는 스마트 피트니스 플랫폼 FitCheck
            </p>
            <div className="landing-hero-actions">
              <LandingCta>무료로 시작하기</LandingCta>
              <a href="#solution" className="landing-cta landing-cta-ghost">
                어떻게 다른지 보기
                <ArrowRight size={16} />
              </a>
            </div>
          </Reveal>
          <Reveal className="landing-hero-visual" delay={120}>
            <div className="landing-hero-phone">
              <div className="landing-phone-screen">
                <div className="landing-phone-greeting">안녕하세요, 민지님</div>
                <div className="landing-phone-card landing-phone-card--lime">
                  <span className="landing-phone-tag">오늘의 루틴</span>
                  <strong>하체 스트레칭 15분</strong>
                </div>
                <div className="landing-phone-card">
                  <span>오늘 식단</span>
                  <strong className="landing-phone-kcal">1,240 kcal</strong>
                </div>
                <div className="landing-phone-card landing-phone-card--map">
                  <MapPin size={14} />
                  <span>800m · XX헬스장 매칭</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 2. Pain Point */}
      <section className="landing-section landing-pain" id="pain">
        <div className="landing-container">
          <Reveal>
            <h2 className="landing-section-title">이런 고민, 있으신가요?</h2>
            <p className="landing-section-sub">
              운동 입문자와 동네 헬스장 모두에게 남아 있는 문제예요.
            </p>
          </Reveal>
          <div className="landing-pain-grid">
            {PAINS.map((pain, i) => (
              <Reveal key={pain.title} delay={i * 80}>
                <article className="landing-pain-card">
                  <span className="landing-pain-icon" aria-hidden="true">
                    <pain.icon size={22} />
                  </span>
                  <h3>{pain.title}</h3>
                  <p>{pain.desc}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Solution */}
      <section className="landing-section landing-solution" id="solution">
        <div className="landing-container">
          <Reveal>
            <h2 className="landing-section-title">FitCheck 3대 핵심 시스템</h2>
            <p className="landing-section-sub">
              비대면으로 시작하고, 필요할 때 동네 전문가와 연결돼요.
            </p>
          </Reveal>
          <div className="landing-solution-grid">
            {SOLUTIONS.map((item, i) => (
              <Reveal key={item.title} delay={i * 100}>
                <article className={`landing-solution-card landing-solution-card--${item.color}`}>
                  <span className="landing-solution-icon" aria-hidden="true">
                    <item.icon size={24} />
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Before / After */}
      <section className="landing-section landing-compare" id="compare">
        <div className="landing-container">
          <Reveal>
            <h2 className="landing-section-title">Before → After</h2>
            <p className="landing-section-sub">누구에게나 더 가까운 피트니스 경험</p>
          </Reveal>
          <div className="landing-compare-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={compareTab === 'user'}
              className={compareTab === 'user' ? 'is-active' : ''}
              onClick={() => setCompareTab('user')}
            >
              일반 사용자
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={compareTab === 'business'}
              className={compareTab === 'business' ? 'is-active' : ''}
              onClick={() => setCompareTab('business')}
            >
              트레이너·헬스장
            </button>
          </div>
          <Reveal>
            {compareTab === 'user' ? (
              <div className="landing-compare-table">
                <div className="landing-compare-row landing-compare-header">
                  <span>구분</span>
                  <span>기존</span>
                  <span>FitCheck</span>
                </div>
                <div className="landing-compare-row">
                  <span>비용</span>
                  <span className="landing-compare-before">PT 수십~수백만 원</span>
                  <span className="landing-compare-after">맞춤 강좌 + AI 식단으로 저비용 시작</span>
                </div>
                <div className="landing-compare-row">
                  <span>정보</span>
                  <span className="landing-compare-before">운동·식단 정보 파편화</span>
                  <span className="landing-compare-after">한 앱에서 기록·피드백·추천</span>
                </div>
                <div className="landing-compare-row">
                  <span>연결</span>
                  <span className="landing-compare-before">헬스장 찾기 어려움</span>
                  <span className="landing-compare-after">지도 기반 동네 센터·트레이너 추천</span>
                </div>
              </div>
            ) : (
              <div className="landing-compare-table">
                <div className="landing-compare-row landing-compare-header">
                  <span>구분</span>
                  <span>기존</span>
                  <span>FitCheck</span>
                </div>
                <div className="landing-compare-row">
                  <span>회원 유치</span>
                  <span className="landing-compare-before">홍보 채널·비용 부담</span>
                  <span className="landing-compare-after">지역 진성 고객과 비용 없이 매칭</span>
                </div>
                <div className="landing-compare-row">
                  <span>상담</span>
                  <span className="landing-compare-before">기록 없이 구두 상담만</span>
                  <span className="landing-compare-after">비대면 식단·운동 기록 공유</span>
                </div>
                <div className="landing-compare-row">
                  <span>관리</span>
                  <span className="landing-compare-before">엑셀·카톡으로 분산</span>
                  <span className="landing-compare-after">트레이너 대시보드로 통합</span>
                </div>
              </div>
            )}
          </Reveal>
        </div>
      </section>

      {/* 5. App Preview */}
      <section className="landing-section landing-preview" id="preview">
        <div className="landing-container">
          <Reveal>
            <h2 className="landing-section-title">실제 사용 화면 미리보기</h2>
            <p className="landing-section-sub">모바일 웹에서도 그대로, 바로 사용할 수 있어요.</p>
          </Reveal>
          <div className="landing-preview-grid">
            {[
              { icon: BookOpen, label: '강좌 리스트', hint: '부위·목적별 VOD' },
              { icon: Camera, label: 'AI 식단 피드백', hint: '사진 한 장으로 분석' },
              { icon: MapPin, label: '지도 매칭', hint: '주변 헬스장·트레이너' },
            ].map((item, i) => (
              <Reveal key={item.label} delay={i * 100}>
                <article className="landing-preview-card">
                  <div className="landing-preview-mock">
                    <item.icon size={28} strokeWidth={1.5} />
                  </div>
                  <h3>{item.label}</h3>
                  <p>{item.hint}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Trust */}
      <section className="landing-section landing-trust">
        <div className="landing-container">
          <Reveal>
            <div className="landing-trust-card">
              <Lock size={22} aria-hidden="true" />
              <div>
                <h3>민감한 정보도 안심하고 맡기세요</h3>
                <p>
                  식단 사진과 상담 정보는 AES-256-GCM 암호화로 보호돼요. 기술 용어는
                  몰라도 괜찮아요 — FitCheck가 안전하게 지켜드릴게요.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 7. B2B */}
      <section className="landing-section landing-business" id="business">
        <div className="landing-container landing-business-inner">
          <Reveal>
            <span className="landing-business-badge">
              <Building2 size={14} />
              소상공인을 위한
            </span>
            <h2 className="landing-section-title">
              우리 동네 헬스장도
              <br />
              무료로 등록해 보세요
            </h2>
            <p className="landing-section-sub">
              프리랜서 트레이너, 골목 헬스장 사장님 — 신규 회원 유치가 필요하다면 FitCheck
              트레이너 대시보드로 상담 요청과 식단 피드백을 한곳에서 관리하세요.
            </p>
            <div className="landing-business-actions">
              <Link to="/trainer" className="btn btn-secondary landing-cta">
                트레이너 대시보드 보기
              </Link>
              <a href="mailto:hello@fitcheck.app" className="landing-cta landing-cta-ghost">
                입점 문의하기
              </a>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <ul className="landing-business-list">
              <li>
                <HeartHandshake size={18} />
                지역 기반 매칭으로 진성 고객 연결
              </li>
              <li>
                <UtensilsCrossed size={18} />
                회원 식단·운동 기록 기반 상담
              </li>
              <li>
                <Sparkles size={18} />
                별도 광고비 없이 노출
              </li>
            </ul>
          </Reveal>
        </div>
      </section>

      {/* 8. Final CTA + Footer */}
      <section className="landing-final">
        <div className="landing-container landing-final-inner">
          <Reveal>
            <h2>오늘부터, 부담 없이 시작해 보세요</h2>
            <p>옆집 트레이너가 알려주듯 — FitCheck가 함께할게요.</p>
            <LandingCta className="landing-final-cta">무료로 시작하기</LandingCta>
          </Reveal>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <div className="landing-footer-brand">
            <span className="landing-logo-mark">F</span>
            <span>FitCheck</span>
          </div>
          <p className="landing-footer-copy">
            비대면 피드백과 위치 기반 매칭으로 PT 진입 장벽을 낮추는 스마트 피트니스 플랫폼
          </p>
          <div className="landing-footer-links">
            <Link to="/login">로그인</Link>
            <Link to="/signup">회원가입</Link>
            <a href="mailto:hello@fitcheck.app">문의하기</a>
          </div>
          <p className="landing-footer-legal">© 2026 FitCheck. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
