import { categories } from '../data/gameSystems.js'
import GameSearchInput from './GameSearchInput.jsx'

function EditorMetaPanel({
  title,
  gameTag,
  systemTag,
  category,
  onCategoryChange,
  isForward,
  onGamePicked,
  feedbackWanted,
  aiLoading,
  savedAt,
  autoSaved,
  publishError,
  aiPreviewError,
  isPublished,
  isLoggedIn,
  showPasswordField,
  editPassword,
  onEditPasswordChange,
  onTitleChange,
  onGameTagChange,
  onSystemTagChange,
  onFeedbackWantedChange,
  onAiFeedback,
  onSaveDraft,
  onPublish,
}) {
  return (
    <div className="rs-panel rs-editor-meta">
      <input
        className="rs-editor-title"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="문서 제목 — 예: 스타포스 강화 역기획: 파괴는 왜 필요한가"
        aria-label="문서 제목"
      />
      <div className="rs-editor-tags">
        {/* 역기획은 실제 게임을 다루므로 RAWG 자동완성. 순기획은 가상 게임이라 일반 입력. */}
        {isForward ? (
          <input
            value={gameTag}
            onChange={(e) => onGameTagChange(e.target.value)}
            placeholder="게임 가제 / 장르 (필수)"
            aria-label="게임 가제 또는 장르"
          />
        ) : (
          <GameSearchInput
            value={gameTag}
            onChange={onGameTagChange}
            onPick={onGamePicked}
            placeholder="대상 게임 검색 (필수) — 예: Zelda"
            ariaLabel="대상 게임 검색"
          />
        )}
        <input
          value={systemTag}
          onChange={(e) => onSystemTagChange(e.target.value)}
          placeholder={isForward ? '한 줄 콘셉트 (필수)' : '시스템 유형 — 예: 강화 시스템 (필수)'}
          aria-label={isForward ? '한 줄 콘셉트' : '시스템 유형 태그'}
        />
        {/* 둘러보기 필터가 문서 수만큼 늘지 않도록 분류는 고정 목록에서 고르게 한다. */}
        <select
          value={category ?? ''}
          onChange={(e) => onCategoryChange(e.target.value)}
          aria-label="문서 분류"
        >
          <option value="">분류 선택 (선택 사항)</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label className="rs-editor-feedback-toggle">
          <input
            type="checkbox"
            checked={feedbackWanted}
            onChange={(e) => onFeedbackWantedChange(e.target.checked)}
          />
          피드백 요청 중 배지 켜기
        </label>
      </div>

      {showPasswordField && (
        <div className="rs-editor-pw">
          <input
            type="password"
            value={editPassword}
            onChange={(e) => onEditPasswordChange(e.target.value)}
            placeholder="수정용 비밀번호 (비회원 필수) — 나중에 이 글을 고칠 때 필요해요"
            aria-label="수정용 비밀번호"
          />
          <p className="rs-editor-pw-hint">
            비회원으로 작성 중이에요. 이 비밀번호가 있어야 발행 후에도 수정할 수 있어요.{' '}
            <a href="/signup">회원가입</a>하면 비밀번호 없이 계정으로 관리되고 AI 피드백도 받을 수
            있어요.
          </p>
        </div>
      )}

      <div className="rs-editor-actions">
        {isLoggedIn ? (
          <button type="button" className="rs-btn" onClick={onAiFeedback} disabled={aiLoading}>
            {aiLoading ? 'AI가 읽는 중…' : 'AI 미리보기'}
          </button>
        ) : (
          <span className="rs-editor-ai-locked">AI 피드백은 회원 전용이에요</span>
        )}
        {/* 이미 발행한 글을 고치는 중이면 "임시저장"이 아니라 발행분에 바로 반영된다. */}
        <button type="button" className="rs-btn" onClick={onSaveDraft}>
          {isPublished ? '저장' : '임시저장'}
        </button>
        <button type="button" className="rs-btn rs-btn-primary" onClick={onPublish}>
          {isPublished ? '수정 반영' : '발행'}
        </button>
        {savedAt && (
          <span className="rs-editor-saved">
            {autoSaved ? '자동저장됨' : '저장됨'} · {savedAt}
          </span>
        )}
      </div>
      {aiPreviewError && <p className="rs-editor-error">{aiPreviewError}</p>}
      {publishError && <p className="rs-editor-error">{publishError}</p>}
    </div>
  )
}

export default EditorMetaPanel
