import { useEffect, useState } from 'react';
import { Sparkles, Check, RefreshCw, Loader2, Cpu } from 'lucide-react';
import { useAppStore } from '../../hooks/useAppStore';
import { useRoutineRecommendation } from '../../hooks/useRoutineRecommendation';
import { OLLAMA_MODEL } from '../../services/ollama';
import './RoutineRecommendation.css';

interface RoutineRecommendationProps {
  compact?: boolean;
}

export default function RoutineRecommendation({
  compact = false,
}: RoutineRecommendationProps) {
  const { members, selectedMemberId, data, applyRecommendedRoutine } =
    useAppStore();
  const [applied, setApplied] = useState(false);

  const member = members.find((m) => m.id === selectedMemberId) ?? members[0];
  const { recommendation, loading, ollamaOnline, refresh } =
    useRoutineRecommendation(member, data);

  useEffect(() => {
    setApplied(false);
  }, [selectedMemberId]);

  if (!member) return null;

  if (loading) {
    return (
      <div className="routine-recommendation loading">
        <Loader2 size={20} className="spin" />
        <span>
          {ollamaOnline
            ? `Ollama(${OLLAMA_MODEL})로 분석 중...`
            : '루틴 분석 중...'}
        </span>
      </div>
    );
  }

  if (!recommendation) return null;

  const handleApply = () => {
    applyRecommendedRoutine(member.id, recommendation.suggestedExercises);
    setApplied(true);
    setTimeout(() => setApplied(false), 3000);
  };

  const sourceBadge =
    recommendation.source === 'ai' ? (
      <span className="source-badge ai">
        <Cpu size={11} />
        Ollama AI
      </span>
    ) : (
      <span className="source-badge rules">기본 추천</span>
    );

  if (compact) {
    return (
      <div
        className={`routine-recommendation compact trend-${recommendation.trend}`}
      >
        <div className="recommendation-compact-header">
          <Sparkles size={14} />
          <span>{recommendation.headline}</span>
          {sourceBadge}
        </div>
        <p className="recommendation-compact-text">{recommendation.analysis}</p>
        <div className="recommendation-compact-actions">
          <button
            type="button"
            className={`btn-apply-recommendation ${applied ? 'applied' : ''}`}
            onClick={handleApply}
            disabled={applied}
          >
            {applied ? (
              <>
                <Check size={14} />
                적용됨
              </>
            ) : (
              '이 추천 적용하기'
            )}
          </button>
          <button
            type="button"
            className="btn-refresh-recommendation"
            onClick={refresh}
            aria-label="추천 새로고침"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`routine-recommendation trend-${recommendation.trend}`}>
      <div className="recommendation-header">
        <span className="recommendation-icon">
          <Sparkles size={16} />
        </span>
        <div className="recommendation-title-block">
          <div className="recommendation-title-row">
            <h3>{recommendation.headline}</h3>
            <button
              type="button"
              className="btn-refresh-recommendation"
              onClick={refresh}
              aria-label="추천 새로고침"
            >
              <RefreshCw size={14} />
            </button>
          </div>
          <div className="recommendation-meta">
            <span className="recommendation-trend-label">
              {recommendation.trend === 'progressing' && '성장 추세'}
              {recommendation.trend === 'plateau' && '정체 구간'}
              {recommendation.trend === 'comeback' && '복귀 세션'}
              {recommendation.trend === 'maintain' && '기록 기반'}
            </span>
            {sourceBadge}
          </div>
        </div>
      </div>

      {ollamaOnline === false && (
        <p className="ollama-offline-notice">
          Ollama가 실행 중이 아닙니다. 기본 규칙 기반 추천을 표시합니다.{' '}
          <code>ollama serve</code> 후 새로고침하세요.
        </p>
      )}

      <p className="recommendation-analysis">{recommendation.analysis}</p>

      {recommendation.changes.length > 0 && (
        <ul className="recommendation-changes">
          {recommendation.changes.map((change) => (
            <li key={change.exerciseName}>
              <strong>{change.exerciseName}</strong>
              <span>{change.label}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="recommendation-preview">
        <span className="recommendation-preview-label">추천 루틴</span>
        <ul>
          {recommendation.suggestedExercises.map((ex) => (
            <li key={ex.id}>
              {ex.name} — {ex.weight}kg × {ex.sets}세트 × {ex.reps}회
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        className={`btn-apply-recommendation full ${applied ? 'applied' : ''}`}
        onClick={handleApply}
        disabled={applied}
      >
        {applied ? (
          <>
            <Check size={16} />
            추천 루틴 적용 완료
          </>
        ) : (
          <>
            <Sparkles size={16} />
            이 추천 적용하기
          </>
        )}
      </button>
    </div>
  );
}
