import { useState } from "react";
import { createNotice, uploadPDF } from "../../api/noticeApi";
import "./DashboardPage.css";

function DashboardPage() {
  const [activeTab, setActiveTab] = useState("text");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfError, setPdfError] = useState("");
  const [extractedText, setExtractedText] = useState("");
  const [isScannedOrEmpty, setIsScannedOrEmpty] = useState(false);
  const [showExtraction, setShowExtraction] = useState(false);

  async function handleAnalyze() {
    setError("");
    setSuccess(false);

    if (!title.trim()) {
      setError("제목을 입력해주세요.");
      return;
    }

    if (!content.trim()) {
      setError("본문을 입력해주세요.");
      return;
    }

    setIsLoading(true);

    try {
      await createNotice(title, content);

      setSuccess(true);
      setTitle("");
      setContent("");

      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function handlePdfFileChange(e) {
    const file = e.target.files?.[0];
    setPdfError("");

    if (!file) {
      setPdfFile(null);
      return;
    }

    // 파일 형식 확인
    if (file.type !== "application/pdf") {
      setPdfError("PDF 파일만 업로드 가능합니다.");
      setPdfFile(null);
      return;
    }

    // 파일 크기 확인 (10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setPdfError("파일 크기가 10MB를 초과했습니다.");
      setPdfFile(null);
      return;
    }

    setPdfFile(file);
  }

  async function handlePdfUpload() {
    setPdfError("");
    setShowExtraction(false);

    if (!pdfFile) {
      setPdfError("파일을 선택해주세요.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await uploadPDF(pdfFile);

      // 추출된 텍스트 표시
      setExtractedText(result.data.extractedText || "");
      setIsScannedOrEmpty(result.data.isScannedOrEmpty || false);
      setShowExtraction(true);
      setSuccess(true);
      setPdfFile(null);

      // 파일 입력 초기화
      const fileInput = document.getElementById("pdf-file-input");
      if (fileInput) {
        fileInput.value = "";
      }

      // 성공 메시지는 3초 후 사라지지만 추출 결과는 계속 표시
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      setPdfError(err.message);
      setShowExtraction(false);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="dashboard-section">
      <div className="notice-container">
        <h2>공지 등록</h2>

        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab-button ${activeTab === "text" ? "active" : ""}`}
            onClick={() => setActiveTab("text")}
            disabled={isLoading}
          >
            텍스트 입력
          </button>
          <button
            className={`tab-button ${activeTab === "pdf" ? "active" : ""}`}
            onClick={() => setActiveTab("pdf")}
            disabled={isLoading}
          >
            PDF 업로드
          </button>
        </div>

        {/* Text Input Tab */}
        {activeTab === "text" && (
          <div className="tab-content">
            <div className="form-group">
              <label htmlFor="title">제목 *</label>
              <input
                id="title"
                type="text"
                placeholder="공지의 제목을 입력해주세요."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="content">본문 *</label>
              <textarea
                id="content"
                placeholder="공지의 내용을 입력해주세요."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={isLoading}
                rows="10"
              />
            </div>

            {error && <p className="error-message">{error}</p>}
            {success && <p className="success-message">공지가 저장되었습니다.</p>}

            <button
              className="analyze-button"
              onClick={handleAnalyze}
              disabled={isLoading}
            >
              {isLoading ? "분석 중..." : "분석하기"}
            </button>
          </div>
        )}

        {/* PDF Upload Tab */}
        {activeTab === "pdf" && (
          <div className="tab-content">
            <div className="form-group">
              <label htmlFor="pdf-file-input">PDF 파일 선택</label>
              <div className="file-input-wrapper">
                <input
                  id="pdf-file-input"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handlePdfFileChange}
                  disabled={isLoading}
                  className="file-input"
                />
                <span className="file-name">
                  {pdfFile ? pdfFile.name : "파일을 선택해주세요."}
                </span>
              </div>
            </div>

            <div className="file-info">
              <p className="info-text">
                ✓ PDF 파일만 업로드 가능합니다.
              </p>
              <p className="info-text">
                ✓ 최대 파일 크기: 10MB
              </p>
            </div>

            {pdfError && <p className="error-message">{pdfError}</p>}
            {success && <p className="success-message">PDF 업로드 성공했습니다.</p>}

            <button
              className="analyze-button"
              onClick={handlePdfUpload}
              disabled={isLoading || !pdfFile}
            >
              {isLoading ? "업로드 중..." : "업로드"}
            </button>

            {/* 추출 결과 표시 */}
            {showExtraction && (
              <div className="extraction-result">
                {isScannedOrEmpty ? (
                  <div className="result-notice">
                    <p className="notice-title">⚠️ 텍스트 추출 불가</p>
                    <p className="notice-text">
                      스캔된 PDF이거나 텍스트를 읽을 수 없는 문서입니다.
                    </p>
                    <p className="notice-text">
                      다른 PDF를 업로드해주세요.
                    </p>
                  </div>
                ) : (
                  <div className="result-content">
                    <p className="result-label">📄 추출된 텍스트</p>
                    <div className="result-text">
                      {extractedText}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default DashboardPage;