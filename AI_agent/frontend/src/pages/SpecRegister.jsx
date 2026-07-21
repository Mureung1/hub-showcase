import { useEffect, useState } from "react";

import Header from "../components/layout/Header";
import { getSession } from "../features/auth/authStorage";
import {
  getCareerSpec,
  initialSpec,
  saveCareerSpec,
  specFields,
} from "../features/career/careerStorage";
import { searchJobs } from "../features/career/jobApi";
import { searchQualifications } from "../features/career/qualificationApi";
import { getMySpec, saveMySpec } from "../features/career/specApi";
import { navigate, routes } from "../router";

function SpecRegister() {
  const session = getSession();
  const sessionId = session?.id;
  const savedSpec = getCareerSpec(session?.id);
  const [form, setForm] = useState({ ...initialSpec, ...savedSpec });
  const [message, setMessage] = useState("");
  const [certificateKeyword, setCertificateKeyword] = useState("");
  const [certificateResults, setCertificateResults] = useState([]);
  const [certificateSearchMessage, setCertificateSearchMessage] = useState("");
  const [isSearchingCertificates, setIsSearchingCertificates] = useState(false);
  const [jobResults, setJobResults] = useState([]);
  const [jobSearchMessage, setJobSearchMessage] = useState("");
  const [isSearchingJobs, setIsSearchingJobs] = useState(false);
  const [isLoadingSpec, setIsLoadingSpec] = useState(Boolean(sessionId));
  const [isSavingSpec, setIsSavingSpec] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    let isMounted = true;

    const loadSpec = async () => {
      try {
        const spec = await getMySpec();

        if (isMounted && spec) {
          setForm({ ...initialSpec, ...spec });
        }
      } catch (error) {
        if (isMounted) {
          setMessage(`저장된 스펙을 불러오지 못했습니다. ${error.message}`);
        }
      } finally {
        if (isMounted) {
          setIsLoadingSpec(false);
        }
      }
    };

    loadSpec();

    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setMessage("");
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
  };

  const handleCertificateSearch = async () => {
    const keyword = certificateKeyword.trim();

    if (keyword.length < 2) {
      setCertificateResults([]);
      setCertificateSearchMessage("자격증명은 두 글자 이상 입력해 주세요.");
      return;
    }

    setIsSearchingCertificates(true);
    setCertificateSearchMessage("");

    try {
      const results = await searchQualifications(keyword);
      setCertificateResults(results);
      setCertificateSearchMessage(
        results.length === 0
          ? "검색 결과가 없습니다. 자격증명을 다시 확인해 주세요."
          : "검색 결과에서 자격증을 선택해 주세요."
      );
    } catch (error) {
      setCertificateResults([]);
      setCertificateSearchMessage(error.message);
    } finally {
      setIsSearchingCertificates(false);
    }
  };

  const handleJobSearch = async () => {
    const keyword = form.targetRole.trim();

    setIsSearchingJobs(true);
    setJobSearchMessage("");

    try {
      const results = await searchJobs(keyword);
      setJobResults(results);
      setJobSearchMessage(
        results.length === 0
          ? "검색 결과가 없습니다. 직무명을 다시 확인해 주세요."
          : keyword
            ? "검색 결과에서 목표 직무를 선택해 주세요."
            : "직업 목록에서 목표 직무를 선택해 주세요."
      );
    } catch (error) {
      setJobResults([]);
      setJobSearchMessage(error.message);
    } finally {
      setIsSearchingJobs(false);
    }
  };

  const handleJobSelect = (job) => {
    setForm((currentForm) => ({
      ...currentForm,
      targetRole: job.name,
    }));
    setJobResults([]);
    setJobSearchMessage(`${job.name}을 선택했습니다.`);
    setMessage("");
  };

  const handleCertificateSelect = (certificate) => {
    const currentCertificates = form.certificates
      .split(/[,;\n]/)
      .map((item) => item.trim())
      .filter(Boolean);

    const nextCertificates = Array.from(
      new Set([...currentCertificates, certificate.name])
    );

    setForm((currentForm) => ({
      ...currentForm,
      certificates: nextCertificates.join(", "),
    }));
    setCertificateKeyword("");
    setCertificateResults([]);
    setCertificateSearchMessage(`${certificate.name}을 선택했습니다.`);
    setMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!session) {
      alert("스펙을 등록하려면 로그인해 주세요.");
      navigate(routes.login);
      return;
    }

    const hasMissingRequiredField = requiredSpecFieldNames.some(
      (fieldName) => !String(form[fieldName] || "").trim()
    );

    if (hasMissingRequiredField) {
      const missingLabels = requiredSpecFieldNames
        .filter((fieldName) => !String(form[fieldName] || "").trim())
        .map((fieldName) => requiredSpecFieldLabels[fieldName]);
      setMessage(`필수 항목을 입력해 주세요: ${missingLabels.join(", ")}`);
      return;
    }

    setIsSavingSpec(true);

    try {
      const savedSpec = await saveMySpec(form);
      saveCareerSpec(session.id, savedSpec);
      setForm({ ...initialSpec, ...savedSpec });
      setMessage("스펙이 DB에 저장되었습니다. 분석 화면에서 준비도를 확정할 수 있습니다.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSavingSpec(false);
    }
  };

  if (!session) {
    return (
      <main style={styles.container}>
        <Header />
        <section style={styles.content}>
          <p style={styles.badge}>Career Mission</p>
          <h1 style={styles.title}>스펙 등록</h1>
          <p style={styles.description}>
            로그인 후 목표 직무, 학점, 프로젝트 경험, 대외활동을 등록할 수 있습니다.
            자격증, 어학 점수, 보유 기술 / 활용 도구는 선택 입력입니다.
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
            핵심 분석에 필요한 항목을 등록합니다. 자격증, 어학 점수, 보유 기술 / 활용 도구는
            입력하면 추가 역량으로 반영되고, 비워도 분석을 진행할 수 있습니다.
          </p>
        </div>

        <form style={styles.form} onSubmit={handleSubmit}>
          {isLoadingSpec && (
            <p style={styles.info}>저장된 스펙을 불러오는 중입니다.</p>
          )}

          <div style={styles.fieldGrid}>
            {specFields.map((field) => (
              <label
                key={field.name}
                style={
                  ["targetRole", "certificates"].includes(field.name)
                    ? { ...styles.field, ...styles.lookupField }
                    : styles.field
                }
              >
                <span style={styles.label}>{field.label}</span>
                {field.name === "targetRole" ? (
                  <>
                    <div style={styles.lookupSearch}>
                      <input
                        name={field.name}
                        value={form[field.name]}
                        onChange={(event) => {
                          handleChange(event);
                          setJobResults([]);
                          setJobSearchMessage("");
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handleJobSearch();
                          }
                        }}
                        style={styles.input}
                        placeholder={placeholderByField[field.name]}
                      />
                      <button
                        type="button"
                        style={styles.lookupButton}
                        onClick={handleJobSearch}
                        disabled={isSearchingJobs}
                      >
                        {isSearchingJobs ? "불러오는 중" : "직업 목록"}
                      </button>
                    </div>
                    {jobSearchMessage && (
                      <span style={styles.lookupMessage}>
                        {jobSearchMessage}
                      </span>
                    )}
                    {jobResults.length > 0 && (
                      <div style={styles.lookupResultList}>
                        {jobResults.map((job) => (
                          <button
                            key={job.id}
                            type="button"
                            style={styles.lookupResultItem}
                            onClick={() => handleJobSelect(job)}
                          >
                            <strong>{job.name}</strong>
                            {job.matchedAlias && (
                              <span style={styles.aliasText}>
                                {job.matchedAlias}로도 검색 가능
                              </span>
                            )}
                            <span>
                              {job.category || "직업 분류 정보 없음"}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : field.name === "certificates" ? (
                  <>
                    <div style={styles.lookupSearch}>
                      <input
                        value={certificateKeyword}
                        onChange={(event) => {
                          setCertificateKeyword(event.target.value);
                          setCertificateResults([]);
                          setCertificateSearchMessage("");
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handleCertificateSearch();
                          }
                        }}
                        style={styles.input}
                        placeholder="자격증명을 검색하세요"
                      />
                      <button
                        type="button"
                        style={styles.lookupButton}
                        onClick={handleCertificateSearch}
                        disabled={isSearchingCertificates}
                      >
                        {isSearchingCertificates ? "검색 중" : "자격증 찾기"}
                      </button>
                    </div>
                    <textarea
                      name={field.name}
                      value={form[field.name]}
                      onChange={handleChange}
                      style={styles.textarea}
                      placeholder={placeholderByField[field.name]}
                    />
                    {certificateSearchMessage && (
                      <span style={styles.lookupMessage}>
                        {certificateSearchMessage}
                      </span>
                    )}
                    {certificateResults.length > 0 && (
                      <div style={styles.lookupResultList}>
                        {certificateResults.map((certificate) => (
                          <button
                            key={certificate.id}
                            type="button"
                            style={styles.lookupResultItem}
                            onClick={() => handleCertificateSelect(certificate)}
                          >
                            <strong>{certificate.name}</strong>
                            <span>
                              {[
                                certificate.type,
                                certificate.series,
                                certificate.field,
                                certificate.subField,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : ["projects", "activities", "skills"].includes(field.name) ? (
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
            <button type="submit" style={styles.secondaryButton} disabled={isSavingSpec}>
              {isSavingSpec ? "저장 중" : "저장"}
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
  certificates: "선택: 정보처리기사, SQLD, ADsP",
  languageScore: "선택: TOEIC 850, OPIc IM2",
  projects: "프로젝트명, 역할, 사용 기술, 결과를 적어주세요.",
  activities: "대외활동, 인턴, 동아리, 공모전 경험을 적어주세요.",
  skills: "선택: React, Excel, Figma, Notion, PowerPoint, 한글",
};

const requiredSpecFieldNames = ["targetRole", "grade", "gpa", "projects", "activities"];

const requiredSpecFieldLabels = {
  targetRole: "목표 직무",
  grade: "학년",
  gpa: "학점",
  projects: "프로젝트 경험",
  activities: "대외활동/인턴 경험",
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
    position: "relative",
    display: "grid",
    gap: "8px",
  },
  lookupField: {
    zIndex: 2,
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
  lookupSearch: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: "8px",
  },
  lookupButton: {
    minHeight: "46px",
    padding: "0 12px",
    border: "1px solid #bfdbfe",
    borderRadius: "12px",
    background: "#eff6ff",
    color: "#1d4ed8",
    fontSize: "13px",
    fontWeight: 800,
    whiteSpace: "nowrap",
    cursor: "pointer",
  },
  lookupMessage: {
    color: "#64748b",
    fontSize: "13px",
    lineHeight: 1.4,
  },
  lookupResultList: {
    position: "absolute",
    top: "76px",
    left: 0,
    right: 0,
    zIndex: 20,
    display: "grid",
    gap: "8px",
    maxHeight: "142px",
    overflowY: "auto",
    padding: "8px",
    borderRadius: "14px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    boxShadow: "0 18px 34px rgba(15, 23, 42, 0.14)",
  },
  lookupResultItem: {
    display: "grid",
    gap: "3px",
    width: "100%",
    minHeight: "40px",
    padding: "7px 10px",
    border: 0,
    borderRadius: "10px",
    background: "#ffffff",
    color: "#0f172a",
    textAlign: "left",
    cursor: "pointer",
  },
  aliasText: {
    color: "#1d4ed8",
    fontSize: "12px",
    fontWeight: 800,
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
  info: {
    margin: "0 0 16px",
    padding: "12px 14px",
    borderRadius: "12px",
    background: "#eff6ff",
    color: "#1d4ed8",
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
