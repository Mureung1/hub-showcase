import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Text } from "@astryxdesign/core/Text";
import "./decision-log.css";

/**
 * Right 패널: Decision Notes 누적 영역.
 * T-001에서는 빈 상태만 표시하고, MD Zip 다운로드 버튼은 항상 비활성으로 노출한다
 * (Step 1-5 — 이번 Spec에서 동작 없음).
 */
export function DecisionNotesPanel() {
  return (
    <div className="notes-panel">
      <div className="notes-panel-head">
        <Text type="label" color="secondary">
          Decision Notes
        </Text>
      </div>
      <div className="notes-panel-body">
        <EmptyState
          title="아직 저장된 노트가 없습니다"
          description="충돌을 모두 해결하면 최종 노트가 여기에 쌓입니다."
        />
      </div>
      <div className="notes-panel-footer">
        <Button label="MD Zip 다운로드" variant="primary" isDisabled />
      </div>
    </div>
  );
}
