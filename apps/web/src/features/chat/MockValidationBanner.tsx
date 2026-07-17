import { Text } from "@astryxdesign/core/Text";
import type { MockValidationError } from "./mockValidation";
import "./chat.css";

/**
 * Mock 계약 검증 실패 배너 (AC6, 결정 3-3).
 * 기존 error 상태 UI(.excluded-banner)를 재사용하고, 디버깅을 위해 errorCode 원문과
 * 검증 실패 메시지를 그대로 표시한다. 정상(검증 통과) 시에는 렌더링하지 않는다.
 */
export function MockValidationBanner({
  error,
}: {
  error: MockValidationError;
}) {
  return (
    <div className="excluded-banner mock-validation-banner" role="alert">
      <Text type="label" as="p" display="block">
        Mock 데이터 계약 검증에 실패했습니다.
      </Text>
      <Text type="code" color="secondary" as="p" display="block">
        {error.errorCode}
      </Text>
      <Text type="supporting" color="secondary" as="p" display="block">
        {error.message}
      </Text>
    </div>
  );
}
