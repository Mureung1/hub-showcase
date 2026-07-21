function EditorMetaPanel({
  title,
  gameTag,
  systemTag,
  feedbackWanted,
  aiLoading,
  savedAt,
  autoSaved,
  publishError,
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
        <input
          value={gameTag}
          onChange={(e) => onGameTagChange(e.target.value)}
          placeholder="대상 게임 (필수)"
          aria-label="대상 게임 태그"
        />
        <input
          value={systemTag}
          onChange={(e) => onSystemTagChange(e.target.value)}
          placeholder="시스템 유형 — 예: 강화 시스템 (필수)"
          aria-label="시스템 유형 태그"
        />
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
        <button type="button" className="rs-btn" onClick={onSaveDraft}>
          임시저장
        </button>
        <button type="button" className="rs-btn rs-btn-primary" onClick={onPublish}>
          발행
        </button>
        {savedAt && (
          <span className="rs-editor-saved">
            {autoSaved ? '자동저장됨' : '임시저장됨'} · {savedAt}
          </span>
        )}
      </div>
      {publishError && <p className="rs-editor-error">{publishError}</p>}
    </div>
  )
}

export default EditorMetaPanel
