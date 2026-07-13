import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, LineChart, GraduationCap, LogOut, ArrowRight, BookOpen, Award, CheckCircle } from 'lucide-react';

function Portal({ user, onLogout }) {
  const navigate = useNavigate();

  // Helper to get student type label
  const getStudentTypeLabel = (type) => {
    switch (type) {
      case 'transfer': return '편입생';
      case 'general': return '일반재학생';
      case 'double-major': return '다전공자';
      default: return '학생';
    }
  };

  return (
    <div className="portal-container">
      {/* Top Navbar */}
      <header className="portal-header card-glass">
        <div className="portal-logo" onClick={() => navigate('/portal')}>
          <GraduationCap className="logo-icon text-indigo" size={28} />
          <span className="logo-text">GNU AI PORTAL</span>
        </div>
        
        <div className="portal-user-menu">
          <div className="user-profile-badge">
            <span className={`status-dot animate-pulse`}></span>
            <span className="profile-name">{user?.name || '김경상'}</span>
            <span className="profile-tag">{getStudentTypeLabel(user?.studentType)}</span>
          </div>
          <button onClick={onLogout} className="btn-logout" title="로그아웃">
            <LogOut size={16} />
            <span>로그아웃</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="portal-main">
        <section className="welcome-banner animate-fade-in-up">
          <h2>안녕하세요, {user?.name || '김경상'}님!</h2>
          <p>GNU AI 네비게이터 포털에 오신 것을 환영합니다. 원하시는 학업 도구를 선택하세요.</p>
        </section>

        <div className="portal-cards-grid">
          {/* Card 1: Timetable Portal */}
          <div 
            className="portal-card card-glass animate-fade-in-up" 
            style={{ animationDelay: '100ms' }}
            onClick={() => navigate('/timetable')}
          >
            <div className="card-decor-glow red-glow"></div>
            <div className="card-icon-wrapper timetable-icon-bg">
              <Calendar className="card-icon" size={32} />
            </div>
            
            <div className="card-content">
              <h3>시간표 생성 포털</h3>
              <p className="card-desc">
                학생의 기이수 과목 데이터를 기반으로 졸업 필수 누락 영역을 진단하고, 
                AI 맞춤형 시간표 초안 및 교과목 추천을 실시간으로 설계합니다.
              </p>
              
              <div className="card-tags">
                <span className="tag-item"><CheckCircle size={12} /> AI 추천 알고리즘</span>
                <span className="tag-item"><CheckCircle size={12} /> 실시간 요건 진단</span>
                <span className="tag-item"><CheckCircle size={12} /> 1:1 수강 상담</span>
              </div>
              
              <button className="card-action-btn">
                <span>시간표 설계 시작</span>
                <ArrowRight size={16} className="arrow" />
              </button>
            </div>
          </div>

          {/* Card 2: Analytics Portal */}
          <div 
            className="portal-card card-glass animate-fade-in-up" 
            style={{ animationDelay: '200ms' }}
            onClick={() => navigate('/analytics')}
          >
            <div className="card-decor-glow blue-glow"></div>
            <div className="card-icon-wrapper analytics-icon-bg">
              <LineChart className="card-icon" size={32} />
            </div>
            
            <div className="card-content">
              <h3>학점 분석 포털</h3>
              <p className="card-desc">
                학기별 성적 추이(GPA)를 한눈에 파악할 수 있는 인터랙티브 그래프를 제공하며, 
                이수 구분별 취득 학점 현황 및 졸업 잔여 학점을 정밀 분석합니다.
              </p>
              
              <div className="card-tags">
                <span className="tag-item"><Award size={12} /> 성적 추이 그래프</span>
                <span className="tag-item"><Award size={12} /> 취득 학점 시각화</span>
                <span className="tag-item"><Award size={12} /> 졸업 요건 감사</span>
              </div>
              
              <button className="card-action-btn analytics-btn">
                <span>성적 분석 확인</span>
                <ArrowRight size={16} className="arrow" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="portal-footer">
        <p>© 2026 경상국립대학교 AI 학업 네비게이터 시스템 (GNU AI Navigator)</p>
      </footer>
    </div>
  );
}

export default Portal;
