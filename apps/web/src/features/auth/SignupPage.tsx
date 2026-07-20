import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/Layout";
import { AuthLayout } from "./AuthLayout";
import { signUp } from "./authService";
import {
  PASSWORD_MIN_LENGTH,
  validateSignup,
  type FieldErrors,
  type SignupFormValues,
} from "./validation";
import type { AuthErrorInfo } from "./types";

type SubmitStatus = "idle" | "loading" | "error";

/** 회원가입 페이지 (SPEC-AUTH-001 3장). */
export function SignupPage() {
  const navigate = useNavigate();

  const [values, setValues] = useState<SignupFormValues>({
    email: "",
    password: "",
    passwordConfirm: "",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<keyof SignupFormValues & string>>({});
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [submitError, setSubmitError] = useState<AuthErrorInfo | null>(null);

  function update(field: keyof SignupFormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errors = validateSignup(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setStatus("loading");
    setSubmitError(null);
    const email = values.email.trim();
    const result = await signUp(email, values.password);
    if (result.ok) {
      // 자동 로그인 없음 — 안내 페이지로 이동한다 (결정 2-3).
      navigate("/verify-email", { replace: true, state: { email } });
      return;
    }
    setStatus("error");
    setSubmitError(result.error);
  }

  const isLoading = status === "loading";

  return (
    <AuthLayout
      title="회원가입"
      description="이메일과 비밀번호로 계정을 만듭니다."
      footer={
        <Text type="supporting" color="secondary">
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </Text>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <VStack gap={3}>
          <TextInput
            type="email"
            label="이메일"
            value={values.email}
            onChange={(v) => update("email", v)}
            placeholder="you@example.com"
            isDisabled={isLoading}
            status={fieldErrors.email ? { type: "error", message: fieldErrors.email } : undefined}
          />
          <TextInput
            type="password"
            label="비밀번호"
            description={`최소 ${PASSWORD_MIN_LENGTH}자`}
            value={values.password}
            onChange={(v) => update("password", v)}
            isDisabled={isLoading}
            status={
              fieldErrors.password ? { type: "error", message: fieldErrors.password } : undefined
            }
          />
          <TextInput
            type="password"
            label="비밀번호 확인"
            value={values.passwordConfirm}
            onChange={(v) => update("passwordConfirm", v)}
            isDisabled={isLoading}
            status={
              fieldErrors.passwordConfirm
                ? { type: "error", message: fieldErrors.passwordConfirm }
                : undefined
            }
          />

          {submitError && <Banner status="error" title={submitError.message} />}

          <Button type="submit" label="회원가입" variant="primary" isLoading={isLoading} />
        </VStack>
      </form>
    </AuthLayout>
  );
}
