import { Link, useLocation } from "react-router";
import { Button } from "@astryxdesign/core/Button";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/Layout";
import { AuthLayout } from "./AuthLayout";
import { useResendCooldown } from "./useResendCooldown";

/** location.state에서 가입 이메일을 안전하게 읽는다. */
function readEmailFromState(state: unknown): string {
  if (state && typeof state === "object" && "email" in state) {
    const email = (state as { email: unknown }).email;
    if (typeof email === "string") return email;
  }
  return "";
}

/** 회원가입 후 인증 메일 안내 페이지 (SPEC-AUTH-001 3장). */
export function VerifyEmailPage() {
  const location = useLocation();
  const email = readEmailFromState(location.state);
  const resend = useResendCooldown();

  return (
    <AuthLayout
      title="인증 메일을 보냈습니다"
      footer={<Link to="/login">로그인으로 돌아가기</Link>}
    >
      <VStack gap={3}>
        <Text as="p">
          {email ? (
            <>
              <strong>{email}</strong> 주소로 인증 메일을 보냈습니다.
            </>
          ) : (
            <>가입하신 이메일 주소로 인증 메일을 보냈습니다.</>
          )}{" "}
          메일의 링크를 클릭하면 인증이 완료됩니다. 이후 로그인 화면에서 직접 로그인해주세요.
        </Text>

        <Button
          label={
            resend.cooldownLeft > 0
              ? `재발송 (${resend.cooldownLeft}초 후 가능)`
              : "인증 메일 재발송"
          }
          variant="secondary"
          isLoading={resend.isSending}
          isDisabled={resend.isDisabled || email === ""}
          onClick={() => void resend.resend(email)}
        />
        {resend.message && (
          <Text as="p" type="supporting" color="secondary">
            {resend.message}
          </Text>
        )}
      </VStack>
    </AuthLayout>
  );
}
