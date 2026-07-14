import { useState } from "react";

import SignupForm from "../components/auth/SignupForm";
import Header from "../components/layout/Header";
import { registerUser } from "../features/auth/authService";
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
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setForm((currentForm) => ({
      ...currentForm,
      major: major.name,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

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

    const email = form.email.trim();
    const user = {
      name: form.name.trim(),
      username: form.username.trim(),
      email,
      school: selectedSchool.name,
      schoolMeta: selectedSchool,
      major: selectedMajor.name,
      majorMeta: selectedMajor,
      password: form.password,
    };

    setIsSubmitting(true);

    try {
      await registerUser(user);
      alert(
        `확인 메일을 발송했습니다. ${email} 메일함에서 인증 링크를 눌러 회원가입을 완료해 주세요.`
      );
      navigate(routes.login);
    } catch (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
    }
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

        <SignupForm
          form={form}
          errorMessage={errorMessage}
          isPasswordVisible={isPasswordVisible}
          isPasswordConfirmVisible={isPasswordConfirmVisible}
          schoolResults={schoolResults}
          selectedSchool={selectedSchool}
          isSearchingSchool={isSearchingSchool}
          schoolSearchMessage={schoolSearchMessage}
          majorResults={majorResults}
          selectedMajor={selectedMajor}
          isSearchingMajor={isSearchingMajor}
          majorSearchMessage={majorSearchMessage}
          isSubmitting={isSubmitting}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onSchoolSearch={handleSchoolSearch}
          onSchoolSelect={handleSchoolSelect}
          onMajorSearch={handleMajorSearch}
          onMajorSelect={handleMajorSelect}
          onTogglePassword={() => setIsPasswordVisible((isVisible) => !isVisible)}
          onTogglePasswordConfirm={() =>
            setIsPasswordConfirmVisible((isVisible) => !isVisible)
          }
          onMoveToLogin={() => navigate(routes.login)}
        />
      </section>
    </main>
  );
}

const styles = {
  container: {
    height: "100vh",
    background:
      "radial-gradient(circle at 12% 8%, rgba(37, 99, 235, 0.16), transparent 28%), radial-gradient(circle at 88% 12%, rgba(6, 182, 212, 0.18), transparent 26%), linear-gradient(135deg, #f8fafc 0%, #eef6ff 48%, #f8fbff 100%)",
    fontFamily: "Arial, sans-serif",
    color: "#0f172a",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  page: {
    width: "min(800px, calc(100% - clamp(32px, 6vw, 96px)))",
    height: "calc(100vh - 67px)",
    margin: "0 auto",
    padding: "clamp(12px, 2vw, 20px) 0 18px",
    boxSizing: "border-box",
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "12px",
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
    margin: "0 0 8px",
    padding: "8px 13px",
    borderRadius: "999px",
    backgroundColor: "rgba(37, 99, 235, 0.1)",
    color: "#2563eb",
    fontSize: "13px",
    fontWeight: "bold",
  },
  title: {
    margin: "0 0 8px",
    color: "#0f172a",
    fontSize: "clamp(28px, 4vw, 38px)",
    fontWeight: 800,
    lineHeight: 1.12,
    wordBreak: "keep-all",
  },
  description: {
    margin: 0,
    color: "#475569",
    fontSize: "14px",
    lineHeight: 1.55,
    whiteSpace: "nowrap",
  },
};

export default Signup;
