import { useState } from "react";

import Header from "../components/layout/Header";
import {
  getPendingUser,
  getUser,
  savePendingUser,
} from "../features/auth/authStorage";
import {
  searchMajorsBySchool,
  searchUniversities,
} from "../features/auth/schoolApi";
import { navigate, routes } from "../router";

const initialForm = {
  name: "",
  username: "",
  email: "",
  password: "",
  passwordConfirm: "",
  school: "",
  major: "",
};

const isValidUsername = (username) =>
  /^[A-Za-z0-9]+$/.test(username) &&
  /[A-Za-z]/.test(username) &&
  /\d/.test(username);

const isValidPassword = (password) =>
  password.length >= 6 &&
  /[A-Za-z]/.test(password) &&
  /\d/.test(password) &&
  /[^A-Za-z0-9]/.test(password);

const createVerificationToken = () => {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

function Signup() {
  const [form, setForm] = useState(initialForm);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isPasswordConfirmVisible, setIsPasswordConfirmVisible] =
    useState(false);
  const [schoolResults, setSchoolResults] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [isSearchingSchool, setIsSearchingSchool] = useState(false);
  const [schoolSearchMessage, setSchoolSearchMessage] = useState("");
  const [majorResults, setMajorResults] = useState([]);
  const [selectedMajor, setSelectedMajor] = useState(null);
  const [isSearchingMajor, setIsSearchingMajor] = useState(false);
  const [majorSearchMessage, setMajorSearchMessage] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === "school") {
      setSelectedSchool(null);
      setSchoolSearchMessage("");
      setSelectedMajor(null);
      setMajorResults([]);
      setMajorSearchMessage("");
      setForm((currentForm) => ({
        ...currentForm,
        school: value,
        major: "",
      }));
      return;
    }

    if (name === "major") {
      setSelectedMajor(null);
      setMajorSearchMessage("");
    }

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleSchoolSearch = async () => {
    const keyword = form.school.trim();

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
    setSchoolResults([]);
    setSchoolSearchMessage(`${school.name}을 선택했습니다.`);
    setSelectedMajor(null);
    setMajorResults([]);
    setMajorSearchMessage("");
    setForm((currentForm) => ({
      ...currentForm,
      school: school.name,
      major: "",
    }));
  };

  const handleMajorSearch = async () => {
    const keyword = form.major.trim();

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
          ? "선택한 학교에서 해당 학과를 찾지 못했습니다."
          : "검색 결과에서 학과를 선택해 주세요."
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
    setForm((currentForm) => ({
      ...currentForm,
      major: major.name,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const hasEmptyField = Object.values(form).some(
      (value) => value.trim() === ""
    );

    if (hasEmptyField) {
      setErrorMessage("모든 항목을 입력해 주세요.");
      return;
    }

    if (!isValidUsername(form.username)) {
      setErrorMessage("아이디는 영문과 숫자를 모두 포함해 입력해 주세요.");
      return;
    }

    const existingUser = getUser();
    const pendingUser = getPendingUser();
    const username = form.username.trim();
    const email = form.email.trim();

    if (
      existingUser?.username === username ||
      pendingUser?.username === username
    ) {
      setErrorMessage("이미 존재하는 아이디입니다.");
      return;
    }

    if (existingUser?.email === email || pendingUser?.email === email) {
      setErrorMessage("이미 가입 또는 인증 대기 중인 이메일입니다.");
      return;
    }

    if (!selectedSchool || selectedSchool.name !== form.school.trim()) {
      setErrorMessage("학교 찾기 결과에서 학교를 선택해 주세요.");
      return;
    }

    if (!selectedMajor || selectedMajor.name !== form.major.trim()) {
      setErrorMessage("학과 찾기 결과에서 학과를 선택해 주세요.");
      return;
    }

    if (!isValidPassword(form.password)) {
      setErrorMessage(
        "비밀번호는 6자 이상이며 영문, 숫자, 특수문자를 모두 포함해야 합니다."
      );
      return;
    }

    if (form.password !== form.passwordConfirm) {
      setErrorMessage("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    const verificationToken = createVerificationToken();
    const verificationUrl = `${window.location.origin}${routes.verifyEmail}?token=${verificationToken}`;
    const user = {
      id: form.username.trim(),
      name: form.name.trim(),
      username,
      email,
      school: selectedSchool.name,
      schoolMeta: selectedSchool,
      major: selectedMajor.name,
      majorMeta: selectedMajor,
      password: form.password,
      emailVerified: false,
      verificationToken,
    };

    savePendingUser(user);
    alert(
      `확인 메일을 발송했습니다. ${form.email.trim()} 메일함에서 확인 버튼을 눌러 회원가입을 완료해 주세요.\n\n개발용 확인 링크: ${verificationUrl}`
    );
    navigate(routes.login);
  };

  return (
    <main style={styles.container}>
      <Header />
      <section style={styles.page}>
        <div style={styles.intro}>
          <p style={styles.badge}>Career Mission</p>
          <h1 style={styles.title}>회원가입</h1>
          <p style={styles.description}>
            기본 정보를 입력하면 스펙 등록, AI 분석, 맞춤 미션 추천 흐름을 시작할 수 있습니다.
          </p>
        </div>

        <form style={styles.form} onSubmit={handleSubmit}>
          <div style={styles.formHeader}>
            <strong style={styles.formTitle}>계정 정보 입력</strong>
            <span style={styles.formHint}>모든 항목은 MVP 분석에 활용됩니다.</span>
          </div>

          <div style={styles.fieldGrid}>
            <label style={styles.field}>
              <span style={styles.label}>이름</span>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                style={styles.input}
                placeholder="홍길동"
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>아이디</span>
              <input
                name="username"
                value={form.username}
                onChange={handleChange}
                style={styles.input}
                placeholder="career01"
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>이메일</span>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                style={styles.input}
                placeholder="user@example.com"
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>학교</span>
              <div style={styles.schoolSearch}>
                <input
                  name="school"
                  value={form.school}
                  onChange={handleChange}
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
                  style={styles.searchButton}
                  onClick={handleSchoolSearch}
                  disabled={isSearchingSchool}
                >
                  {isSearchingSchool ? "검색 중" : "학교 찾기"}
                </button>
              </div>
              {schoolSearchMessage && (
                <span
                  style={
                    selectedSchool ? styles.schoolSuccess : styles.schoolMessage
                  }
                >
                  {schoolSearchMessage}
                </span>
              )}
              {schoolResults.length > 0 && (
                <div style={styles.schoolResultList}>
                  {schoolResults.map((school) => (
                    <button
                      key={school.id}
                      type="button"
                      style={styles.schoolResultItem}
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

            <label style={styles.field}>
              <span style={styles.label}>전공</span>
              <div style={styles.schoolSearch}>
                <input
                  name="major"
                  value={form.major}
                  onChange={handleChange}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleMajorSearch();
                    }
                  }}
                  style={styles.input}
                  placeholder={
                    selectedSchool
                      ? "학과명을 검색하세요"
                      : "학교를 먼저 선택하세요"
                  }
                  disabled={!selectedSchool}
                />
                <button
                  type="button"
                  style={styles.searchButton}
                  onClick={handleMajorSearch}
                  disabled={!selectedSchool || isSearchingMajor}
                >
                  {isSearchingMajor ? "검색 중" : "학과 찾기"}
                </button>
              </div>
              {majorSearchMessage && (
                <span
                  style={
                    selectedMajor ? styles.schoolSuccess : styles.schoolMessage
                  }
                >
                  {majorSearchMessage}
                </span>
              )}
              {majorResults.length > 0 && (
                <div style={styles.schoolResultList}>
                  {majorResults.map((major) => (
                    <button
                      key={major.id}
                      type="button"
                      style={styles.schoolResultItem}
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

            <div style={styles.emptyCell}></div>

            <label style={styles.field}>
              <span style={styles.label}>비밀번호</span>
              <div style={styles.passwordField}>
                <input
                  type={isPasswordVisible ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  style={{ ...styles.input, ...styles.passwordInput }}
                  placeholder="영문, 숫자, 특수문자 포함"
                />
                <button
                  type="button"
                  style={styles.passwordToggle}
                  onClick={() => setIsPasswordVisible((isVisible) => !isVisible)}
                  aria-label={
                    isPasswordVisible ? "비밀번호 숨기기" : "비밀번호 보기"
                  }
                >
                  {isPasswordVisible ? (
                    <svg style={styles.eyeIcon} viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3.3 2 22 20.7 20.7 22l-3.3-3.3A12.7 12.7 0 0 1 12 20C5 20 1.4 13.7 1.2 13.4a2.8 2.8 0 0 1 0-2.8 16 16 0 0 1 4.3-4.8L2 3.3 3.3 2Zm5 6.7a5 5 0 0 0 7 7l-1.5-1.5a3 3 0 0 1-4-4L8.3 8.7Zm3-3.6c.2 0 .5-.1.7-.1 7 0 10.6 6.3 10.8 6.6.5.9.5 1.9 0 2.8a14.7 14.7 0 0 1-2.4 3L17 14a5 5 0 0 0-6.4-6.4L8.9 5.9a12.4 12.4 0 0 1 2.4-.8Z" />
                    </svg>
                  ) : (
                    <svg style={styles.eyeIcon} viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 5c7 0 10.6 6.3 10.8 6.6.5.9.5 1.9 0 2.8C22.6 14.7 19 21 12 21S1.4 14.7 1.2 14.4a2.8 2.8 0 0 1 0-2.8C1.4 11.3 5 5 12 5Zm0 2C6.3 7 3.3 12.2 3 12.6c-.1.2-.1.6 0 .8.3.4 3.3 5.6 9 5.6s8.7-5.2 9-5.6c.1-.2.1-.6 0-.8-.3-.4-3.3-5.6-9-5.6Zm0 2.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Zm0 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
                    </svg>
                  )}
                </button>
              </div>
            </label>

            <label style={styles.field}>
              <span style={styles.label}>비밀번호 확인</span>
              <div style={styles.passwordField}>
                <input
                  type={isPasswordConfirmVisible ? "text" : "password"}
                  name="passwordConfirm"
                  value={form.passwordConfirm}
                  onChange={handleChange}
                  style={{ ...styles.input, ...styles.passwordInput }}
                  placeholder="비밀번호 재입력"
                />
                <button
                  type="button"
                  style={styles.passwordToggle}
                  onClick={() =>
                    setIsPasswordConfirmVisible((isVisible) => !isVisible)
                  }
                  aria-label={
                    isPasswordConfirmVisible
                      ? "비밀번호 확인 숨기기"
                      : "비밀번호 확인 보기"
                  }
                >
                  {isPasswordConfirmVisible ? (
                    <svg style={styles.eyeIcon} viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3.3 2 22 20.7 20.7 22l-3.3-3.3A12.7 12.7 0 0 1 12 20C5 20 1.4 13.7 1.2 13.4a2.8 2.8 0 0 1 0-2.8 16 16 0 0 1 4.3-4.8L2 3.3 3.3 2Zm5 6.7a5 5 0 0 0 7 7l-1.5-1.5a3 3 0 0 1-4-4L8.3 8.7Zm3-3.6c.2 0 .5-.1.7-.1 7 0 10.6 6.3 10.8 6.6.5.9.5 1.9 0 2.8a14.7 14.7 0 0 1-2.4 3L17 14a5 5 0 0 0-6.4-6.4L8.9 5.9a12.4 12.4 0 0 1 2.4-.8Z" />
                    </svg>
                  ) : (
                    <svg style={styles.eyeIcon} viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 5c7 0 10.6 6.3 10.8 6.6.5.9.5 1.9 0 2.8C22.6 14.7 19 21 12 21S1.4 14.7 1.2 14.4a2.8 2.8 0 0 1 0-2.8C1.4 11.3 5 5 12 5Zm0 2C6.3 7 3.3 12.2 3 12.6c-.1.2-.1.6 0 .8.3.4 3.3 5.6 9 5.6s8.7-5.2 9-5.6c.1-.2.1-.6 0-.8-.3-.4-3.3-5.6-9-5.6Zm0 2.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Zm0 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
                    </svg>
                  )}
                </button>
              </div>
            </label>
          </div>

          {errorMessage && <p style={styles.error}>{errorMessage}</p>}

          <div style={styles.actions}>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => navigate(routes.login)}
            >
              로그인으로 이동
            </button>
            <button type="submit" style={styles.primaryButton}>
              회원가입 완료
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 12% 8%, rgba(37, 99, 235, 0.16), transparent 28%), radial-gradient(circle at 88% 12%, rgba(6, 182, 212, 0.18), transparent 26%), linear-gradient(135deg, #f8fafc 0%, #eef6ff 48%, #f8fbff 100%)",
    fontFamily: "Arial, sans-serif",
    color: "#0f172a",
    display: "flex",
    flexDirection: "column",
  },
  page: {
    width: "min(760px, calc(100% - clamp(32px, 6vw, 96px)))",
    minHeight: "calc(100vh - 67px)",
    margin: "0 auto",
    padding: "clamp(24px, 4vw, 44px) 0 92px",
    boxSizing: "border-box",
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "24px",
    alignItems: "center",
    alignContent: "center",
    justifyItems: "center",
  },
  intro: {
    paddingTop: 0,
    width: "100%",
    textAlign: "center",
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
    color: "#0f172a",
    fontSize: "clamp(34px, 5vw, 52px)",
    fontWeight: 800,
    lineHeight: 1.12,
  },
  description: {
    margin: 0,
    color: "#475569",
    fontSize: "16px",
    lineHeight: 1.75,
    whiteSpace: "nowrap",
  },
  form: {
    width: "100%",
    padding: "28px",
    borderRadius: "24px",
    background: "rgba(255, 255, 255, 0.76)",
    border: "1px solid rgba(226, 232, 240, 0.88)",
    boxShadow: "0 24px 54px rgba(15, 23, 42, 0.12)",
    backdropFilter: "blur(18px) saturate(140%)",
  },
  formHeader: {
    display: "grid",
    gap: "6px",
    marginBottom: "22px",
    textAlign: "center",
  },
  formTitle: {
    color: "#0f172a",
    fontSize: "20px",
  },
  formHint: {
    color: "#64748b",
    fontSize: "14px",
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
  schoolSearch: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "8px",
  },
  label: {
    color: "#334155",
    fontSize: "14px",
    fontWeight: 700,
  },
  input: {
    width: "100%",
    minHeight: "46px",
    padding: "0 14px",
    borderRadius: "12px",
    border: "1px solid #dbe3ef",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: "15px",
    boxSizing: "border-box",
  },
  passwordField: {
    position: "relative",
  },
  passwordInput: {
    paddingRight: "62px",
  },
  passwordToggle: {
    position: "absolute",
    top: "50%",
    right: "8px",
    width: "34px",
    height: "34px",
    padding: 0,
    border: "1px solid #dbe3ef",
    borderRadius: "50%",
    background: "#f8fafc",
    color: "#334155",
    cursor: "pointer",
    transform: "translateY(-50%)",
    display: "grid",
    placeItems: "center",
  },
  eyeIcon: {
    width: "18px",
    height: "18px",
    display: "block",
    fill: "currentColor",
  },
  searchButton: {
    minHeight: "46px",
    padding: "0 14px",
    border: "1px solid #bfdbfe",
    borderRadius: "12px",
    background: "#eff6ff",
    color: "#1d4ed8",
    fontSize: "14px",
    fontWeight: 800,
    whiteSpace: "nowrap",
    cursor: "pointer",
  },
  schoolMessage: {
    color: "#64748b",
    fontSize: "13px",
    lineHeight: 1.4,
  },
  schoolSuccess: {
    color: "#15803d",
    fontSize: "13px",
    fontWeight: 700,
    lineHeight: 1.4,
  },
  schoolResultList: {
    display: "grid",
    gap: "8px",
    padding: "8px",
    borderRadius: "14px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
  },
  schoolResultItem: {
    display: "grid",
    gap: "3px",
    width: "100%",
    padding: "10px 12px",
    border: 0,
    borderRadius: "10px",
    background: "#ffffff",
    color: "#0f172a",
    textAlign: "left",
    cursor: "pointer",
  },
  emptyCell: {
    display: "block",
  },
  error: {
    margin: "16px 0 0",
    padding: "12px 14px",
    borderRadius: "12px",
    background: "#fee2e2",
    color: "#b91c1c",
    fontSize: "14px",
    fontWeight: 700,
  },
  actions: {
    display: "flex",
    justifyContent: "center",
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

export default Signup;
