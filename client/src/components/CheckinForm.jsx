import MoodPicker from './MoodPicker'
import PhotoUpload from './PhotoUpload'

function CheckinForm({
  rawText,
  onTextChange,
  mood,
  onMoodChange,
  photoFile,
  onPhotoChange,
  onSubmit,
  onSaveWithoutAi,
  isOrganizing,
  isSaving,
  aiConsent,
  onAiConsentChange,
  storageMode,
}) {
  const isGuest = storageMode === 'guest'

  return (
    <form className="input-panel" onSubmit={onSubmit}>
      <p className="date-label">
        {new Intl.DateTimeFormat('ko-KR', { dateStyle: 'full' }).format(new Date())}
      </p>
      <h2>오늘 하루,<br />어떤 감정이 남았어?</h2>
      <p className="lead">정리하지 않아도 괜찮아요. 있었던 일을 편하게 적어보세요.</p>
      <div className="mood-row">
        <span className="mood-label">오늘 기분</span>
        <MoodPicker value={mood} onChange={onMoodChange} />
      </div>
      <label className="sr-only" htmlFor="raw-text">오늘의 감정 기록</label>
      <textarea
        id="raw-text"
        value={rawText}
        onChange={(event) => onTextChange(event.target.value)}
        placeholder={'예) 팀플에서 내 의견이 계속 넘어가서 지쳤다.\n내가 너무 예민한 건지 계속 신경 쓰였다.'}
        maxLength={2000}
      />
      <div className="input-meta">
        <span>한두 문장이어도 충분해요.</span>
        <span>{rawText.length} / 2000</span>
      </div>
      <PhotoUpload file={photoFile} onChange={onPhotoChange} />
      <div className="guest-storage-note">
        <span aria-hidden="true">{isGuest ? '🔒' : '☁️'}</span>
        <div>
          <strong>
            {isGuest
              ? '기록과 사진은 이 기기에만 저장돼요.'
              : '기록은 내 Supabase 계정에 저장돼요.'}
          </strong>
          <span>
            {isGuest
              ? '브라우저 데이터를 삭제하면 기록도 함께 사라질 수 있어요.'
              : '사진은 내 사용자 폴더의 Supabase Storage에 저장돼요.'}
          </span>
        </div>
      </div>
      <button
        className="button button-secondary save-without-ai"
        type="button"
        disabled={!rawText.trim() || isSaving || isOrganizing}
        onClick={onSaveWithoutAi}
      >
        {isSaving
          ? '저장하는 중…'
          : `AI 없이 ${isGuest ? '기기에' : '클라우드에'} 저장`}
      </button>
      <label className="ai-consent">
        <input
          type="checkbox"
          checked={aiConsent}
          onChange={(event) => onAiConsentChange(event.target.checked)}
        />
        <span>AI 정리를 위해 작성한 내용이 서버로 전송되는 것에 동의해요.</span>
      </label>
      <button
        className="button button-primary"
        type="submit"
        disabled={!rawText.trim() || !aiConsent || isOrganizing}
      >
        {isOrganizing ? '정리하는 중…' : '동의하고 AI로 정리'}
      </button>
    </form>
  )
}

export default CheckinForm
