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
    const trimmed = recheckText.trim();
    if (trimmed.length === 0) {
      return; // 빈 값으로는 시작 불가 (Step 6-4)
    }
    onRecheck(trimmed);
    setView("main");
  }

  const stanceList = (
    <div className="stance-list">
      {agenda.stances.map((stance, index) => (
        <SelectableCard
          key={`${stance.provider}-${index}`}
          label={`${providerLabel(stance.provider)} 입장 선택`}
          isSelected={canSelectStance && selectedStanceIndex === index}
          isDisabled={!canSelectStance}
          onChange={(isSelected) =>
            setSelectedStanceIndex(isSelected ? index : null)
          }
          padding={2}
        >
          <div className="stance-card-body">
            <span className="stance-card-model">
              <span
                className="model-dot"
                style={{ background: `var(--model-${stance.provider})` }}
              />
              <Text type="label">{providerLabel(stance.provider)}</Text>
            </span>
            <Text type="supporting" display="block">
              {stance.text}
            </Text>
          </div>
        </SelectableCard>
      ))}
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
    // 재검토 요청 내용 입력 (Step 6-4)
    body = (
      <>
        {stanceList}
        <div className="resolve-compose">
          <TextInput
            label="재검토 요청 내용"
            isLabelHidden
            value={recheckText}
            onChange={setRecheckText}
            placeholder="재검토 요청 내용을 입력하세요"
            hasAutoFocus
          />
        </div>
      </>
    );
    footer = (
      <>
        <Button
          label="재검토 시작"
          variant="primary"
          isDisabled={recheckText.trim().length === 0}
          onClick={handleRecheckStart}
        />
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
    <Dialog isOpen onOpenChange={handleOpenChange} width={560}>
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
        footer={footer && <LayoutFooter hasDivider>{footer}</LayoutFooter>}
      />
    </Dialog>
  );
}
