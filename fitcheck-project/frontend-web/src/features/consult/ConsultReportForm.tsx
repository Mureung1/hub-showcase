import { useEffect, useState } from 'react';
import type { ConsultRequest } from '../../types/consult';
import { formatRelativeTime } from '../../utils/date';
import './ConsultReportForm.css';

interface ConsultReportFormProps {
  request: ConsultRequest;
  onSave: (input: {
    trainerReportMemo: string;
    userFeedback: string;
    shareMemoWithMember: boolean;
  }) => void;
}

export default function ConsultReportForm({
  request,
  onSave,
}: ConsultReportFormProps) {
  const [memo, setMemo] = useState(request.trainerReportMemo ?? '');
  const [feedback, setFeedback] = useState(request.userFeedback ?? '');
  const [shareMemo, setShareMemo] = useState(request.shareMemoWithMember === true);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setMemo(request.trainerReportMemo ?? '');
    setFeedback(request.userFeedback ?? '');
    setShareMemo(request.shareMemoWithMember === true);
    setSavedFlash(false);
  }, [request.id, request.reportSavedAt]);

  const handleSave = () => {
    if (!memo.trim() && !feedback.trim()) {
      alert('상담 메모 또는 한 줄 피드백을 입력해 주세요.');
      return;
    }

    onSave({
      trainerReportMemo: memo,
      userFeedback: feedback,
      shareMemoWithMember: shareMemo,
    });
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2200);
  };

  return (
    <div className="consult-report-form">
      <div className="consult-report-form-head">
        <div>
          <h3>상담 리포트 & 피드백</h3>
          <p>오프라인 상담 메모와 회원에게 전달할 한 줄 총평을 남겨 주세요.</p>
        </div>
        {request.reportSavedAt && (
          <span className="consult-report-saved">
            저장됨 · {formatRelativeTime(request.reportSavedAt)}
          </span>
        )}
      </div>

      <label className="consult-report-field">
        <span>오프라인 상담 메모</span>
        <textarea
          className="form-input"
          rows={4}
          placeholder="상담 중 확인한 내용, 다음 루틴 제안 등"
          value={memo}
          onChange={(event) => setMemo(event.target.value)}
        />
      </label>

      <div className="consult-report-share">
        <div>
          <strong>상담 메모를 회원에게 보여주기</strong>
          <p>켜면 회원 앱 헬스장 상세에서 메모를 확인할 수 있습니다.</p>
        </div>
        <button
          type="button"
          className={`consult-report-switch${shareMemo ? ' is-on' : ''}`}
          role="switch"
          aria-checked={shareMemo}
          aria-label="상담 메모 회원 공개"
          onClick={() => setShareMemo((prev) => !prev)}
        >
          <span className="consult-report-switch-thumb" />
        </button>
      </div>

      <label className="consult-report-field">
        <span>회원 전달 한 줄 피드백</span>
        <input
          className="form-input"
          type="text"
          maxLength={120}
          placeholder="예: 이번 주는 단백질을 조금 더 챙겨보면 좋아요!"
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
        />
      </label>

      <div className="consult-report-actions">
        <button type="button" className="btn btn-primary" onClick={handleSave}>
          저장하기
        </button>
        {savedFlash && (
          <span className="consult-report-flash">회원 앱으로 전달 준비 완료</span>
        )}
      </div>
    </div>
  );
}
