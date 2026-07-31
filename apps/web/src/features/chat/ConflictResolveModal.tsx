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
import type { AgendaStance } from "@decision-log/shared";
import type { Agenda, Provider } from "./types";
import { agendaRecheckText } from "./types";
import { providerMeta } from "./mockData";
import "./chat.css";

function providerLabel(provider: Provider): string {
  return providerMeta.find((meta) => meta.id === provider)?.label ?? provider;
}

/**
 * 인용의 출처 표기 — 어느 AI의 어느 섹션인가.
 * `sourceRefs`에서 같은 `sectionId`를 가진 stance를 찾아 provider를 붙인다.
 */
function citationSourceLabel(agenda: Agenda, sectionId: string): string {
  const owner = agenda.stances.find((stance) =>
    stance.sourceRefs.some((ref) => ref.sectionId === sectionId),
  );
  return owner ? `${providerLabel(owner.provider)} · ${sectionId}` : sectionId;
}

/** 모달 내부 화면: 입장 선택(main) / 직접 입력(compose) / 재검토 요청 입력(recheck-input) */
type ModalView = "main" | "compose" | "recheck-input";

interface ConflictResolveModalProps {
  agenda: Agenda;
  /** 배경 클릭·× 닫기 = 판단 보류 (상태 변화 없음, Step 6-1) */
  onClose: () => void;
  /**
   * 기존 AI 입장 채택 — **stance 전체**를 넘긴다(§12.4).
   * 서버는 `sourceRef`만 받고 내용은 원문에서 되읽으므로 텍스트만으로는 부족하다.
   */
  onAcceptStance: (stance: AgendaStance) => void;
  /** 재검토 실패 후 [다시 시도] (§10.6 — recheck_requested 유지 상태의 출구) */
  onRetryRecheck: () => void;
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
 * reanswered 이후에는 재검색 결과를 판단 재료로 보여주고 [선택한 입장 채택]/[내 결정]/
 * [내용 제외]를 제공한다 — 재검토 답변 자체를 답으로 채택하지 않는다(§10.1).
 */
export function ConflictResolveModal({
  agenda,
  onClose,
  onAcceptStance,
  onRetryRecheck,
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
  /**
   * 입장 카드 선택 가능 조건.
   *
   * **재검토 후에도 고를 수 있어야 한다**(§10.1). 재검토는 "판정을 뒤집는 장치"가 아니라
   * "사용자가 결정하도록 돕는 장치"이므로, 재검토 답변은 판단 재료이고 최종 답변에 들어가는
   * 것은 사용자가 고른 입장의 원문이다. `recheck_requested`(실패로 갇힌 상태)에서도
   * 빠져나갈 수 있어야 하므로 함께 허용한다(§10.6 결정 11).
   */
  const canSelectStance = view === "main";

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

  /**
   * E-4 — 재검토 결과 박스. **근거 유무가 눈에 보여야 한다.**
   *
   * `citations`는 0개여도 결과를 폐기하지 않는다(§10.1 — "왜 충돌이야?" 같은 질문은
   * 원문 인용이 필요 없다). 그래서 인용 없는 설명과 인용 3개짜리 설명이 화면에서 똑같이
   * 보이면 **근거 없는 것이 근거 있는 것처럼 읽힌다.** 인용 수를 항상 명시한다.
   * (§11-8 검증에서 폐기된 인용은 서버가 이미 걸러냈으므로 여기 오는 것은 전부 검증 통과분이다.)
   */
  const recheckResultBox = (() => {
    const citations = agenda.recheckResult?.citations ?? [];
    return (
      <div className="recheck-box">
        <Text type="label" display="block">
          🔎 Manager AI 재검색 결과
        </Text>
        <Text type="supporting" display="block">
          {agendaRecheckText(agenda)}
        </Text>
        {citations.length === 0 ? (
          <Text type="supporting" color="secondary" display="block">
            원문 인용 없음 — 아래 3열 원문을 직접 확인하세요
          </Text>
        ) : (
          <div className="recheck-citations">
            <Text type="supporting" color="secondary" display="block">
              원문 근거 {citations.length}건
            </Text>
            {citations.map((citation, index) => (
              <div className="recheck-citation" key={`${citation.sectionId}-${index}`}>
                <Text type="supporting" display="block">
                  “{citation.quote}”
                </Text>
                <Text type="supporting" color="secondary" display="block">
                  {citationSourceLabel(agenda, citation.sectionId)}
                </Text>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  })();

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
    /**
     * 재검토 진행 중 / 실패로 멈춘 상태(§10.6).
     *
     * ⚠️ 예전에는 `footer = null` 이라 **호출이 실패하면 스피너만 남고 빠져나갈 버튼이
     * 하나도 없었다.** 결정 11이 이 상태에서 네 가지 행동을 전부 허용하라고 한 이유다.
     * 서버는 실패 시 `recheck_requested`를 유지하므로(기회 미소진) 여기서 다시 시도하거나
     * 그냥 판단하고 나갈 수 있어야 한다.
     */
    body = (
      <>
        <Text type="supporting" color="secondary" display="block">
          재검색이 끝나지 않았습니다. 다시 시도하거나 지금 바로 판단할 수 있습니다.
        </Text>
        {stanceList}
        <div className="recheck-box recheck-box-loading">
          <Spinner size="sm" />
          <Text type="supporting">Manager AI가 재검색 중…</Text>
        </div>
      </>
    );
    footer = (
      <>
        <Button label="다시 시도" variant="primary" onClick={onRetryRecheck} />
        <Button
          label="선택한 입장 채택"
          isDisabled={selectedStanceIndex === null}
          onClick={() => {
            const stance =
              selectedStanceIndex === null
                ? undefined
                : agenda.stances[selectedStanceIndex];
            if (stance) onAcceptStance(stance);
          }}
        />
        <Button label="내 결정" onClick={() => setView("compose")} />
        <Button label="내용 제외" variant="destructive" onClick={onReject} />
      </>
    );
  } else if (isReanswered) {
    /**
     * 재검토 완료(§10.1). 재검토 버튼은 다시 표시하지 않는다(1회 제한, 고정 정책).
     *
     * ⚠️ **"이 결과로 결정" 버튼을 두지 않는다.** 재검토 답변은 판단 재료이지 그 자체가
     * 답이 아니다(§10.1). 그 버튼을 두면 사용자는 재검토 답변이 최종 답변에 들어간다고
     * 이해하는데 실제로 들어가는 것은 원문 섹션이라 **기대와 결과가 어긋난다.**
     * 대신 3열에서 입장을 고르게 하면, 고른 입장의 원문이 들어가는 것이 당연해진다.
     */
    body = (
      <>
        <Text type="supporting" color="secondary" display="block">
          재검색 결과를 참고해 채택할 입장을 고르거나 직접 입력하세요
        </Text>
        {stanceList}
        {recheckResultBox}
      </>
    );
    footer = (
      <>
        <Button
          label="선택한 입장 채택"
          variant="primary"
          isDisabled={selectedStanceIndex === null}
          onClick={() => {
            const stance =
              selectedStanceIndex === null
                ? undefined
                : agenda.stances[selectedStanceIndex];
            if (stance) onAcceptStance(stance);
          }}
        />
        <Button label="내 결정" onClick={() => setView("compose")} />
        <Button label="내용 제외" variant="destructive" onClick={onReject} />
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
            const stance =
              selectedStanceIndex === null
                ? undefined
                : agenda.stances[selectedStanceIndex];
            if (stance) onAcceptStance(stance);
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
