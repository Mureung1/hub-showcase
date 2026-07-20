import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import type { SourceAnswer } from "./types";
import { providerMeta } from "./mockData";
import "./chat.css";

/** 성공한 열: Section 구분 라벨 없이 전문(full text)처럼 이어붙인다 (Step 4-3).
 * 내부 데이터는 sectionId를 가진 Section 배열을 유지한다 (0.6 고정 계약). */
function AnswerColumnBody({ answer }: { answer: SourceAnswer }) {
  // 제외된 Provider 열: 실패 안내 문구 + 에러 코드 (Step 4-4).
  // 실패 시나리오 타임라인은 T-009에서 활성화된다 — 여기서는 렌더 분기만 둔다.
  if (answer.excludedFromComparison || answer.status === "failed") {
    const label =
      providerMeta.find((p) => p.id === answer.provider)?.label ??
      answer.provider;
    return (
      <div className="answer-column-excluded">
        <Text as="p" color="secondary">
          {label} 답변을 불러오지 못해 비교에서 제외했습니다.
        </Text>
        {answer.errorCode && (
          <Text type="code" color="secondary" as="p">
            {answer.errorCode}
          </Text>
        )}
      </div>
    );
  }

  return (
    <>
      {(answer.structuredContent?.sections ?? []).map((section) => (
        <Text key={section.sectionId} as="p">
          {section.content}
        </Text>
      ))}
    </>
  );
}

interface AnswersModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  sourceAnswers: SourceAnswer[];
}

/**
 * "AI 별 답변 보기" 대형 모달 (Step 4-1 확정).
 * 화면의 90% 이상 크기로 Claude·ChatGPT·Gemini 3열을 한 번에 표시하고,
 * 각 열은 독립적으로 세로 스크롤된다. 배경 클릭과 ×로 닫는다.
 */
export function AnswersModal({
  isOpen,
  onOpenChange,
  sourceAnswers,
}: AnswersModalProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      width="94vw"
      maxHeight="94vh"
    >
      <Layout
        header={<DialogHeader title="AI 답변 전문" onOpenChange={onOpenChange} />}
        content={
          <LayoutContent isScrollable={false}>
            <div className="answers-grid">
              {providerMeta.map(({ id, label }) => {
                const answer = sourceAnswers.find((a) => a.provider === id);
                if (!answer) {
                  return null;
                }
                return (
                  <section className="answer-column" key={id}>
                    <header className="answer-column-head">
                      <span
                        className="model-dot"
                        style={{ background: `var(--model-${id})` }}
                      />
                      <Text type="label">{label}</Text>
                    </header>
                    <div className="answer-column-scroll">
                      <AnswerColumnBody answer={answer} />
                    </div>
                  </section>
                );
              })}
            </div>
          </LayoutContent>
        }
      />
    </Dialog>
  );
}
