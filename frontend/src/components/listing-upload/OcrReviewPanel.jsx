import ListingFieldsForm from './ListingFieldsForm'

function OcrReviewPanel({ fields, ocrText, onFieldChange, onSave, saved, savedAt }) {
  return (
    <div className="review-panel">
      <div className="ocr-text-panel">
        <h3>OCR 원문</h3>
        <pre>{ocrText || '아직 분석된 텍스트가 없습니다.'}</pre>
      </div>

      <div className="step-heading compact-heading">
        <h2>매물 정보를 확인해주세요</h2>
        <p>자동으로 채워진 값이 맞는지 확인하고, 비어 있거나 틀린 항목은 직접 수정해주세요.</p>
      </div>

      <ListingFieldsForm fields={fields} onFieldChange={onFieldChange} />

      {saved && (
        <p className="success-message" role="status">
          매물 정보가 이 브라우저에 저장되었습니다.
          {savedAt ? ` 저장 시각: ${new Date(savedAt).toLocaleString('ko-KR')}` : ''}
        </p>
      )}

      <div className="button-row align-end">
        <button className="primary-button" type="button" onClick={onSave}>
          매물 정보 저장
        </button>
      </div>
    </div>
  )
}

export default OcrReviewPanel
