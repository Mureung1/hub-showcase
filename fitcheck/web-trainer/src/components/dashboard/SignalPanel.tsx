import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../hooks/useAppStore';
import type { SignalStatus } from '../../types';
import { STATUS_LABEL } from '../../utils/signal';
import './SignalPanel.css';

const ALERT_TEMPLATES = [
  '운동/식단 체크 부탁드려요!',
  '오랜만이에요! 오늘 운동 가능하신가요?',
  '식단 사진 업로드 부탁드려요!',
];

export default function SignalPanel() {
  const {
    members,
    searchQuery,
    sendAlert,
    sendMessage,
    setSelectedMemberId,
  } = useAppStore();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | SignalStatus>('all');
  const [alertModal, setAlertModal] = useState<string | null>(null);
  const [messageModal, setMessageModal] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState('');

  const filtered = members.filter((m) => {
    const matchesFilter = filter === 'all' || m.status === filter;
    const matchesSearch =
      searchQuery === '' ||
      m.name.includes(searchQuery) ||
      m.goal.includes(searchQuery);
    return matchesFilter && matchesSearch;
  });

  const handleAlert = (memberId: string, template: string) => {
    sendAlert(memberId, template);
    setAlertModal(null);
  };

  const handleMessage = (memberId: string) => {
    sendMessage(memberId, customMessage);
    setCustomMessage('');
    setMessageModal(null);
  };

  const selectForRoutine = (memberId: string) => {
    setSelectedMemberId(memberId);
    navigate('/routine');
  };

  return (
    <section className="panel signal-panel">
      <div className="panel-header">
        <div>
          <h2>🚦 신호등 소통 대시보드</h2>
          <p>관리 공백 회원을 실시간 포착하고 즉시 알림을 보내세요</p>
        </div>
        <div className="filter-tabs">
          {(['all', 'red', 'yellow', 'green'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`filter-tab ${filter === tab ? 'active' : ''}`}
              onClick={() => setFilter(tab)}
            >
              {tab === 'all' && '전체'}
              {tab === 'red' && '🔴 주의'}
              {tab === 'yellow' && '🟡 관심'}
              {tab === 'green' && '🟢 정상'}
            </button>
          ))}
        </div>
      </div>

      <ul className="member-list">
        {filtered.length === 0 ? (
          <li className="empty-state">검색 결과가 없습니다.</li>
        ) : (
          filtered.map((member) => (
            <li
              key={member.id}
              className={`member-card status-${member.status}`}
            >
              <div className="member-avatar">{member.avatar}</div>
              <div className="member-info">
                <div className="member-top">
                  <span className="member-name">{member.name}</span>
                  <span className={`status-badge badge-${member.status}`}>
                    {STATUS_LABEL[member.status]}
                  </span>
                </div>
                <p className="member-meta">
                  {member.daysSinceContact === 0
                    ? '오늘 소통함'
                    : `${member.daysSinceContact}일간 무응답`}
                  {' · '}
                  {member.goal}
                </p>
              </div>
              <div className="member-actions">
                {member.status === 'red' && (
                  <button
                    type="button"
                    className="btn-action btn-red"
                    onClick={() => setAlertModal(member.id)}
                  >
                    푸시 알림
                  </button>
                )}
                {member.status === 'yellow' && (
                  <button
                    type="button"
                    className="btn-action btn-yellow"
                    onClick={() => setMessageModal(member.id)}
                  >
                    메시지 보내기
                  </button>
                )}
                <button
                  type="button"
                  className="btn-select"
                  onClick={() => selectForRoutine(member.id)}
                >
                  루틴 →
                </button>
              </div>
            </li>
          ))
        )}
      </ul>

      {alertModal && (
        <div className="modal-overlay" onClick={() => setAlertModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>푸시 알림 템플릿 선택</h3>
            <div className="template-list">
              {ALERT_TEMPLATES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className="template-btn"
                  onClick={() => handleAlert(alertModal, t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="modal-close"
              onClick={() => setAlertModal(null)}
            >
              취소
            </button>
          </div>
        </div>
      )}

      {messageModal && (
        <div className="modal-overlay" onClick={() => setMessageModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>메시지 보내기</h3>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="회원에게 보낼 메시지를 입력하세요..."
              rows={3}
            />
            <div className="modal-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => handleMessage(messageModal)}
              >
                전송
              </button>
              <button
                type="button"
                className="modal-close"
                onClick={() => setMessageModal(null)}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
