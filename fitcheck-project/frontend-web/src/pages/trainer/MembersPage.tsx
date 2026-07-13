import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../hooks/useAppStore';
import { STATUS_LABEL } from '../../utils/signal';
import { formatDateKo } from '../../utils/date';
import './MembersPage.css';

export default function MembersPage() {
  const {
    members,
    searchQuery,
    data,
    sendAlert,
    sendMessage,
    markContactComplete,
    setSelectedMemberId,
  } = useAppStore();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');

  const filtered = members.filter(
    (m) =>
      searchQuery === '' ||
      m.name.includes(searchQuery) ||
      m.goal.includes(searchQuery),
  );

  const selected = members.find((m) => m.id === selectedId);
  const logs = selected
    ? data.communicationLogs.filter((l) => l.memberId === selected.id)
    : [];

  const handleSendMessage = () => {
    if (!selected || !messageText.trim()) return;
    sendMessage(selected.id, messageText);
    setMessageText('');
  };

  return (
    <div className="members-page">
      <div className="page-header">
        <h1>회원 관리</h1>
        <p>회원님들의 상태와 이력을 통해 관리하세요.</p>
      </div>

      <div className="members-layout">
        <section className="members-list-panel">
          <h2>회원 목록 ({filtered.length})</h2>
          <ul className="members-list">
            {filtered.map((member) => (
              <li key={member.id}>
                <button
                  type="button"
                  className={`member-list-item ${selectedId === member.id ? 'selected' : ''} status-${member.status}`}
                  onClick={() => setSelectedId(member.id)}
                >
                  <span className="member-list-avatar">{member.avatar}</span>
                  <div className="member-list-info">
                    <span className="member-list-name">{member.name}</span>
                    <span className="member-list-goal">{member.goal}</span>
                  </div>
                  <span className={`status-badge badge-${member.status}`}>
                    {STATUS_LABEL[member.status]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="member-detail-panel">
          {!selected ? (
            <div className="detail-empty">
              <p>회원을 선택하면 상세 정보가 표시됩니다.</p>
            </div>
          ) : (
            <>
              <div className="detail-header">
                <span className="detail-avatar">{selected.avatar}</span>
                <div>
                  <h2>{selected.name}</h2>
                  <p>{selected.goal}</p>
                </div>
                <span className={`status-badge badge-${selected.status}`}>
                  {STATUS_LABEL[selected.status]}
                </span>
              </div>

              <div className="detail-stats">
                <div className="detail-stat">
                  <span className="detail-stat-label">마지막 소통</span>
                  <span className="detail-stat-value">
                    {formatDateKo(selected.lastContactDate)}
                  </span>
                </div>
                <div className="detail-stat">
                  <span className="detail-stat-label">무응답 일수</span>
                  <span className="detail-stat-value">
                    {selected.daysSinceContact === 0
                      ? '오늘'
                      : `${selected.daysSinceContact}일`}
                  </span>
                </div>
              </div>

              <div className="detail-actions">
                {selected.status !== 'green' && (
                  <button
                    type="button"
                    className="btn-alert"
                    onClick={() => sendAlert(selected.id)}
                  >
                    푸시 알림 전송
                  </button>
                )}
                <button
                  type="button"
                  className="btn-contact-done"
                  onClick={() => markContactComplete(selected.id)}
                >
                  연락 완료
                </button>
                <button
                  type="button"
                  className="btn-routine-link"
                  onClick={() => {
                    setSelectedMemberId(selected.id);
                    navigate('/routine');
                  }}
                >
                  루틴 관리 →
                </button>
              </div>

              <div className="message-compose">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="회원에게 메시지 보내기..."
                  rows={2}
                />
                <button
                  type="button"
                  className="btn-send-msg"
                  onClick={handleSendMessage}
                >
                  메시지 전송
                </button>
              </div>

              <div className="comm-log">
                <h3>소통 이력</h3>
                {logs.length === 0 ? (
                  <p className="log-empty">소통 이력이 없습니다.</p>
                ) : (
                  <ul>
                    {logs.map((log) => (
                      <li key={log.id} className={`log-item log-${log.type}`}>
                        <span className="log-type">
                          {log.type === 'alert' && '🔔'}
                          {log.type === 'message' && '💬'}
                          {log.type === 'guide' && '🏋️'}
                          {log.type === 'feedback' && '🍽️'}
                        </span>
                        <div>
                          <p>{log.message}</p>
                          <time>
                            {new Date(log.createdAt).toLocaleString('ko-KR')}
                          </time>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
