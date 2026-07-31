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

/**
 * 데모용 테스트 계정 (T-018, 프론트 전용).
 * 심사·시연에서 계정을 새로 만들지 않고 바로 들어올 수 있게 로그인 화면에 노출한다.
 * 하나라도 자리표시자(REPLACE_ME)면 안내 박스를 숨긴다.
 * 인증 자체는 우회하지 않으며, 값을 폼에 채워 기존 로그인 흐름으로 제출할 뿐이다.
 */
// [의도된 결정] 데모/심사 편의를 위한 자동 입력 계정이다.
//   - 이 값은 빌드 번들에 그대로 포함되며, 숨길 방법이 없다(VITE_ 환경변수로 빼도 동일).
//     git 히스토리에도 남는다 — 어느 쪽이든 비밀이 아니다.
//   - 따라서 이 계정은 **데모 전용 폐기 계정**이어야 하고, 민감 데이터를 두지 않는다.
//   - 실서비스 전환 시 제거 대상.
//   근거: docs/handoff/09-LIMITS-AND-BACKLOG.md §1.1
// `: string`을 지우지 말 것 — 없으면 리터럴 타입으로 좁혀져, 아래 자리표시자 비교가
// "교집합 없는 비교"(TS2367)로 실패한다. 값을 실제 계정으로 바꾸는 순간 빌드가 깨진다.
const TEST_EMAIL: string = "lymsla0117@gmail.com";
const TEST_PASSWORD: string = "TestPass-zqnpMYKc!27";

const TEST_ACCOUNT_PLACEHOLDER = "REPLACE_ME";
const hasTestAccount =
  TEST_EMAIL !== TEST_ACCOUNT_PLACEHOLDER &&
  TEST_PASSWORD !== TEST_ACCOUNT_PLACEHOLDER;

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

  /** 검증 → signIn → 세션 반영. 폼 제출과 테스트 계정 버튼이 같은 흐름을 쓴다. */
  async function submitCredentials(credentials: LoginFormValues) {
    const errors = validateLogin(credentials);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setStatus("loading");
    setSubmitError(null);
    const result = await signIn(credentials.email.trim(), credentials.password);
    if (result.ok) {
      setSession(result.value);
      navigate("/", { replace: true });
      return;
    }
    setStatus("error");
    setSubmitError(result.error);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await submitCredentials(values);
  }

  /** 테스트 계정으로 로그인 — 입력 필드를 채워 보여주고 같은 제출 흐름을 탄다. */
  async function handleTestAccountLogin() {
    const credentials: LoginFormValues = {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    };
    setValues(credentials);
    await submitCredentials(credentials);
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

          {/* 데모에서 바로 눈에 띄어야 하므로 접힘 없이 펼친 상태로 시작한다. */}
          {hasTestAccount && (
            <Banner status="info" title="테스트 계정" defaultIsExpanded>
              <VStack gap={2}>
                <Text as="p" type="supporting" color="secondary">
                  둘러보기용 계정입니다. 아래 버튼을 누르면 바로 로그인합니다.
                </Text>
                {/* 데모 목적이라 비밀번호를 가리지 않고 그대로 보여준다. */}
                <Text as="p" type="supporting">
                  이메일 {TEST_EMAIL}
                </Text>
                <Text as="p" type="supporting">
                  비밀번호 {TEST_PASSWORD}
                </Text>
                <Button
                  label="이 계정으로 로그인"
                  variant="secondary"
                  size="sm"
                  isLoading={isLoading}
                  isDisabled={isLoading}
                  onClick={() => void handleTestAccountLogin()}
                />
              </VStack>
            </Banner>
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
