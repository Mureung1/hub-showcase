import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';

export default function EtcMenu() {
  const { go, fridge, servingMultiplier, bookmarkedIds } = useApp();
  const [imminentCount, setImminentCount] = useState(0);

  useEffect(() => { api.getExpiryAlerts().then((r) => setImminentCount(r.items.length)); }, [fridge]);

  return (
    <section className="screen active">
      <div className="appbar"><h1>기타</h1></div>
      <div className="content">
        <div className="card tap" onClick={() => go('bookmarked-recipes')}>
          <div className="menu-row">
            <span className="m-ico">❤️</span>
            <div className="m-info"><div className="t">찜한 레시피</div><div className="d">{bookmarkedIds.length}개 저장됨</div></div>
            <span className="arrow">›</span>
          </div>
        </div>
        <div className="card tap" onClick={() => go('expiry-alerts')}>
          <div className="menu-row">
            <span className="m-ico">⏰</span>
            <div className="m-info"><div className="t">유통기한 임박 알림</div><div className="d">임박 재료 {imminentCount}개 · 푸시 알림 설정</div></div>
            <span className="arrow">›</span>
          </div>
        </div>
        <div className="card tap" onClick={() => go('meal-plan-picker')}>
          <div className="menu-row">
            <span className="m-ico">📅</span>
            <div className="m-info"><div className="t">일주일 식단 루틴 추천</div><div className="d">먹고 싶은 메뉴 2가지를 고르면 한 주 식단을 통째로</div></div>
            <span className="arrow">›</span>
          </div>
        </div>
        <div className="card tap" onClick={() => go('prices')}>
          <div className="menu-row">
            <span className="m-ico">💰</span>
            <div className="m-info"><div className="t">식자재별 가격 정보</div><div className="d">오늘의 채소 평균가 · 매일 갱신</div></div>
            <span className="arrow">›</span>
          </div>
        </div>
        <div className="card tap" onClick={() => go('serving-size-setting')}>
          <div className="menu-row">
            <span className="m-ico">🍽️</span>
            <div className="m-info"><div className="t">내 인분 설정</div><div className="d">설정된 내 인분: {Number(servingMultiplier).toFixed(1)}인분</div></div>
            <span className="arrow">›</span>
          </div>
        </div>
      </div>
    </section>
  );
}
