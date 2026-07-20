import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/Layout";
import { AuthLayout } from "./AuthLayout";
import { useAuth } from "./useAuth";
import { useResendCooldown } from "./useResendCooldown";
import { signIn } from "./authService";
import { validateLogin, type FieldErrors, type LoginFormValues } from "./validation";
import type { AuthErrorInfo } from "./types";

type SubmitStatus = "idle" | "loading" | "error";

/** 로그인 페이지 (SPEC-AUTH-001 4장). */
export function LoginPage() {
  const navigate = useNavigate();
  const { setSession, sessionExpired, clearSessionExpired } = useAuth();
  const resend = useResendCooldown();

  // 만료 안내는 화면을 떠나면 사라지게 한다 — 새로고침·이탈 후 문구가 남지 않도록 (4장).
  useEffect(() => clearSessionExpired, [clearSessionExpired]);

  const [values, setValues] = useState<LoginFormValues>({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<keyof LoginFormValues & string>>({});
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [submitError, setSubmitError] = useState<AuthErrorInfo | null>(null);

  function update(field: keyof LoginFormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errors = validateLogin(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setStatus("loading");
    setSubmitError(null);
    const result = await signIn(values.email.trim(), values.password);
    if (result.ok) {
      setSession(result.value);
      navigate("/", { replace: true });
      return;
    }
    setStatus("error");
    setSubmitError(result.error);
  }

  const isLoading = status === "loading";

  return (
    <AuthLayout
      title="로그인"
      description="Decision Log에 로그인합니다."
      footer={
        <Text type="supporting" color="secondary">
          계정이 없으신가요? <Link to="/signup">회원가입</Link>
        </Text>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <VStack gap={3}>
          {sessionExpired && (
            <Banner status="warning" title="세션이 만료되었습니다. 다시 로그인해주세요." />
          )}
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
            value={values.password}
            onChange={(v) => update("password", v)}
            isDisabled={isLoading}
            status={
              fieldErrors.password ? { type: "error", message: fieldErrors.password } : undefined
            }
          />

          {submitError && submitError.isEmailNotConfirmed && (
            <Banner status="warning" title="이메일 인증을 완료해주세요.">
              <VStack gap={2}>
                <Text as="p" type="supporting">
                  가입 시 보낸 인증 메일의 링크를 클릭한 뒤 다시 로그인해주세요.
                </Text>
                <Button
                  label={
                    resend.cooldownLeft > 0
                      ? `재발송 (${resend.cooldownLeft}초 후 가능)`
                      : "인증 메일 재발송"
                  }
                  variant="secondary"
                  size="sm"
                  isLoading={resend.isSending}
                  isDisabled={resend.isDisabled}
                  onClick={() => void resend.resend(values.email.trim())}
                />
                {resend.message && (
                  <Text as="p" type="supporting" color="secondary">
                    {resend.message}
                  </Text>
                )}
              </VStack>
            </Banner>
          )}

          {submitError && !submitError.isEmailNotConfirmed && (
            <Banner status="error" title={submitError.message} />
          )}

          <Button type="submit" label="로그인" variant="primary" isLoading={isLoading} />
        </VStack>
      </form>
    </AuthLayout>
  );
}
