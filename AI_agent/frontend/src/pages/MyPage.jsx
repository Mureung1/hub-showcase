import { useEffect, useState } from "react";

import Header from "../components/layout/Header";
import {
  getSession,
  getUser,
  updateUserProfile,
} from "../features/auth/authStorage";
import {
  getCareerAnalysis,
  getCareerSpec,
  isCareerSpecComplete,
  saveCareerAnalysis,
  saveCareerSpec,
} from "../features/career/careerStorage";
import { getMyAnalysis } from "../features/career/analysisApi";
import { getMySpec } from "../features/career/specApi";
import {
  searchMajorsBySchool,
  searchUniversities,
} from "../features/auth/schoolApi";
import { navigate, routes } from "../router";

const specDisplayFields = [
  { name: "targetRole", label: "목표 직무" },
  { name: "grade", label: "학년" },
  { name: "gpa", label: "학점" },
  { name: "certificates", label: "자격증" },
  { name: "languageScore", label: "어학 점수" },
  { name: "projects", label: "프로젝트 경험" },
  { name: "activities", label: "대외활동 / 인턴 경험" },
  { name: "skills", label: "보유 기술 / 활용 도구" },
];

const formatDate = (dateValue) => {
  if (!dateValue) {
    return "기록 없음";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "기록 없음";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

const getValue = (value) => {
  const normalizedValue = String(value || "").trim();
  return normalizedValue || "아직 등록되지 않았습니다.";
};

function MyPage() {
  const session = getSession();
  const sessionId = session?.id;
  const storedUser = getUser();
  const initialUser = session && storedUser?.id === session.id ? storedUser : null;
  const [currentUser, setCurrentUser] = useState(initialUser);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileForm, setProfileForm] = useState({
    name: initialUser?.name || "",
    email: initialUser?.email || "",
    school: initialUser?.school || "",
    major: initialUser?.major || "",
  });
  const [selectedSchool, setSelectedSchool] = useState(initialUser?.schoolMeta || null);
  const [selectedMajor, setSelectedMajor] = useState(initialUser?.majorMeta || null);
  const [schoolResults, setSchoolResults] = useState([]);
  const [majorResults, setMajorResults] = useState([]);
  const [isSearchingSchool, setIsSearchingSchool] = useState(false);
  const [isSearchingMajor, setIsSearchingMajor] = useState(false);
  const [schoolSearchMessage, setSchoolSearchMessage] = useState("");
  const [majorSearchMessage, setMajorSearchMessage] = useState("");
  const [spec, setSpec] = useState(getCareerSpec(session?.id));
  const [analysis, setAnalysis] = useState(getCareerAnalysis(session?.id));
  const [pageMessage, setPageMessage] = useState("");
  const hasSpec = isCareerSpecComplete(spec);
  const hasAnalysis = Boolean(analysis);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    let isMounted = true;

    const loadMyPageData = async () => {
      try {
        const [savedSpec, savedAnalysis] = await Promise.all([
          getMySpec(),
          getMyAnalysis(),
        ]);

        if (!isMounted) {
          return;
        }

        if (savedSpec) {
          setSpec(savedSpec);
          saveCareerSpec(sessionId, savedSpec);
        } else {
          setSpec(null);
        }

        if (savedAnalysis) {
          setAnalysis(savedAnalysis);
          saveCareerAnalysis(sessionId, savedAnalysis);
        } else {
          setAnalysis(null);
        }
      } catch (error) {
        if (isMounted) {
          setPageMessage(error.message);
        }
      }
    };

    loadMyPageData();

    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileMessage("");

    if (name === "school") {
      setSelectedSchool(null);
      setSelectedMajor(null);
      setSchoolResults([]);
      setMajorResults([]);
      setSchoolSearchMessage("");
      setMajorSearchMessage("");
      setProfileForm((currentForm) => ({
        ...currentForm,
        school: value,
        major: "",
      }));
      return;
    }

    if (name === "major") {
      setSelectedMajor(null);
      setMajorResults([]);
      setMajorSearchMessage("");
    }

    setProfileForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleSchoolSearch = async () => {
    const keyword = profileForm.school.trim();

    if (keyword.length < 2) {
      setSchoolResults([]);
      setSchoolSearchMessage("학교명은 두 글자 이상 입력해 주세요.");
      return;
    }

    setIsSearchingSchool(true);
    setSchoolSearchMessage("");

    try {
      const results = await searchUniversities(keyword);
      setSchoolResults(results);
      setSchoolSearchMessage(
        results.length === 0
          ? "검색 결과가 없습니다. 학교명을 다시 확인해 주세요."
          : "검색 결과에서 학교를 선택해 주세요."
      );
    } catch (error) {
      setSchoolResults([]);
      setSchoolSearchMessage(error.message);
    } finally {
      setIsSearchingSchool(false);
    }
  };

  const handleSchoolSelect = (school) => {
    setSelectedSchool(school);
    setSelectedMajor(null);
    setSchoolResults([]);
    setMajorResults([]);
    setSchoolSearchMessage(`${school.name}을 선택했습니다.`);
    setMajorSearchMessage("");
    setProfileForm((currentForm) => ({
      ...currentForm,
      school: school.name,
      major: "",
    }));
  };

  const handleMajorSearch = async () => {
    const keyword = profileForm.major.trim();

    if (!selectedSchool) {
      setMajorResults([]);
      setMajorSearchMessage("먼저 학교 찾기 결과에서 학교를 선택해 주세요.");
      return;
    }

    if (keyword.length < 2) {
      setMajorResults([]);
      setMajorSearchMessage("학과명은 두 글자 이상 입력해 주세요.");
      return;
    }

    setIsSearchingMajor(true);
    setMajorSearchMessage("");

    try {
      const results = await searchMajorsBySchool({
        keyword,
        schoolName: selectedSchool.name,
      });
      setMajorResults(results);
      setMajorSearchMessage(
        results.length === 0
          ? "커리어넷 전공 목록에서 해당 학과를 찾지 못했습니다."
          : "커리어넷 전공 목록에서 학과를 선택해 주세요."
      );
    } catch (error) {
      setMajorResults([]);
      setMajorSearchMessage(error.message);
    } finally {
      setIsSearchingMajor(false);
    }
  };

  const handleMajorSelect = (major) => {
    setSelectedMajor(major);
    setMajorResults([]);
    setMajorSearchMessage(`${major.name}을 선택했습니다.`);
    setProfileForm((currentForm) => ({
      ...currentForm,
      major: major.name,
    }));
  };

  const handleProfileCancel = () => {
    setProfileMessage("");
    setIsEditingProfile(false);
    setProfileForm({
      name: currentUser.name || "",
      email: currentUser.email || "",
      school: currentUser.school || "",
      major: currentUser.major || "",
    });
    setSelectedSchool(currentUser.schoolMeta || null);
    setSelectedMajor(currentUser.majorMeta || null);
    setSchoolResults([]);
    setMajorResults([]);
    setSchoolSearchMessage("");
    setMajorSearchMessage("");
  };

  const handleProfileSubmit = (event) => {
    event.preventDefault();

    const nextProfile = {
      name: profileForm.name.trim(),
      email: profileForm.email.trim(),
      school: profileForm.school.trim(),
      major: profileForm.major.trim(),
    };

    if (Object.values(nextProfile).some((value) => !value)) {
      setProfileMessage("회원 기본 정보를 모두 입력해 주세요.");
      return;
    }

    if (!nextProfile.email.includes("@")) {
      setProfileMessage("올바른 이메일 형식으로 입력해 주세요.");
      return;
    }

    if (!selectedSchool || selectedSchool.name !== nextProfile.school) {
      setProfileMessage("학교 찾기 결과에서 학교를 선택해 주세요.");
      return;
    }

    if (!selectedMajor || selectedMajor.name !== nextProfile.major) {
      setProfileMessage("학과 찾기 결과에서 학과를 선택해 주세요.");
      return;
    }

    const updatedUser = updateUserProfile({
      ...nextProfile,
      schoolMeta: selectedSchool,
      majorMeta: selectedMajor,
    });

    if (!updatedUser) {
      setProfileMessage("회원 정보를 저장하지 못했습니다. 다시 로그인해 주세요.");
      return;
    }

    setCurrentUser(updatedUser);
    setIsEditingProfile(false);
    setProfileMessage("회원 기본 정보가 저장되었습니다.");
  };

  if (!session || !currentUser) {
    return (
      <main style={styles.container}>
        <Header />
        <section style={styles.content}>
          <p style={styles.badge}>Career Mission</p>
          <h1 style={styles.title}>내 정보</h1>
          <div style={styles.emptyState}>
            <strong>로그인이 필요한 화면입니다.</strong>
            <p>
              회원 정보, 등록한 스펙, AI 분석 결과를 확인하려면 먼저 로그인해 주세요.
            </p>
            <button
              type="button"
              style={styles.primaryButton}
              onClick={() => navigate(routes.login)}
            >
              로그인으로 이동
            </button>
          </div>
        </section>
      </main>
    );
  }

  const summaryCards = [
    {
      label: "회원 상태",
      value: currentUser.emailVerified ? "이메일 인증 완료" : "인증 대기",
      tone: currentUser.emailVerified ? "success" : "warning",
    },
    {
      label: "스펙 등록",
      value: hasSpec ? "등록 완료" : "등록 필요",
      tone: hasSpec ? "success" : "warning",
    },
    {
      label: "AI 분석",
      value: hasAnalysis ? `${analysis.readiness}%` : "분석 전",
      tone: hasAnalysis ? "primary" : "warning",
    },
  ];

  return (
    <main style={styles.container}>
      <Header />
      <section style={styles.content}>
        <div style={styles.hero}>
          <div>
            <p style={styles.badge}>My Career Profile</p>
            <h1 style={styles.title}>{currentUser.name}님의 커리어 현황</h1>
            <p style={styles.description}>
              회원가입 정보, 등록한 스펙, 목표 직무와 AI 분석 결과를 한 번에 확인합니다.
            </p>
          </div>

          <div style={styles.heroActions}>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => navigate(routes.specs)}
            >
              스펙 수정
            </button>
            <button
              type="button"
              style={styles.primaryButton}
              onClick={() => navigate(routes.analysis)}
            >
              AI 분석 보기
            </button>
          </div>
        </div>

        <div style={styles.summaryGrid}>
          {summaryCards.map((card) => (
            <section key={card.label} style={styles.summaryCard}>
              <span style={styles.summaryLabel}>{card.label}</span>
              <strong
                style={{
                  ...styles.summaryValue,
                  color:
                    card.tone === "success"
                      ? "#15803d"
                      : card.tone === "primary"
                        ? "#1d4ed8"
                        : "#b45309",
                }}
              >
                {card.value}
              </strong>
            </section>
          ))}
        </div>

        {pageMessage && <p style={styles.pageMessage}>{pageMessage}</p>}

        <div style={styles.mainGrid}>
          <section style={styles.card}>
            <div style={styles.cardHeader}>
              <strong style={styles.cardTitle}>회원 기본 정보</strong>
              <button
                type="button"
                style={styles.textButton}
                onClick={() => {
                  setProfileMessage("");
                  setSchoolResults([]);
                  setMajorResults([]);
                  setSchoolSearchMessage("");
                  setMajorSearchMessage("");
                  setIsEditingProfile((isEditing) => {
                    if (!isEditing) {
                      setSelectedSchool(currentUser.schoolMeta || null);
                      setSelectedMajor(currentUser.majorMeta || null);
                      setProfileForm({
                        name: currentUser.name || "",
                        email: currentUser.email || "",
                        school: currentUser.school || "",
                        major: currentUser.major || "",
                      });
                    }

                    return !isEditing;
                  });
                }}
              >
                {isEditingProfile ? "닫기" : "수정하기"}
              </button>
            </div>
            {isEditingProfile ? (
              <form style={styles.profileForm} onSubmit={handleProfileSubmit}>
                <label style={styles.formField}>
                  <span>이름</span>
                  <input
                    name="name"
                    value={profileForm.name}
                    onChange={handleProfileChange}
                    style={styles.input}
                  />
                </label>
                <label style={styles.formField}>
                  <span>이메일</span>
                  <input
                    type="email"
                    name="email"
                    value={profileForm.email}
                    onChange={handleProfileChange}
                    style={styles.input}
                  />
                </label>
                <label style={{ ...styles.formField, ...styles.lookupField }}>
                  <span>학교</span>
                  <div style={styles.lookupSearch}>
                    <input
                      name="school"
                      value={profileForm.school}
                      onChange={handleProfileChange}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleSchoolSearch();
                        }
                      }}
                      style={styles.input}
                      placeholder="학교명을 검색하세요"
                    />
                    <button
                      type="button"
                      style={styles.lookupButton}
                      onClick={handleSchoolSearch}
                      disabled={isSearchingSchool}
                    >
                      {isSearchingSchool ? "검색 중" : "학교 찾기"}
                    </button>
                  </div>
                  {schoolSearchMessage && (
                    <span
                      style={
                        selectedSchool ? styles.lookupSuccess : styles.lookupMessage
                      }
                    >
                      {schoolSearchMessage}
                    </span>
                  )}
                  {schoolResults.length > 0 && (
                    <div style={styles.lookupResultList}>
                      {schoolResults.map((school) => (
                        <button
                          key={school.id}
                          type="button"
                          style={styles.lookupResultItem}
                          onClick={() => handleSchoolSelect(school)}
                        >
                          <strong>{school.name}</strong>
                          <span>
                            {[school.region, school.campus, school.type]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </label>
                <label style={{ ...styles.formField, ...styles.lookupField }}>
                  <span>전공</span>
                  <div style={styles.lookupSearch}>
                    <input
                      name="major"
                      value={profileForm.major}
                      onChange={handleProfileChange}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleMajorSearch();
                        }
                      }}
                      style={styles.input}
                      placeholder={selectedSchool ? "학과명을 검색하세요" : "학교를 먼저 선택하세요"}
                      disabled={!selectedSchool}
                    />
                    <button
                      type="button"
                      style={styles.lookupButton}
                      onClick={handleMajorSearch}
                      disabled={!selectedSchool || isSearchingMajor}
                    >
                      {isSearchingMajor ? "검색 중" : "학과 찾기"}
                    </button>
                  </div>
                  {majorSearchMessage && (
                    <span
                      style={
                        selectedMajor ? styles.lookupSuccess : styles.lookupMessage
                      }
                    >
                      {majorSearchMessage}
                    </span>
                  )}
                  {majorResults.length > 0 && (
                    <div style={styles.lookupResultList}>
                      {majorResults.map((major) => (
                        <button
                          key={major.id}
                          type="button"
                          style={styles.lookupResultItem}
                          onClick={() => handleMajorSelect(major)}
                        >
                          <strong>{major.name}</strong>
                          <span>
                            {[major.schoolName, major.campus, major.area]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </label>
                {profileMessage && (
                  <p
                    style={{
                      ...styles.profileMessage,
                      color: profileMessage.includes("저장되었습니다")
                        ? "#15803d"
                        : "#b91c1c",
                    }}
                  >
                    {profileMessage}
                  </p>
                )}
                <div style={styles.formActions}>
                  <button type="button" style={styles.secondaryButton} onClick={handleProfileCancel}>
                    취소
                  </button>
                  <button type="submit" style={styles.primaryButton}>
                    저장하기
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div style={styles.infoList}>
                  <InfoItem label="이름" value={currentUser.name} />
                  <InfoItem label="아이디" value={currentUser.username || currentUser.id} />
                  <InfoItem label="이메일" value={currentUser.email} />
                  <InfoItem label="학교" value={currentUser.school} />
                  <InfoItem label="전공" value={currentUser.major} />
                  <InfoItem label="인증일" value={formatDate(currentUser.verifiedAt)} />
                </div>
                {profileMessage && (
                  <p style={{ ...styles.profileMessage, color: "#15803d" }}>
                    {profileMessage}
                  </p>
                )}
              </>
            )}
          </section>

          <section style={styles.card}>
            <div style={styles.cardHeader}>
              <strong style={styles.cardTitle}>AI 분석 요약</strong>
              <span style={styles.cardHint}>
                {hasAnalysis ? "최근 분석 결과" : "분석 대기"}
              </span>
            </div>

            {hasAnalysis ? (
              <div style={styles.analysisPanel}>
                <div style={styles.scoreBox}>
                  <span style={styles.scoreLabel}>준비도</span>
                  <strong style={styles.score}>{analysis.readiness}%</strong>
                  <div style={styles.scoreTrack}>
                    <span
                      style={{
                        ...styles.scoreFill,
                        width: `${analysis.readiness}%`,
                      }}
                    />
                  </div>
                </div>
                <div style={styles.infoList}>
                  <InfoItem label="목표 직무" value={analysis.targetRole} />
                  <InfoItem label="직무 적합도" value={analysis.fitLevel} />
                  <InfoItem label="포트폴리오 준비도" value={analysis.portfolioLevel} />
                  <InfoItem label="번아웃 위험도" value={analysis.burnoutLevel} />
                  <InfoItem label="분석일" value={formatDate(analysis.analyzedAt)} />
                </div>
              </div>
            ) : (
              <EmptyBlock
                title="아직 AI 분석 결과가 없습니다."
                text="스펙을 등록한 뒤 AI 분석을 실행하면 준비도와 보완 우선순위를 확인할 수 있습니다."
                actionLabel={hasSpec ? "AI 분석하기" : "스펙 먼저 등록하기"}
                onAction={() => navigate(hasSpec ? routes.analysis : routes.specs)}
              />
            )}
          </section>
        </div>

        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <strong style={styles.cardTitle}>등록한 스펙</strong>
            <div style={styles.headerActions}>
              <span style={styles.cardHint}>
                {hasSpec ? `최근 수정 ${formatDate(spec.updatedAt)}` : "등록 필요"}
              </span>
              <button
                type="button"
                style={styles.textButton}
                onClick={() => navigate(routes.specs)}
              >
                수정하기
              </button>
            </div>
          </div>

          {hasSpec ? (
            <div style={styles.specGrid}>
              {specDisplayFields.map((field) => (
                <article
                  key={field.name}
                  style={
                    ["projects", "activities", "skills", "certificates"].includes(
                      field.name
                    )
                      ? { ...styles.specItem, ...styles.wideSpecItem }
                      : styles.specItem
                  }
                >
                  <span style={styles.specLabel}>{field.label}</span>
                  <p style={styles.specValue}>{getValue(spec[field.name])}</p>
                </article>
              ))}
            </div>
          ) : (
            <EmptyBlock
              title="등록된 스펙 정보가 없습니다."
              text="목표 직무와 경험을 입력하면 AI 분석과 미션 추천에 활용됩니다. 기술 / 활용 도구는 선택 입력입니다."
              actionLabel="스펙 등록하기"
              onAction={() => navigate(routes.specs)}
            />
          )}
        </section>
      </section>
    </main>
  );
}

function InfoItem({ label, value }) {
  return (
    <div style={styles.infoItem}>
      <span>{label}</span>
      <strong>{getValue(value)}</strong>
    </div>
  );
}

function EmptyBlock({ title, text, actionLabel, onAction }) {
  return (
    <div style={styles.emptyBlock}>
      <strong>{title}</strong>
      <p>{text}</p>
      <button type="button" style={styles.primaryButton} onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 12% 8%, rgba(37, 99, 235, 0.16), transparent 28%), radial-gradient(circle at 88% 12%, rgba(6, 182, 212, 0.18), transparent 26%), linear-gradient(135deg, #f8fafc 0%, #eef6ff 48%, #f8fbff 100%)",
    fontFamily: "Arial, sans-serif",
    color: "#0f172a",
  },
  content: {
    width: "min(1120px, calc(100% - clamp(32px, 6vw, 96px)))",
    margin: "0 auto",
    padding: "clamp(30px, 5vw, 58px) 0 92px",
    display: "grid",
    gap: "18px",
  },
  hero: {
    display: "flex",
    alignItems: "end",
    justifyContent: "space-between",
    gap: "18px",
  },
  badge: {
    display: "inline-block",
    margin: "0 0 14px",
    padding: "8px 13px",
    borderRadius: "999px",
    backgroundColor: "rgba(37, 99, 235, 0.1)",
    color: "#2563eb",
    fontSize: "13px",
    fontWeight: "bold",
  },
  title: {
    margin: "0 0 12px",
    color: "#0f172a",
    fontSize: "clamp(30px, 4vw, 44px)",
    fontWeight: 800,
    lineHeight: 1.16,
    wordBreak: "keep-all",
  },
  description: {
    maxWidth: "680px",
    margin: 0,
    color: "#475569",
    fontSize: "16px",
    lineHeight: 1.65,
  },
  heroActions: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: "10px",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "12px",
  },
  summaryCard: {
    minWidth: 0,
    display: "grid",
    gap: "7px",
    padding: "16px",
    borderRadius: "16px",
    background: "rgba(255, 255, 255, 0.78)",
    border: "1px solid rgba(226, 232, 240, 0.9)",
    boxShadow: "0 16px 34px rgba(15, 23, 42, 0.08)",
  },
  summaryLabel: {
    color: "#64748b",
    fontSize: "13px",
    fontWeight: 800,
  },
  summaryValue: {
    color: "#0f172a",
    fontSize: "20px",
  },
  pageMessage: {
    margin: 0,
    padding: "12px 14px",
    borderRadius: "12px",
    background: "#fee2e2",
    color: "#b91c1c",
    fontSize: "14px",
    fontWeight: 700,
  },
  mainGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.15fr)",
    gap: "16px",
  },
  card: {
    minWidth: 0,
    padding: "20px",
    borderRadius: "18px",
    background: "rgba(255, 255, 255, 0.78)",
    border: "1px solid rgba(226, 232, 240, 0.9)",
    boxShadow: "0 18px 38px rgba(15, 23, 42, 0.08)",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "16px",
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: "10px",
  },
  cardTitle: {
    color: "#0f172a",
    fontSize: "18px",
  },
  cardHint: {
    color: "#64748b",
    fontSize: "13px",
    fontWeight: 800,
  },
  textButton: {
    minHeight: "34px",
    padding: "0 12px",
    border: "1px solid #bfdbfe",
    borderRadius: "999px",
    background: "#eff6ff",
    color: "#1d4ed8",
    fontSize: "13px",
    fontWeight: 800,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  infoList: {
    display: "grid",
    gap: "10px",
  },
  profileForm: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "12px",
  },
  formField: {
    minWidth: 0,
    display: "grid",
    gap: "7px",
    color: "#334155",
    fontSize: "13px",
    fontWeight: 800,
    alignContent: "start",
  },
  lookupField: {
    minHeight: "196px",
  },
  input: {
    width: "100%",
    minHeight: "42px",
    padding: "0 12px",
    border: "1px solid #dbe3ef",
    borderRadius: "12px",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: "14px",
    boxSizing: "border-box",
  },
  lookupSearch: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: "8px",
  },
  lookupButton: {
    minHeight: "42px",
    padding: "0 10px",
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
  lookupSuccess: {
    color: "#15803d",
    fontSize: "13px",
    fontWeight: 800,
    lineHeight: 1.4,
  },
  lookupResultList: {
    display: "grid",
    gap: "8px",
    maxHeight: "142px",
    overflowY: "auto",
    padding: "8px",
    borderRadius: "14px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    boxShadow: "0 18px 34px rgba(15, 23, 42, 0.12)",
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
  profileMessage: {
    gridColumn: "1 / -1",
    margin: 0,
    padding: "10px 12px",
    borderRadius: "12px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    fontSize: "13px",
    fontWeight: 800,
  },
  formActions: {
    gridColumn: "1 / -1",
    display: "flex",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: "10px",
  },
  infoItem: {
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "14px",
    padding: "12px 13px",
    borderRadius: "12px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    color: "#64748b",
    fontSize: "14px",
  },
  analysisPanel: {
    display: "grid",
    gridTemplateColumns: "180px minmax(0, 1fr)",
    gap: "14px",
    alignItems: "start",
  },
  scoreBox: {
    display: "grid",
    gap: "10px",
    padding: "18px",
    borderRadius: "16px",
    background: "linear-gradient(155deg, #0f172a, #1e293b)",
    color: "#e2e8f0",
  },
  scoreLabel: {
    color: "#cbd5e1",
    fontSize: "13px",
    fontWeight: 800,
  },
  score: {
    color: "#ffffff",
    fontSize: "42px",
    lineHeight: 1,
  },
  scoreTrack: {
    height: "8px",
    borderRadius: "999px",
    background: "rgba(255, 255, 255, 0.12)",
    overflow: "hidden",
  },
  scoreFill: {
    display: "block",
    height: "100%",
    borderRadius: "999px",
    background: "linear-gradient(90deg, #60a5fa, #22d3ee)",
  },
  specGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "12px",
  },
  specItem: {
    minWidth: 0,
    display: "grid",
    gap: "8px",
    padding: "14px",
    borderRadius: "14px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
  },
  wideSpecItem: {
    gridColumn: "span 2",
  },
  specLabel: {
    color: "#2563eb",
    fontSize: "13px",
    fontWeight: 800,
  },
  specValue: {
    margin: 0,
    color: "#334155",
    fontSize: "14px",
    lineHeight: 1.55,
    whiteSpace: "pre-wrap",
    wordBreak: "keep-all",
  },
  emptyState: {
    display: "grid",
    gap: "14px",
    maxWidth: "640px",
    padding: "22px",
    borderRadius: "18px",
    background: "rgba(255, 255, 255, 0.78)",
    border: "1px solid rgba(226, 232, 240, 0.9)",
    boxShadow: "0 18px 38px rgba(15, 23, 42, 0.08)",
    color: "#475569",
  },
  emptyBlock: {
    display: "grid",
    gap: "12px",
    padding: "16px",
    borderRadius: "14px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    color: "#475569",
  },
  primaryButton: {
    minHeight: "42px",
    padding: "0 17px",
    border: 0,
    borderRadius: "999px",
    background: "linear-gradient(135deg, #2563eb, #06b6d4)",
    color: "#ffffff",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 14px 26px rgba(37, 99, 235, 0.28)",
  },
  secondaryButton: {
    minHeight: "42px",
    padding: "0 17px",
    border: "1px solid #dbe3ef",
    borderRadius: "999px",
    background: "#ffffff",
    color: "#334155",
    fontWeight: 800,
    cursor: "pointer",
  },
};

export default MyPage;
