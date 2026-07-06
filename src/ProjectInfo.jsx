import React from 'react';
import './ProjectInfo.css';

const ProjectInfo = () => {
  return (
    <div className="intro-container">
      <div className="intro-content">
        <span className="badge">스마트한 금융 생활</span>
        <h1 className="title">내 구독에 꼭 맞는<br />체크카드 혜택 찾기</h1>
        <p className="description">
          매달 빠져나가는 구독료, 혜택은 다 챙기고 계신가요?<br />
          나의 구독 리스트를 분석해 캐시백을 극대화할 수 있는 카드를 찾아드려요.
        </p>
        
        <div className="feature-list">
          <div className="feature-item">
            <span className="feature-icon">📱</span>
            <span className="feature-text">이용 중인 구독 서비스 한눈에 관리</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">💸</span>
            <span className="feature-text">구독료 기반 맞춤형 캐시백 카드 1순위 추천</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">✨</span>
            <span className="feature-text">교통, 식비 등 원하는 추가 혜택 맞춤 필터링</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectInfo;