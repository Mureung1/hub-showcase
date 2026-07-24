import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { uploadPDF } from "../../api/noticeApi";
import { analyzeNotice } from "../../api/analysisApi";
import "./RegisterEventPage.css";

function RegisterEventPage() {
  const navigate = useNavigate();

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
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  async function handleAnalyze() {
    setError("");
    setSuccess(false);

    if (!content.trim()) {
      setError("분석할 텍스트를 입력해주세요.");
      return;
    }

    setIsAnalyzing(true);

    try {
      const result = await analyzeNotice(content);
      // AnalysisResultPage로 이동하며 분석 결과 전달
      navigate("/analysis", {
        state: { analysisData: result.data },
      });
    } catch (err) {
      setError(err.message);
      setIsAnalyzing(false);
    }
  }

  function handlePdfFileChange(e) {
    const file = e.target.files?.[0];
    setPdfError("");
    setExtractedText("");
    setShowExtraction(false);

    if (!file) {
      setPdfFile(null);
      return;
    }

    if (file.type !== "application/pdf") {
      setPdfError("PDF 파일만 업로드 가능합니다.");
      setPdfFile(null);
      return;
    }

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

      setExtractedText(result.data.extractedText || "");
      setIsScannedOrEmpty(result.data.isScannedOrEmpty || false);
      setShowExtraction(true);
      setSuccess(true);
      setPdfFile(null);

      const fileInput = document.getElementById("pdf-file-input");
      if (fileInput) {
        fileInput.value = "";
      }

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

    if (!extractedText.trim()) {
      setPdfError("분석할 텍스트가 없습니다.");
      return;
    }

    setIsAnalyzing(true);

    try {
      const result = await analyzeNotice(extractedText);
      navigate("/analysis", {
        state: { analysisData: result.data },
      });
    } catch (err) {
      setPdfError(err.message);
      setIsAnalyzing(false);
    }
  }

  return (
    <section className="register-event-section">
      <div className="notice-container">
        <h2>공지 등록</h2>

        <div className="tabs">
          <button
            className={`tab-button ${activeTab === "text" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("text");
              setPdfFile(null);
              setExtractedText("");
              setShowExtraction(false);
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
              setError("");
            }}
            disabled={isLoading}
          >
            PDF 업로드
          </button>
        </div>

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
          </div>
        )}

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
          </div>
        )}
      </div>
    </section>
  );
}

export default RegisterEventPage;
