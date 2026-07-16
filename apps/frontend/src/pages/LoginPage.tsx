import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "../features/auth";

const loginSchema = z.object({
  email: z.string().trim().email("이메일 형식을 확인해주세요."),
  password: z.string().min(1, "비밀번호를 입력해주세요.")
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState("");

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    setErrorMessage("");

    try {
      await signIn(values);
      navigate("/stores/select", { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "로그인에 실패했습니다.");
    }
  });

  return (
    <main className="auth-stage">
      <section className="auth-card" aria-labelledby="login-title">
        <Link className="brand auth-brand" to="/">
          <span className="brand-mark">A</span>
          <span>알바노트</span>
        </Link>

        <div className="auth-heading">
          <p className="label">LOGIN</p>
          <h1 id="login-title">로그인</h1>
        </div>

        <form className="auth-form" onSubmit={onSubmit}>
          <label>
            <span>이메일</span>
            <input autoComplete="email" type="email" {...register("email")} />
            {errors.email ? <strong>{errors.email.message}</strong> : null}
          </label>

          <label>
            <span>비밀번호</span>
            <input autoComplete="current-password" type="password" {...register("password")} />
            {errors.password ? <strong>{errors.password.message}</strong> : null}
          </label>

          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "로그인 중" : "로그인"}
          </button>
        </form>

        <p className="auth-link">
          계정이 없다면 <Link to="/signup">회원가입</Link>
        </p>
      </section>
    </main>
  );
}
