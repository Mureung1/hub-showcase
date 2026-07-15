import { useEffect, useId, useState } from 'react';
import type { FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { addConsultRequest } from '../../data/consultStorage';
import type { GymPlace, GymTrainer } from '../../data/userMock';
import { CONSULT_TOPICS, type ConsultTopic } from '../../types/consult';
import './consult.css';

interface ConsultRequestSheetProps {
  open: boolean;
  gym: GymPlace;
  trainer?: GymTrainer | null;
  onClose: () => void;
}

function todayIsoDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

const INITIAL_FORM = {
  name: '',
  phone: '',
  date: todayIsoDate(),
  time: '18:00',
  topic: '다이어트' as ConsultTopic,
  topicDetail: '',
  memo: '',
};

export default function ConsultRequestSheet({
  open,
  gym,
  trainer = null,
  onClose,
}: ConsultRequestSheetProps) {
  const titleId = useId();
  const [form, setForm] = useState(INITIAL_FORM);

  useEffect(() => {
    if (!open) return;

    setForm({
      ...INITIAL_FORM,
      date: todayIsoDate(),
    });

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open, gym.id, trainer?.id]);

  if (!open) return null;

  const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim() || !form.phone.trim() || !form.date || !form.time) {
      alert('이름, 연락처, 희망 날짜/시간을 모두 입력해 주세요.');
      return;
    }

    if (form.topic === '기타' && !form.topicDetail.trim()) {
      alert('기타 상담 내용을 입력해 주세요.');
      return;
    }

    const request = addConsultRequest({
      gymId: gym.id,
      gymName: gym.name,
      trainerId: trainer?.id ?? null,
      trainerName: trainer?.name ?? null,
      name: form.name.trim(),
      phone: form.phone.trim(),
      date: form.date,
      time: form.time,
      topic: form.topic,
      topicDetail: form.topic === '기타' ? form.topicDetail.trim() : '',
      memo: form.memo.trim(),
    });

    alert(
      [
        '상담 신청이 접수되었습니다.',
        '',
        `헬스장: ${request.gymName}`,
        request.trainerName ? `트레이너: ${request.trainerName}` : null,
        `희망: ${request.date} ${request.time}`,
        `주제: ${request.topic}${request.topicDetail ? ` (${request.topicDetail})` : ''}`,
        `신청자: ${request.name} / ${request.phone}`,
      ]
        .filter(Boolean)
        .join('\n'),
    );
    onClose();
  };

  return createPortal(
    <div className="consult-overlay" onClick={onClose} role="presentation">
      <div
        className="consult-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="consult-sheet-head">
          <div>
            <p className="consult-sheet-eyebrow">상담 신청</p>
            <h2 id={titleId}>{gym.name}</h2>
            <p className="consult-sheet-sub">
              {trainer
                ? `${trainer.name} 트레이너 · ${trainer.specialty}`
                : '희망 일정을 남겨주시면 확인 후 연락드립니다.'}
            </p>
          </div>
          <button
            type="button"
            className="consult-close"
            onClick={onClose}
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        <form className="consult-form" onSubmit={handleSubmit}>
          <label className="consult-field">
            <span className="form-label">이름</span>
            <input
              className="form-input"
              type="text"
              name="name"
              autoComplete="name"
              placeholder="홍길동"
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              required
            />
          </label>

          <label className="consult-field">
            <span className="form-label">연락처</span>
            <input
              className="form-input"
              type="tel"
              name="phone"
              autoComplete="tel"
              placeholder="010-1234-5678"
              value={form.phone}
              onChange={(event) => updateField('phone', event.target.value)}
              required
            />
          </label>

          <div className="consult-field-row">
            <label className="consult-field">
              <span className="form-label">희망 날짜</span>
              <input
                className="form-input"
                type="date"
                name="date"
                min={todayIsoDate()}
                value={form.date}
                onChange={(event) => updateField('date', event.target.value)}
                required
              />
            </label>
            <label className="consult-field">
              <span className="form-label">희망 시간</span>
              <input
                className="form-input"
                type="time"
                name="time"
                value={form.time}
                onChange={(event) => updateField('time', event.target.value)}
                required
              />
            </label>
          </div>

          <fieldset className="consult-field consult-topics">
            <legend className="form-label">상담 주제</legend>
            <div className="consult-chip-row" role="group" aria-label="상담 주제">
              {CONSULT_TOPICS.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  className={`consult-chip${form.topic === topic ? ' is-active' : ''}`}
                  onClick={() => updateField('topic', topic)}
                  aria-pressed={form.topic === topic}
                >
                  {topic}
                </button>
              ))}
            </div>
          </fieldset>

          {form.topic === '기타' && (
            <label className="consult-field">
              <span className="form-label">기타 내용</span>
              <input
                className="form-input"
                type="text"
                name="topicDetail"
                placeholder="상담받고 싶은 내용을 적어주세요"
                value={form.topicDetail}
                onChange={(event) => updateField('topicDetail', event.target.value)}
                required
              />
            </label>
          )}

          <label className="consult-field">
            <span className="form-label">메모 (선택)</span>
            <textarea
              className="form-input consult-memo"
              name="memo"
              rows={3}
              placeholder="운동 경험, 목표 체중 등"
              value={form.memo}
              onChange={(event) => updateField('memo', event.target.value)}
            />
          </label>

          <div className="consult-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="btn btn-primary">
              신청하기
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
