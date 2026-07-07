import ErrorMessage from './ErrorMessage.jsx'
import WarningBanner from './WarningBanner.jsx'

export default function NoticeInput({
  copy,
  noticeTitle,
  extractedText,
  uploadedFileName,
  userSelectedNoticeType,
  noticePublicationDate,
  warnings,
  error,
  onTitleChange,
  onExtractedTextChange,
  onNoticeTypeChange,
  onPublicationDateChange,
  onFileUpload,
  onAnalyzeMock,
  onAnalyzeServerMock,
  isServerAnalyzing,
  onClear,
}) {
  function handleFileChange(event) {
    onFileUpload(event.target.files?.[0])
    event.target.value = ''
  }

  return (
    <section className="tool-panel">
      <div className="section-heading">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2>{copy.title}</h2>
        <p>{copy.description}</p>
      </div>

      <label className="field">
        <span>{copy.fileUploadLabel}</span>
        <input type="file" accept=".txt,.md" onChange={handleFileChange} />
      </label>

      <div className="privacy-notice">
        <strong>{copy.privacyNoticeTitle}</strong>
        <p>{copy.privacyNoticeBody}</p>
      </div>

      <div className="extract-preview">
        <strong>{copy.extractPreviewTitle}</strong>
        <p>
          {uploadedFileName
            ? copy.uploadedFileName(uploadedFileName)
            : copy.noUploadedFile}
        </p>
        <p>{copy.extractPreviewHint}</p>
      </div>

      <WarningBanner title={copy.warningTitle} warnings={warnings} />
      <ErrorMessage error={error?.location === 'input' ? error : null} />

      <label className="field">
        <span>{copy.titleLabel}</span>
        <input
          type="text"
          value={noticeTitle}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder={copy.titlePlaceholder}
        />
      </label>

      <div className="field-pair notice-metadata">
        <label className="field">
          <span>{copy.noticeTypeLabel}</span>
          <select
            value={userSelectedNoticeType}
            onChange={(event) => onNoticeTypeChange(event.target.value)}
          >
            <option value="">{copy.noticeTypePlaceholder}</option>
            {copy.noticeTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>{copy.publicationDateLabel}</span>
          <input
            type="date"
            value={noticePublicationDate}
            onChange={(event) => onPublicationDateChange(event.target.value)}
          />
        </label>
      </div>

      <label className="field">
        <span>{copy.textLabel}</span>
        <textarea
          value={extractedText}
          onChange={(event) => onExtractedTextChange(event.target.value)}
          placeholder={copy.textPlaceholder}
          rows={9}
        />
      </label>

      <div className="action-row">
        <button className="primary-button" type="button" onClick={onAnalyzeMock}>
          {copy.analyzeButton}
        </button>
        <button
          className="ghost-button"
          type="button"
          onClick={onAnalyzeServerMock}
          disabled={isServerAnalyzing}
        >
          {isServerAnalyzing
            ? copy.serverAnalyzeLoading
            : copy.analyzeServerButton}
        </button>
        <button className="ghost-button" type="button" onClick={onClear}>
          {copy.clearButton}
        </button>
      </div>
    </section>
  )
}
