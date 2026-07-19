import MoodPicker from './MoodPicker'
import PhotoUpload from './PhotoUpload'

function CheckinForm({ rawText, onTextChange, mood, onMoodChange, photoFile, onPhotoChange, onSubmit, isOrganizing }) {
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
      <button
        className="button button-primary"
        type="submit"
        disabled={!rawText.trim() || isOrganizing}
      >
        {isOrganizing ? '정리하는 중…' : '정리하기'}
      </button>
    </form>
  )
}

export default CheckinForm
