import { useState } from "react";

import Header from "../components/layout/Header";
import {
  getSession,
} from "../features/auth/authStorage";
import {
  getCareerJobGoal,
  initialJobGoal,
  saveCareerJobGoal,
} from "../features/career/careerStorage";
import {
  companyTypeOptions,
  industryOptions,
  targetRoleOptions,
} from "../data/jobOptions";
import { navigate, routes } from "../router";

function JobGoal() {
  const session = getSession();
  const savedGoal = getCareerJobGoal(session?.id);
  const [form, setForm] = useState({ ...initialJobGoal, ...savedGoal });
  const [message, setMessage] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setMessage("");
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
  };

  const handleOptionSelect = (name, value) => {
    setMessage("");
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!session) {
      alert("목표 직무를 설정하려면 로그인해 주세요.");
      navigate(routes.login);
      return;
    }

    const missingLabels = requiredFieldNames
      .filter((fieldName) => !String(form[fieldName] || "").trim())
      .map((fieldName) => requiredFieldLabels[fieldName]);

    if (missingLabels.length > 0) {
      setMessage(`필수 항목을 선택해 주세요: ${missingLabels.join(", ")}`);
      return;
    }

    saveCareerJobGoal(session.id, form);
    setMessage("목표 직무가 저장되었습니다. AI 분석에서 같은 목표를 기준으로 준비도를 확인할 수 있습니다.");
  };

  if (!session) {
    return (
      <main style={styles.container}>
        <Header />
        <section style={styles.content}>
          <p style={styles.badge}>Career Mission</p>
          <h1 style={styles.title}>목표 직무 설정</h1>
          <p style={styles.description}>
            로그인 후 목표 직무, 관심 산업, 희망 기업 유형을 저장할 수 있습니다.
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
          <h1 style={styles.title}>목표 직무 설정</h1>
          <p style={styles.description}>
            희망 직무와 산업 맥락을 정리합니다. 저장된 목표 직무는 스펙 등록,
            AI 분석, 미션 추천의 기준값으로 함께 사용됩니다.
          </p>
        </div>

        <form style={styles.form} onSubmit={handleSubmit}>
          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <strong style={styles.sectionTitle}>목표 직무</strong>
              <span style={styles.sectionHint}>직접 입력하거나 추천 직무를 선택하세요.</span>
            </div>
            <label style={styles.field}>
              <span style={styles.label}>목표 직무</span>
              <input
                name="targetRole"
                value={form.targetRole}
                onChange={handleChange}
                style={styles.input}
                placeholder="예: 프론트엔드 개발자"
              />
            </label>
            <div style={styles.optionGrid}>
              {targetRoleOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  style={{
                    ...styles.roleOption,
                    ...(form.targetRole === option.value ? styles.selectedOption : {}),
                  }}
                  onClick={() => handleOptionSelect("targetRole", option.value)}
                >
                  <strong>{option.label}</strong>
                  <span>{option.description}</span>
                </button>
              ))}
            </div>
          </section>

          <section style={styles.twoColumnGrid}>
            <label style={styles.field}>
              <span style={styles.label}>관심 산업</span>
              <select
                name="industry"
                value={form.industry}
                onChange={handleChange}
                style={styles.input}
              >
                <option value="">관심 산업을 선택하세요</option>
                {industryOptions.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
            </label>

            <label style={styles.field}>
              <span style={styles.label}>희망 기업 유형</span>
              <select
                name="companyType"
                value={form.companyType}
                onChange={handleChange}
                style={styles.input}
              >
                <option value="">기업 유형을 선택하세요</option>
                {companyTypeOptions.map((companyType) => (
                  <option key={companyType} value={companyType}>
                    {companyType}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <label style={styles.field}>
            <span style={styles.label}>목표 이유</span>
            <textarea
              name="reason"
              value={form.reason}
              onChange={handleChange}
              style={styles.textarea}
              placeholder="이 직무를 선택한 이유, 기대하는 성장 방향, 관심 산업과 연결되는 경험을 적어주세요."
            />
          </label>

          {message && (
            <p style={message.startsWith("필수") ? styles.error : styles.success}>
              {message}
            </p>
          )}

          <div style={styles.actions}>
            <button type="submit" style={styles.secondaryButton}>
              목표 직무 저장
            </button>
            <button
              type="button"
              style={styles.primaryButton}
              onClick={() => navigate(routes.analysis)}
            >
              AI 분석으로 이동
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

const requiredFieldNames = ["targetRole", "industry", "companyType", "reason"];

const requiredFieldLabels = {
  targetRole: "목표 직무",
  industry: "관심 산업",
  companyType: "희망 기업 유형",
  reason: "목표 이유",
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
    width: "min(1040px, calc(100% - clamp(32px, 6vw, 96px)))",
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
    maxWidth: "740px",
    margin: "0 0 24px",
    color: "#475569",
    fontSize: "17px",
    lineHeight: 1.7,
  },
  form: {
    display: "grid",
    gap: "18px",
    padding: "24px",
    borderRadius: "20px",
    background: "rgba(255, 255, 255, 0.78)",
    border: "1px solid rgba(226, 232, 240, 0.9)",
    boxShadow: "0 20px 46px rgba(15, 23, 42, 0.1)",
  },
  section: {
    display: "grid",
    gap: "14px",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
  },
  sectionTitle: {
    fontSize: "17px",
  },
  sectionHint: {
    color: "#64748b",
    fontSize: "14px",
  },
  twoColumnGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "16px",
  },
  field: {
    display: "grid",
    gap: "8px",
    minWidth: 0,
  },
  label: {
    color: "#334155",
    fontSize: "14px",
    fontWeight: 800,
  },
  input: {
    minHeight: "46px",
    minWidth: 0,
    padding: "0 14px",
    borderRadius: "12px",
    border: "1px solid #dbe3ef",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: "15px",
    fontFamily: "inherit",
  },
  textarea: {
    minHeight: "108px",
    padding: "13px 14px",
    borderRadius: "12px",
    border: "1px solid #dbe3ef",
    fontSize: "15px",
    resize: "vertical",
    fontFamily: "inherit",
    lineHeight: 1.6,
  },
  optionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "10px",
  },
  roleOption: {
    display: "grid",
    gap: "6px",
    minHeight: "92px",
    padding: "14px",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    background: "#ffffff",
    color: "#0f172a",
    textAlign: "left",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  selectedOption: {
    borderColor: "#60a5fa",
    background: "#eff6ff",
    boxShadow: "0 12px 24px rgba(37, 99, 235, 0.12)",
  },
  success: {
    margin: 0,
    padding: "12px 14px",
    borderRadius: "12px",
    background: "#dcfce7",
    color: "#166534",
    fontSize: "14px",
    fontWeight: 700,
  },
  error: {
    margin: 0,
    padding: "12px 14px",
    borderRadius: "12px",
    background: "#fee2e2",
    color: "#b91c1c",
    fontSize: "14px",
    fontWeight: 700,
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: "10px",
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

export default JobGoal;
