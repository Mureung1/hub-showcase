import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import Header from "../components/layout/Header";
import { mockMissions, getMissionById } from "../data/mockMissions";
import { saveSubmission } from "../features/career/submissionApi";
import { navigate, routes } from "../router";

function UploadResult() {
  const [searchParams] = useSearchParams();
  const missionId = searchParams.get("missionId") || "";
  const initialMission = useMemo(
    () => getMissionById(missionId) || mockMissions[0],
    [missionId]
  );
  const [selectedMissionId, setSelectedMissionId] = useState(initialMission?.id || "");
  const selectedMission = getMissionById(selectedMissionId);
  const [form, setForm] = useState({
    submittedUrl: "",
    submittedDescription: "",
    submittedFileName: "",
    submittedFileType: "",
    submittedFileData: "",
  });
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setMessage("");
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    setMessage("");

    if (!file) {
      setForm((currentForm) => ({
        ...currentForm,
        submittedFileName: "",
        submittedFileType: "",
        submittedFileData: "",
      }));
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage("파일은 2MB 이하만 제출할 수 있습니다.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((currentForm) => ({
        ...currentForm,
        submittedFileName: file.name,
        submittedFileType: file.type || "application/octet-stream",
        submittedFileData: String(reader.result || ""),
      }));
    };
    reader.onerror = () => {
      setMessage("파일을 읽지 못했습니다. 다시 선택해 주세요.");
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedMission) {
      setMessage("제출할 미션을 선택해 주세요.");
      return;
    }

    if (!form.submittedUrl.trim() && !form.submittedFileName.trim()) {
      setMessage("결과물 링크 또는 파일 중 하나는 제출해야 합니다.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      await saveSubmission({
        missionId: selectedMission.id,
        missionTitle: selectedMission.title,
        submittedUrl: form.submittedUrl,
        submittedDescription: form.submittedDescription,
        submittedFileName: form.submittedFileName,
        submittedFileType: form.submittedFileType,
        submittedFileData: form.submittedFileData,
      });
      navigate(routes.feedback);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="upload-page">
      <style>{styles}</style>
      <Header />
      <section className="upload-content">
        <div className="upload-heading">
          <div>
            <span className="upload-badge">Mission Submission</span>
            <h1>결과물 제출</h1>
            <p>수행한 미션 결과물을 링크 또는 파일 형태로 제출합니다. 제출 정보는 Supabase DB에 저장됩니다.</p>
          </div>
          {selectedMission && (
            <aside className="upload-summary">
              <span>선택 미션</span>
              <strong>{selectedMission.title}</strong>
              <small>{selectedMission.deliverable}</small>
            </aside>
          )}
        </div>

        <form className="upload-form" onSubmit={handleSubmit}>
          <section className="upload-card">
            <label className="cm-field">
              <span>제출할 미션</span>
              <select
                value={selectedMissionId}
                onChange={(event) => setSelectedMissionId(event.target.value)}
                className="cm-select"
              >
                {mockMissions.map((mission) => (
                  <option key={mission.id} value={mission.id}>
                    {mission.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="cm-field">
              <span>결과물 링크</span>
              <input
                name="submittedUrl"
                value={form.submittedUrl}
                onChange={handleChange}
                className="cm-input"
                placeholder="https://github.com/... 또는 https://notion.so/..."
              />
            </label>

            <label className="cm-field">
              <span>결과물 설명</span>
              <textarea
                name="submittedDescription"
                value={form.submittedDescription}
                onChange={handleChange}
                className="cm-textarea"
                placeholder="무엇을 만들었고, 어떤 역할을 했고, 어떤 점을 배웠는지 적어 주세요."
                rows={7}
              />
            </label>
          </section>

          <section className="upload-card">
            <div className="file-drop">
              <span>파일 제출</span>
              <strong>{form.submittedFileName || "선택된 파일 없음"}</strong>
              <p>PDF, 이미지, 문서 파일을 선택할 수 있습니다. 2MB 이하 파일은 제출 데이터와 함께 저장됩니다.</p>
              <input type="file" className="cm-file-input" onChange={handleFileChange} />
            </div>

            {message && <p className="upload-message">{message}</p>}

            <div className="upload-actions">
              <button type="button" className="cm-button cm-button-secondary" onClick={() => navigate(routes.mission)}>
                미션 목록
              </button>
              <button type="submit" className="cm-button cm-button-primary" disabled={isSubmitting}>
                {isSubmitting ? "제출 중" : "제출하고 피드백 보기"}
              </button>
            </div>
          </section>
        </form>
      </section>
    </main>
  );
}

const styles = `
.upload-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at 12% 8%, rgba(37, 99, 235, 0.16), transparent 28%),
    linear-gradient(135deg, #f8fafc 0%, #eef6ff 48%, #f8fbff 100%);
  color: #0f172a;
  font-family: Arial, sans-serif;
}

.upload-content {
  width: min(1120px, calc(100% - clamp(32px, 6vw, 96px)));
  margin: 0 auto;
  padding: clamp(38px, 6vw, 78px) 0 96px;
}

.upload-heading {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 340px);
  gap: 18px;
  align-items: end;
  margin-bottom: 18px;
}

.upload-badge {
  display: inline-flex;
  margin-bottom: 14px;
  padding: 8px 13px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.1);
  color: #2563eb;
  font-size: 13px;
  font-weight: 800;
}

.upload-heading h1 {
  margin: 0 0 14px;
  font-size: clamp(32px, 5vw, 48px);
  line-height: 1.15;
  word-break: keep-all;
}

.upload-heading p {
  max-width: 760px;
  margin: 0;
  color: #475569;
  font-size: 17px;
  line-height: 1.7;
}

.upload-form {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(280px, 0.75fr);
  gap: 16px;
}

.upload-card,
.upload-summary {
  min-width: 0;
  padding: 22px;
  border-radius: 18px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.08);
}

.upload-summary {
  display: grid;
  gap: 8px;
}

.upload-summary span,
.upload-card label > span,
.file-drop > span {
  color: #64748b;
  font-size: 13px;
  font-weight: 800;
}

.upload-summary strong {
  line-height: 1.4;
}

.upload-summary small {
  color: #475569;
  line-height: 1.5;
}

.upload-card {
  display: grid;
  gap: 14px;
  align-content: start;
}

.upload-card textarea {
  min-height: 180px;
}

.file-drop {
  display: grid;
  gap: 10px;
  padding: 18px;
  border-radius: 16px;
  border: 1px dashed #93c5fd;
  background: #eff6ff;
}

.file-drop strong {
  color: #1d4ed8;
  word-break: break-all;
}

.file-drop p {
  margin: 0;
  color: #475569;
  line-height: 1.55;
}

.upload-message {
  margin: 0;
  padding: 12px 14px;
  border-radius: 12px;
  background: #fee2e2;
  color: #b91c1c;
  font-size: 14px;
  font-weight: 800;
}

.upload-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
}

@media (max-width: 860px) {
  .upload-heading,
  .upload-form {
    grid-template-columns: 1fr;
  }
}
`;

export default UploadResult;
