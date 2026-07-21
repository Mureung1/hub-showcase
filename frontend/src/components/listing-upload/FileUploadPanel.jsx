function FileUploadPanel({ error, imageName, isProcessing, onFileSelect, onRunOcr, previewUrl, progressMessage }) {
  return (
    <div className="upload-section">
      <label className="upload-dropzone" htmlFor="listing-screenshot">
        <span className="upload-title">매물 스크린샷 업로드</span>
        <span className="upload-description">PNG, JPG, WEBP 이미지를 선택해주세요.</span>
        <input
          id="listing-screenshot"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => onFileSelect(event.target.files[0])}
        />
      </label>

      {previewUrl && (
        <figure className="preview-panel">
          <img src={previewUrl} alt="업로드한 매물 스크린샷 미리보기" />
          <figcaption>{imageName}</figcaption>
        </figure>
      )}

      {error && <p className="error-text" role="alert">{error}</p>}
      {progressMessage && <p className="helper-text" role="status">{progressMessage}</p>}

      <button
        className="primary-button"
        type="button"
        onClick={onRunOcr}
        disabled={!imageName || isProcessing}
      >
        {isProcessing ? '분석 중' : 'OCR 분석하기'}
      </button>
    </div>
  )
}

export default FileUploadPanel
