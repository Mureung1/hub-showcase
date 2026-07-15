function EditorMetaPanel({
  title,
  gameTag,
  systemTag,
  feedbackWanted,
  aiLoading,
  savedAt,
  publishError,
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
      <div className="rs-editor-actions">
        <button type="button" className="rs-btn" onClick={onAiFeedback} disabled={aiLoading}>
          {aiLoading ? 'AI가 읽는 중…' : 'AI 피드백 받기'}
        </button>
        <button type="button" className="rs-btn" onClick={onSaveDraft}>
          임시저장
        </button>
        <button type="button" className="rs-btn rs-btn-primary" onClick={onPublish}>
          발행
        </button>
        {savedAt && <span className="rs-editor-saved">임시저장됨 · {savedAt}</span>}
      </div>
      {publishError && <p className="rs-editor-error">{publishError}</p>}
    </div>
  )
}

export default EditorMetaPanel
