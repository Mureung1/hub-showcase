import { useState } from "react";
import { createNotice } from "../../api/noticeApi";
import "./DashboardPage.css";

function DashboardPage() {
  const [activeTab, setActiveTab] = useState("text");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

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
            <p className="placeholder-text">PDF 업로드 기능은 준비 중입니다.</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default DashboardPage;