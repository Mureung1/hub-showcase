import { useRef, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import {
  Layout,
  LayoutContent,
  LayoutFooter,
} from "@astryxdesign/core/Layout";
import { SelectableCard } from "@astryxdesign/core/SelectableCard";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import type { Agenda, Provider } from "./types";
import { providerMeta } from "./mockData";
import "./chat.css";

function providerLabel(provider: string): string {
  return (
    providerMeta.find((meta) => meta.id === (provider as Provider))?.label ??
    provider
  );
}

/** 모달 내부 화면: 입장 선택(main) / 직접 입력(compose) / 재검토 요청 입력(recheck-input) */
type ModalView = "main" | "compose" | "recheck-input";

interface ConflictResolveModalProps {
  agenda: Agenda;
  /** 배경 클릭·× 닫기 = 판단 보류 (상태 변화 없음, Step 6-1) */
  onClose: () => void;
  /** 기존 AI 내용 채택 — selectedContent = 선택한 입장 텍스트 */
  onAcceptStance: (stanceText: string) => void;
  /** 재검토 결과로 결정 — selectedContent = recheckResult */
  onAcceptRecheck: () => void;
  /** 직접 입력 채택 */
  onCompose: (text: string) => void;
  /** 내용 제외 */
  onReject: () => void;
  /** 재검토 시작 (Agenda당 1회) */
  onRecheck: (request: string) => void;
}

/**
 * 충돌 해소 팝업 (Step 6 확정).
 * 4종 액션: 기존 AI 내용 채택(카드 선택→[채택]) / 직접 입력 / 제외 / 재검토 1회.
 * reanswered 이후에는 [이 결과로 결정]/[내용 제외]/[내 결정]만 표시한다.
 */
export function ConflictResolveModal({
  agenda,
  onClose,
  onAcceptStance,
  onAcceptRecheck,
  onCompose,
  onReject,
  onRecheck,
}: ConflictResolveModalProps) {
  const [view, setView] = useState<ModalView>("main");
  const [selectedStanceIndex, setSelectedStanceIndex] = useState<number | null>(
    null,
  );
  const [composeText, setComposeText] = useState("");
  const [recheckText, setRecheckText] = useState("");
  const composeRef = useRef<HTMLTextAreaElement>(null);

  const isRechecking = agenda.status === "recheck_requested";
  const isReanswered = agenda.status === "reanswered";
  // 입장 카드 선택은 재검토 전(conflicted)에만 가능하다
  const canSelectStance = agenda.status === "conflicted" && view === "main";

  function handleOpenChange(open: boolean) {
    if (!open) {
      onClose();
    }
  }

  function handleComposeSubmit() {
    const trimmed = composeText.trim();
    if (trimmed.length === 0) {
      // 빈 값 반영 불가 — 포커스 유지 (Step 6-3)
      composeRef.current?.focus();
      return;
    }
    onCompose(trimmed);
  }

  function handleRecheckStart() {
    // R1 개정: 추가 의견은 선택 입력 — 빈 값으로도 재검토를 시작할 수 있다 (Step 6 R1-3)
    onRecheck(recheckText.trim());
    setView("main");
  }

  // R2: 입장 카드 가로 3열 — 모델 헤더 + 본문, 내용이 길면 열 내부 세로 스크롤 (Step 6 R2-2).
  // R2-4·R3: 재검토 중·후에는 선택 불가 — 흐리게 처리하지 않고(텍스트 명확 유지),
  // 선택 가능한 뷰(conflicted + main)에서만 SelectableCard로 렌더한다.
  // 선택 불가 뷰는 정적 div로 렌더해 포인터 커서도 남지 않게 한다 (R2 잔여 cursor 정리).
  const stanceList = (
    <div className="stance-grid">
      {agenda.stances.map((stance, index) => {
        const inner = (
          <div className="stance-column">
            <span className="stance-card-model">
              <span
                className="model-dot"
                style={{ background: `var(--model-${stance.provider})` }}
              />
              <Text type="label">{providerLabel(stance.provider)}</Text>
            </span>
            {/* R2: 판단 근거 본문은 기본 텍스트 색으로 명확하게 (Step 6 R2-3) */}
            <Text type="supporting" display="block" className="stance-card-text">
              {stance.text}
            </Text>
          </div>
        );
        if (!canSelectStance) {
          return (
            <div className="stance-card-static" key={`${stance.provider}-${index}`}>
              {inner}
            </div>
          );
        }
        return (
          <SelectableCard
            key={`${stance.provider}-${index}`}
            label={`${providerLabel(stance.provider)} 입장 선택`}
            isSelected={selectedStanceIndex === index}
            onChange={(isSelected) =>
              setSelectedStanceIndex(isSelected ? index : null)
            }
            padding={2}
          >
            {inner}
          </SelectableCard>
        );
      })}
    </div>
  );

  let body: React.ReactNode;
  let footer: React.ReactNode;

  if (view === "compose") {
    // 직접 입력 (Step 6-3)
    body = (
      <>
        {stanceList}
        <div className="resolve-compose">
          <TextArea
            ref={composeRef}
            label="내 결정"
            isLabelHidden
            value={composeText}
            onChange={setComposeText}
            placeholder="이 충돌에 대한 나의 결정을 입력하세요"
            rows={3}
            hasAutoFocus
          />
        </div>
      </>
    );
    footer = (
      <>
        <Button label="결정 반영" variant="primary" onClick={handleComposeSubmit} />
        <Button label="뒤로" onClick={() => setView("main")} />
      </>
    );
  } else if (view === "recheck-input") {
    // 재검토 추가 의견 입력 — 선택 사항, 빈 값 시작 가능 (Step 6 R1-3)
    body = (
      <>
        {stanceList}
        <div className="resolve-compose">
          <TextInput
            label="재검토 추가 의견 (선택)"
            isLabelHidden
            value={recheckText}
            onChange={setRecheckText}
            placeholder="추가 의견이 있으면 입력하세요 (선택)"
            hasAutoFocus
          />
        </div>
      </>
    );
    footer = (
      <>
        <Button label="재검토 시작" variant="primary" onClick={handleRecheckStart} />
        <Button label="뒤로" onClick={() => setView("main")} />
      </>
    );
  } else if (isRechecking) {
    // 재검토 로딩 (Step 6-5)
    body = (
      <>
        {stanceList}
        <div className="recheck-box recheck-box-loading">
          <Spinner size="sm" />
          <Text type="supporting">Manager AI가 재검색 중…</Text>
        </div>
      </>
    );
    footer = null;
  } else if (isReanswered) {
    // 재검토 결과 (Step 6-5) — 재검토 버튼은 다시 표시하지 않는다 (고정 정책)
    body = (
      <>
        {stanceList}
        <div className="recheck-box">
          <Text type="label" display="block">
            🔎 Manager AI 재검색 결과
          </Text>
          <Text type="supporting" display="block">
            {agenda.recheckResult}
          </Text>
        </div>
      </>
    );
    footer = (
      <>
        <Button
          label="이 결과로 결정"
          variant="primary"
          onClick={onAcceptRecheck}
        />
        <Button label="내용 제외" variant="destructive" onClick={onReject} />
        <Button label="내 결정" onClick={() => setView("compose")} />
      </>
    );
  } else {
    // 기본(main, conflicted): 입장 카드 선택 → [채택] (Step 6-2)
    body = (
      <>
        <Text type="supporting" color="secondary" display="block">
          하나를 선택하거나 직접 채택할 답변을 입력하세요
        </Text>
        {stanceList}
      </>
    );
    footer = (
      <>
        <Button
          label="채택"
          variant="primary"
          isDisabled={selectedStanceIndex === null}
          onClick={() => {
            if (selectedStanceIndex !== null) {
              onAcceptStance(agenda.stances[selectedStanceIndex].text);
            }
          }}
        />
        <Button label="내용 제외" variant="destructive" onClick={onReject} />
        <Button label="재검토" onClick={() => setView("recheck-input")} />
        <Button label="내 결정" onClick={() => setView("compose")} />
      </>
    );
  }

  return (
    // R2: 가로 3열 배치에 맞춰 폭 확대 + 높이 2배 수준 (내용 부족 시 min-height 기준, Step 6 R2-1·2)
    <Dialog isOpen onOpenChange={handleOpenChange} width={1180} maxHeight="90vh">
      <Layout
        header={
          <DialogHeader
            title={`충돌 · ${agenda.title}`}
            onOpenChange={handleOpenChange}
          />
        }
        content={
          <LayoutContent>
            <div className="resolve-modal-body">{body}</div>
          </LayoutContent>
        }
        footer={
          footer && (
            <LayoutFooter hasDivider>
              {/* R1: 하단 액션 버튼 사이 간격 확보 (Step 6 R1-2) */}
              <div className="resolve-footer-actions">{footer}</div>
            </LayoutFooter>
          )
        }
      />
    </Dialog>
  );
}
