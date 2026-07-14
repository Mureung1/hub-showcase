import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "../features/auth";

const signupSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해주세요."),
  email: z.string().trim().email("이메일 형식을 확인해주세요."),
  password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다.")
});

type SignupFormValues = z.infer<typeof signupSchema>;

export function SignupPage() {
  const { retryProfileCreation, session, signUp } = useAuth();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingProfileName, setPendingProfileName] = useState("");
  const [isRetryingProfile, setIsRetryingProfile] = useState(false);

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: ""
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    setErrorMessage("");
    setPendingProfileName(values.name);

    try {
      await signUp(values);
      navigate("/stores/select", { replace: true });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "프로필 생성에 실패했습니다. 다시 로그인 후 시도해주세요."
      );
    }
  });

  const handleRetryProfile = async () => {
    if (!pendingProfileName) {
      return;
    }

    setIsRetryingProfile(true);
    setErrorMessage("");

    try {
      await retryProfileCreation(pendingProfileName);
      navigate("/stores/select", { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "프로필 생성에 실패했습니다.");
    } finally {
      setIsRetryingProfile(false);
    }
  };

  const canRetryProfile = Boolean(session && pendingProfileName && errorMessage);

  return (
    <main className="auth-stage">
      <section className="auth-card" aria-labelledby="signup-title">
        <Link className="brand auth-brand" to="/">
          <span className="brand-mark">A</span>
          <span>알바노트</span>
        </Link>

        <div className="auth-heading">
          <p className="label">SIGN UP</p>
          <h1 id="signup-title">회원가입</h1>
        </div>

        <form className="auth-form" onSubmit={onSubmit}>
          <label>
            <span>이름</span>
            <input autoComplete="name" type="text" {...register("name")} />
            {errors.name ? <strong>{errors.name.message}</strong> : null}
          </label>

          <label>
            <span>이메일</span>
            <input autoComplete="email" type="email" {...register("email")} />
            {errors.email ? <strong>{errors.email.message}</strong> : null}
          </label>

          <label>
            <span>비밀번호</span>
            <input autoComplete="new-password" type="password" {...register("password")} />
            {errors.password ? <strong>{errors.password.message}</strong> : null}
          </label>

          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "가입 중" : "회원가입"}
          </button>

          {canRetryProfile ? (
            <button
              className="secondary-button"
              disabled={isRetryingProfile}
              onClick={handleRetryProfile}
              type="button"
            >
              {isRetryingProfile ? "재시도 중" : "프로필 생성 재시도"}
            </button>
          ) : null}
        </form>

        <p className="auth-link">
          이미 계정이 있다면 <Link to="/login">로그인</Link>
        </p>
      </section>
    </main>
  );
}
