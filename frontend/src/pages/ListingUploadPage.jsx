import FileUploadPanel from '../components/listing-upload/FileUploadPanel'
import OcrReviewPanel from '../components/listing-upload/OcrReviewPanel'
import { useListingUpload } from '../hooks/useListingUpload'

function ListingUploadPage({ onBack }) {
  const {
    error,
    fields,
    imageName,
    isProcessing,
    ocrText,
    previewUrl,
    progressMessage,
    runOcr,
    saved,
    savedAt,
    saveListingInfo,
    selectFile,
    updateField,
  } = useListingUpload()

  return (
    <main className="user-info-page">
      <section className="user-info-shell" aria-labelledby="page-title">
        <header className="app-header">
          <p className="brand-name">자취방 의사결정 도우미</p>
          <h1 id="page-title">매물 스크린샷 업로드</h1>
          <p className="page-description">
            부동산 플랫폼의 매물 화면을 올리면 OCR로 텍스트를 추출하고 매물 정보를 저장합니다.
          </p>
        </header>

        <section className="form-card" aria-labelledby="step-title">
          <div className="progress-header">
            <span className="step-count">2 / 5</span>
            <div className="progress-track" aria-hidden="true">
              <div className="progress-value" style={{ width: '40%' }} />
            </div>
          </div>

          <div className="step-heading">
            <h2 id="step-title">스크린샷을 선택해주세요</h2>
            <p>업로드한 이미지는 브라우저에서 OCR 처리되며 서버로 저장하지 않습니다.</p>
          </div>

          <FileUploadPanel
            error={error}
            imageName={imageName}
            isProcessing={isProcessing}
            onFileSelect={selectFile}
            onRunOcr={runOcr}
            previewUrl={previewUrl}
            progressMessage={progressMessage}
          />

          <OcrReviewPanel
            fields={fields}
            ocrText={ocrText}
            onFieldChange={updateField}
            onSave={saveListingInfo}
            saved={saved}
            savedAt={savedAt}
          />

          <div className="button-row">
            <button className="secondary-button" type="button" onClick={onBack}>
              사용자 정보로 돌아가기
            </button>
          </div>
        </section>
      </section>
    </main>
  )
}

export default ListingUploadPage
