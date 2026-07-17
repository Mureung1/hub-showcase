import { useState } from "react";
import { createNotice, uploadPDF } from "../../api/noticeApi";
import { analyzeNotice } from "../../api/analysisApi";
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
  const [textAnalysisResult, setTextAnalysisResult] = useState(null);
  const [pdfAnalysisResult, setPdfAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  async function handleAnalyze() {
    setError("");
    setSuccess(false);
    setTextAnalysisResult(null);

    if (!content.trim()) {
      setError("분석할 텍스트를 입력해주세요.");
      return;
    }

    setIsAnalyzing(true);

    try {
      const result = await analyzeNotice(content);
      setTextAnalysisResult(result.data);
      setSuccess(true);

      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handlePdfFileChange(e) {
    const file = e.target.files?.[0];
    setPdfError("");
    setExtractedText("");
    setShowExtraction(false);
    setPdfAnalysisResult(null);

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
    setPdfAnalysisResult(null);

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

  async function handlePdfAnalyze() {
    setPdfError("");
    setPdfAnalysisResult(null);

    if (!extractedText.trim()) {
      setPdfError("분석할 텍스트가 없습니다.");
      return;
    }

    setIsAnalyzing(true);

    try {
      const result = await analyzeNotice(extractedText);
      setPdfAnalysisResult(result.data);
      setSuccess(true);

      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      setPdfError(err.message);
    } finally {
      setIsAnalyzing(false);
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
            onClick={() => {
              setActiveTab("text");
              setPdfFile(null);
              setExtractedText("");
              setShowExtraction(false);
              setPdfAnalysisResult(null);
              setPdfError("");
            }}
            disabled={isLoading}
          >
            텍스트 입력
          </button>
          <button
            className={`tab-button ${activeTab === "pdf" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("pdf");
              setTitle("");
              setContent("");
              setTextAnalysisResult(null);
              setError("");
            }}
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
              disabled={isAnalyzing}
            >
              {isAnalyzing ? "분석 중..." : "분석하기"}
            </button>

            {/* 분석 결과 미리보기 */}
            {textAnalysisResult && (
              <div className="analysis-preview">
                <div className="preview-section">
                  <h3 className="preview-title">📋 일정 분석 결과</h3>

                  <div className="preview-item">
                    <label className="item-label">일정명</label>
                    <p className="item-value">
                      {textAnalysisResult.scheduleName || "정보 없음"}
                    </p>
                  </div>

                  <div className="preview-item">
                    <label className="item-label">시작일</label>
                    <p className="item-value">
                      {textAnalysisResult.startDate || "정보 없음"}
                    </p>
                  </div>

                  <div className="preview-item">
                    <label className="item-label">마감일</label>
                    <p className="item-value">
                      {textAnalysisResult.deadline || "정보 없음"}
                    </p>
                  </div>

                  <div className="preview-item">
                    <label className="item-label">장소</label>
                    <p className="item-value">
                      {textAnalysisResult.location || "정보 없음"}
                    </p>
                  </div>

                  {textAnalysisResult.deliverables.length > 0 && (
                    <div className="preview-item">
                      <label className="item-label">제출물</label>
                      <ul className="item-list">
                        {textAnalysisResult.deliverables.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {textAnalysisResult.materials.length > 0 && (
                    <div className="preview-item">
                      <label className="item-label">준비물</label>
                      <ul className="item-list">
                        {textAnalysisResult.materials.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {textAnalysisResult.notes.length > 0 && (
                    <div className="preview-item">
                      <label className="item-label">안내사항</label>
                      <ul className="item-list">
                        {textAnalysisResult.notes.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {textAnalysisResult.warnings.length > 0 && (
                    <div className="preview-item warnings">
                      <label className="item-label">⚠️ 알림</label>
                      <ul className="item-list">
                        {textAnalysisResult.warnings.map((warning, idx) => (
                          <li key={idx}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
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

            {/* PDF 텍스트 분석 버튼 */}
            {showExtraction && !isScannedOrEmpty && (
              <button
                className="analyze-button"
                onClick={handlePdfAnalyze}
                disabled={isAnalyzing}
                style={{ marginTop: "16px" }}
              >
                {isAnalyzing ? "분석 중..." : "분석하기"}
              </button>
            )}

            {/* PDF 분석 결과 미리보기 */}
            {pdfAnalysisResult && (
              <div className="analysis-preview">
                <div className="preview-section">
                  <h3 className="preview-title">📋 일정 분석 결과</h3>

                  <div className="preview-item">
                    <label className="item-label">일정명</label>
                    <p className="item-value">
                      {pdfAnalysisResult.scheduleName || "정보 없음"}
                    </p>
                  </div>

                  <div className="preview-item">
                    <label className="item-label">시작일</label>
                    <p className="item-value">
                      {pdfAnalysisResult.startDate || "정보 없음"}
                    </p>
                  </div>

                  <div className="preview-item">
                    <label className="item-label">마감일</label>
                    <p className="item-value">
                      {pdfAnalysisResult.deadline || "정보 없음"}
                    </p>
                  </div>

                  <div className="preview-item">
                    <label className="item-label">장소</label>
                    <p className="item-value">
                      {pdfAnalysisResult.location || "정보 없음"}
                    </p>
                  </div>

                  {pdfAnalysisResult.deliverables.length > 0 && (
                    <div className="preview-item">
                      <label className="item-label">제출물</label>
                      <ul className="item-list">
                        {pdfAnalysisResult.deliverables.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {pdfAnalysisResult.materials.length > 0 && (
                    <div className="preview-item">
                      <label className="item-label">준비물</label>
                      <ul className="item-list">
                        {pdfAnalysisResult.materials.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {pdfAnalysisResult.notes.length > 0 && (
                    <div className="preview-item">
                      <label className="item-label">안내사항</label>
                      <ul className="item-list">
                        {pdfAnalysisResult.notes.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {pdfAnalysisResult.warnings.length > 0 && (
                    <div className="preview-item warnings">
                      <label className="item-label">⚠️ 알림</label>
                      <ul className="item-list">
                        {pdfAnalysisResult.warnings.map((warning, idx) => (
                          <li key={idx}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default DashboardPage;