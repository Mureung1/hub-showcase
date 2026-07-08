import { useState } from "react";

import Header from "../components/layout/Header";
import { getSession } from "../features/auth/authStorage";
import {
  getCareerSpec,
  initialSpec,
  saveCareerSpec,
  specFields,
} from "../features/career/careerStorage";
import { navigate, routes } from "../router";

function SpecRegister() {
  const session = getSession();
  const savedSpec = getCareerSpec(session?.id);
  const [form, setForm] = useState({ ...initialSpec, ...savedSpec });
  const [message, setMessage] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setMessage("");
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!session) {
      alert("스펙을 등록하려면 로그인해 주세요.");
      navigate(routes.login);
      return;
    }

    saveCareerSpec(session.id, form);
    setMessage("스펙이 저장되었습니다. 분석 화면에서 준비도를 확정할 수 있습니다.");
  };

  if (!session) {
    return (
      <main style={styles.container}>
        <Header />
        <section style={styles.content}>
          <p style={styles.badge}>Career Mission</p>
          <h1 style={styles.title}>스펙 등록</h1>
          <p style={styles.description}>
            로그인 후 전공, 학점, 자격증, 어학 점수, 프로젝트 경험, 대외활동,
            보유 기술, 목표 직무를 등록할 수 있습니다.
          </p>
          <button
            type="button"
            style={styles.primaryButton}
            onClick={() => navigate(routes.login)}
          >
            로그인으로 이동
          </button>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.container}>
      <Header />
      <section style={styles.content}>
        <div style={styles.header}>
          <p style={styles.badge}>Career Mission</p>
          <h1 style={styles.title}>스펙 등록</h1>
          <p style={styles.description}>
            핵심 기능 분석에 필요한 항목을 등록합니다. 저장 후 분석하기를 누르면
            현재 기준 준비도 퍼센트가 확정됩니다.
          </p>
        </div>

        <form style={styles.form} onSubmit={handleSubmit}>
          <div style={styles.fieldGrid}>
            {specFields.map((field) => (
              <label key={field.name} style={styles.field}>
                <span style={styles.label}>{field.label}</span>
                {["projects", "activities", "skills", "certificates"].includes(
                  field.name
                ) ? (
                  <textarea
                    name={field.name}
                    value={form[field.name]}
                    onChange={handleChange}
                    style={styles.textarea}
                    placeholder={placeholderByField[field.name]}
                  />
                ) : (
                  <input
                    name={field.name}
                    value={form[field.name]}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder={placeholderByField[field.name]}
                  />
                )}
              </label>
            ))}
          </div>

          {message && <p style={styles.success}>{message}</p>}

          <div style={styles.actions}>
            <button type="submit" style={styles.secondaryButton}>
              저장
            </button>
            <button
              type="button"
              style={styles.primaryButton}
              onClick={() => navigate(routes.analysis)}
            >
              분석 화면으로 이동
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

const placeholderByField = {
  targetRole: "예: 프론트엔드 개발자",
  grade: "예: 3학년 또는 졸업예정",
  gpa: "예: 3.8 / 4.5",
  certificates: "예: 정보처리기사, SQLD",
  languageScore: "예: TOEIC 850, OPIc IM2",
  projects: "프로젝트명, 역할, 사용 기술, 결과를 적어주세요.",
  activities: "대외활동, 인턴, 동아리, 공모전 경험을 적어주세요.",
  skills: "예: React, JavaScript, Python, SQL",
};

const styles = {
  container: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 12% 8%, rgba(37, 99, 235, 0.16), transparent 28%), linear-gradient(135deg, #f8fafc 0%, #eef6ff 48%, #f8fbff 100%)",
    fontFamily: "Arial, sans-serif",
    color: "#0f172a",
  },
  content: {
    width: "min(960px, calc(100% - clamp(32px, 6vw, 96px)))",
    margin: "0 auto",
    padding: "clamp(34px, 6vw, 72px) 0 96px",
  },
  header: {
    marginBottom: "24px",
  },
  badge: {
    display: "inline-block",
    margin: "0 0 18px",
    padding: "8px 13px",
    borderRadius: "999px",
    backgroundColor: "rgba(37, 99, 235, 0.1)",
    color: "#2563eb",
    fontSize: "13px",
    fontWeight: "bold",
  },
  title: {
    margin: "0 0 16px",
    fontSize: "clamp(32px, 5vw, 48px)",
    lineHeight: 1.15,
  },
  description: {
    maxWidth: "720px",
    margin: "0 0 24px",
    color: "#475569",
    fontSize: "17px",
    lineHeight: 1.7,
  },
  form: {
    padding: "24px",
    borderRadius: "20px",
    background: "rgba(255, 255, 255, 0.78)",
    border: "1px solid rgba(226, 232, 240, 0.9)",
    boxShadow: "0 20px 46px rgba(15, 23, 42, 0.1)",
  },
  fieldGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "16px",
  },
  field: {
    display: "grid",
    gap: "8px",
  },
  label: {
    color: "#334155",
    fontSize: "14px",
    fontWeight: 800,
  },
  input: {
    minHeight: "46px",
    padding: "0 14px",
    borderRadius: "12px",
    border: "1px solid #dbe3ef",
    fontSize: "15px",
  },
  textarea: {
    minHeight: "92px",
    padding: "13px 14px",
    borderRadius: "12px",
    border: "1px solid #dbe3ef",
    fontSize: "15px",
    resize: "vertical",
    fontFamily: "inherit",
  },
  success: {
    margin: "18px 0 0",
    padding: "12px 14px",
    borderRadius: "12px",
    background: "#dcfce7",
    color: "#166534",
    fontSize: "14px",
    fontWeight: 700,
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "24px",
  },
  primaryButton: {
    minHeight: "44px",
    padding: "0 18px",
    border: 0,
    borderRadius: "999px",
    background: "linear-gradient(135deg, #2563eb, #06b6d4)",
    color: "#ffffff",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 14px 26px rgba(37, 99, 235, 0.28)",
  },
  secondaryButton: {
    minHeight: "44px",
    padding: "0 18px",
    border: "1px solid #dbe3ef",
    borderRadius: "999px",
    background: "#ffffff",
    color: "#334155",
    fontWeight: 800,
    cursor: "pointer",
  },
};

export default SpecRegister;
