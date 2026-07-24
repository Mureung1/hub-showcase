import { useState } from 'react';
import './ActivityLog.css';
import { formatLogTime } from '../utils/date';

const STATUS_LABEL = { pending: '대기', in_progress: '진행', done: '완료' };

function ActivityLog({ logs }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="activity-log">
      <button
        type="button"
        className="activity-log-toggle-btn"
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? '활동 로그 숨기기' : '활동 로그 보기'}
      </button>

      {isOpen && (
        <div className="activity-log-list">
          {logs.length === 0 ? (
            <div className="activity-log-empty">아직 활동 기록이 없어요.</div>
          ) : (
            logs.map((log) => {
              const fromLabel = STATUS_LABEL[log.previous_status] || log.previous_status;
              const toLabel = STATUS_LABEL[log.new_status] || log.new_status;

              return (
                <div className="activity-log-item" key={log.id}>
                  <span className="activity-log-text">
                    <strong>{log.member_name || '알 수 없음'}</strong>
                    {`님이 '${log.task_title}'를 ${fromLabel} → ${toLabel}로 변경`}
                  </span>
                  <span className="activity-log-time">{formatLogTime(log.changed_at)}</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default ActivityLog;
