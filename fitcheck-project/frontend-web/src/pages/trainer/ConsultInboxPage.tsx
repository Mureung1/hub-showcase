import { useState } from 'react';
import { ClipboardList, Inbox } from 'lucide-react';
import { useConsultRequests } from '../../hooks/useConsultRequests';
import { formatDateKo, formatRelativeTime } from '../../utils/date';
import type { ConsultRequest } from '../../types/consult';
import './ConsultInboxPage.css';

function topicLabel(request: ConsultRequest): string {
  if (request.topic === '기타' && request.topicDetail) {
    return `기타 (${request.topicDetail})`;
  }
  return request.topic;
}

export default function ConsultInboxPage() {
  const { requests, pendingCount, markRead, markAllRead } = useConsultRequests();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = requests.find((item) => item.id === selectedId) ?? null;

  const handleSelect = (id: string) => {
    setSelectedId(id);
    const target = requests.find((item) => item.id === id);
    if (target?.status === 'pending') {
      markRead(id);
    }
  };

  return (
    <div className="consult-inbox-page">
      <div className="page-header consult-inbox-header">
        <div>
          <h1>상담 신청</h1>
          <p>회원이 남긴 상담 신청을 확인하고 일정을 조율하세요.</p>
        </div>
        {pendingCount > 0 && (
          <button type="button" className="btn btn-secondary" onClick={markAllRead}>
            모두 읽음
          </button>
        )}
      </div>

      <div className="consult-inbox-layout">
        <section className="consult-inbox-list-panel">
          <h2>
            수신함
            {pendingCount > 0 && (
              <span className="consult-inbox-count">{pendingCount}</span>
            )}
          </h2>

          {requests.length === 0 ? (
            <div className="consult-inbox-empty">
              <Inbox size={28} strokeWidth={1.75} />
              <p>아직 접수된 상담 신청이 없습니다.</p>
              <span>회원 앱에서 상담을 신청하면 여기에 표시됩니다.</span>
            </div>
          ) : (
            <ul className="consult-inbox-list">
              {requests.map((request) => (
                <li key={request.id}>
                  <button
                    type="button"
                    className={`consult-inbox-item${selectedId === request.id ? ' selected' : ''}${request.status === 'pending' ? ' is-pending' : ''}`}
                    onClick={() => handleSelect(request.id)}
                  >
                    <span className="consult-inbox-avatar" aria-hidden="true">
                      {request.name.slice(0, 1)}
                    </span>
                    <div className="consult-inbox-item-body">
                      <div className="consult-inbox-item-top">
                        <span className="consult-inbox-name">{request.name}</span>
                        {request.status === 'pending' && (
                          <span className="consult-inbox-new">NEW</span>
                        )}
                      </div>
                      <span className="consult-inbox-meta">
                        {request.gymName}
                        {request.trainerName ? ` · ${request.trainerName}` : ''}
                      </span>
                      <span className="consult-inbox-meta">
                        {request.date} {request.time} · {topicLabel(request)}
                      </span>
                      {request.shareHistoryConsent && (
                        <span className="consult-inbox-share-chip">기록 공유</span>
                      )}
                    </div>
                    <time className="consult-inbox-time">
                      {formatRelativeTime(request.createdAt)}
                    </time>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="consult-inbox-detail-panel">
          {!selected ? (
            <div className="consult-inbox-detail-empty">
              <ClipboardList size={28} strokeWidth={1.75} />
              <p>신청을 선택하면 상세 내용이 표시됩니다.</p>
            </div>
          ) : (
            <>
              <div className="consult-inbox-detail-header">
                <span className="consult-inbox-detail-avatar" aria-hidden="true">
                  {selected.name.slice(0, 1)}
                </span>
                <div>
                  <h2>{selected.name}</h2>
                  <p>{selected.phone}</p>
                </div>
                <span
                  className={`consult-inbox-status ${selected.status === 'pending' ? 'pending' : 'read'}`}
                >
                  {selected.status === 'pending' ? '미확인' : '확인됨'}
                </span>
              </div>

              <dl className="consult-inbox-fields">
                <div>
                  <dt>헬스장</dt>
                  <dd>{selected.gymName}</dd>
                </div>
                <div>
                  <dt>담당 트레이너</dt>
                  <dd>{selected.trainerName ?? '미지정 (헬스장 공통 신청)'}</dd>
                </div>
                <div>
                  <dt>희망 일정</dt>
                  <dd>
                    {formatDateKo(selected.date)} {selected.time}
                  </dd>
                </div>
                <div>
                  <dt>상담 주제</dt>
                  <dd>{topicLabel(selected)}</dd>
                </div>
                <div>
                  <dt>신청 시각</dt>
                  <dd>{formatRelativeTime(selected.createdAt)}</dd>
                </div>
                <div>
                  <dt>기록 공유</dt>
                  <dd>
                    <span
                      className={`consult-inbox-share-status ${selected.shareHistoryConsent ? 'is-on' : 'is-off'}`}
                    >
                      {selected.shareHistoryConsent
                        ? '동의함 · 연동 중'
                        : '미동의'}
                    </span>
                  </dd>
                </div>
                <div className="consult-inbox-memo">
                  <dt>메모</dt>
                  <dd>{selected.memo || '없음'}</dd>
                </div>
              </dl>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
