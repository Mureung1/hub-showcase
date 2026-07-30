import { landingEvidenceExamples } from "../../data/figmaLandingContent";
import { ScrollReveal } from "../ScrollReveal";

const evidenceTypeClass: Record<string, string> = {
  PR: "bg-ptop-landing-ink text-ptop-landing-lime",
  COMMIT: "bg-ptop-landing-ink text-ptop-landing-lime",
  FILE: "bg-ptop-landing-ink text-ptop-landing-lime",
  ISSUE: "bg-ptop-landing-ink text-ptop-landing-lime",
};

export function LandingEvidenceSection() {
  return (
    <section
      className="scroll-mt-[var(--header-height)] bg-white"
      id="analysis-example"
      aria-labelledby="landing-evidence-title"
    >
      <div className="ptop-landing-container py-[84px]">
        <ScrollReveal className="mx-auto grid max-w-[760px] justify-items-center gap-4 text-center">
          <p className="m-0 font-mono text-xs font-bold uppercase tracking-[0.16em] text-ptop-landing-green">
            Evidence-backed draft
          </p>
          <h2
            className="m-0 text-[clamp(2rem,4vw,3.2rem)] font-extrabold leading-[1.18] tracking-[-0.05em] text-ptop-landing-ink"
            id="landing-evidence-title"
          >
            AI가 정리한 문장과,
            <br />
            프로젝트에 있던 사실을 구분합니다
          </h2>
          <p className="m-0 text-base leading-[1.75] text-ptop-muted [word-break:keep-all]">
            충분한 근거들을 제시하며 포트폴리오를 제공합니다
          </p>
          <div
            className="mt-1 flex flex-wrap justify-center gap-4 text-xs font-semibold text-ptop-muted"
            aria-label="화면 구분 안내"
          >
            <span className="inline-flex items-center gap-2">
              <i
                className="h-3 w-3 rounded bg-[#e4f7ec] ring-1 ring-[#8fd9b4]"
                aria-hidden="true"
              />
              AI가 정리한 서술
            </span>
            <span className="inline-flex items-center gap-2">
              <i
                className="h-3 w-3 rounded bg-white ring-1 ring-ptop-landing-ink/25"
                aria-hidden="true"
              />
              저장소 근거
            </span>
          </div>
        </ScrollReveal>

        <ScrollReveal
          className="mx-auto mt-12 max-w-[1120px] overflow-hidden rounded-[22px] border border-ptop-landing-ink/10 bg-white shadow-[0_16px_44px_rgb(20_35_28/9%)]"
          delay={100}
        >
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ptop-landing-ink/10 px-6 py-5 md:px-8">
            <div className="flex items-center gap-3">
              <span className="rounded-md bg-ptop-landing-ink px-3 py-1.5 font-mono text-[10px] font-bold text-ptop-landing-lime">
                선택한 기술적 도전
              </span>
              <h3 className="m-0 text-lg font-extrabold tracking-[-0.03em] text-ptop-landing-ink">
                OAuth 토큰 만료로 반복 실패하던 저장소 분석을 재시도 큐로 안정화
              </h3>
            </div>
            <span className="rounded-full bg-[#e4f7ec] px-3 py-1.5 font-mono text-xs font-bold text-[#0f7a4e]">
              신뢰도 0.86
            </span>
          </div>

          <div className="grid md:grid-cols-[1.12fr_1fr]">
            <div className="bg-[#f3fbf6] p-6 md:p-8">
              <p className="m-0 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#0f7a4e]">
                AI가 정리한 서술 · 예시
              </p>
              <div className="mt-5 grid gap-5">
                <EvidenceParagraph title="Background">
                  사용자가 늘며 큰 저장소에서 API 호출이 60초를 넘기기 시작했고,
                  토큰 갱신 시점과 겹치면 분석 전체가 실패했습니다.
                </EvidenceParagraph>
                <EvidenceParagraph title="Problem">
                  단순 재시도는 rate limit에 걸리고, 사용자는 처음부터 다시
                  시작해야 했습니다.
                </EvidenceParagraph>
                <EvidenceParagraph title="Solution · 기술적 판단">
                  지수 백오프 재시도 큐를 두고 401은 토큰 갱신 후 1회만, 403은
                  x-ratelimit-reset까지 대기하도록 분기했습니다. 단계별 결과를
                  캐시해 재시작 지점을 유지했습니다.
                </EvidenceParagraph>
                <div className="rounded-[14px] border-[1.5px] border-dashed border-[#8fd9b4] bg-white p-4">
                  <p className="m-0 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#0f7a4e]">
                    사용자 회고 · 예시
                  </p>
                  <p className="mb-0 mt-2 text-sm leading-[1.75] text-ptop-landing-ink">
                    “분석이 자꾸 끊기는 게 제일 답답했어요. 재시도만 붙이면 될
                    줄 알았는데 rate limit 때문에 오히려 더 느려졌습니다.”
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8">
              <div className="mb-5 flex items-center justify-between gap-4">
                <p className="m-0 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ptop-landing-ink/50">
                  저장소 근거 4건
                </p>
                <span className="rounded-full bg-ptop-landing-ink/5 px-3 py-1.5 text-[11px] font-semibold text-ptop-muted">
                  내 작업이 아니에요
                </span>
              </div>
              <div className="grid gap-2.5">
                {landingEvidenceExamples.map((evidence) => (
                  <div
                    className="rounded-[14px] border border-ptop-landing-ink/10 p-3.5"
                    key={`${evidence.type}-${evidence.reference}`}
                  >
                    <div className="mb-1.5 flex items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-1 font-mono text-[9px] font-bold ${evidenceTypeClass[evidence.type]}`}
                      >
                        {evidence.type}
                      </span>
                      <span className="font-mono text-[11px] font-bold text-[#16a46a]">
                        {evidence.reference}
                      </span>
                    </div>
                    <p className="m-0 text-sm font-bold leading-[1.45] text-ptop-landing-ink">
                      {evidence.title}
                    </p>
                    <p className="mb-0 mt-1.5 font-mono text-[10px] leading-[1.5] text-ptop-muted">
                      {evidence.metadata}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-ptop-landing-ink/10 bg-[#fafbfa] px-6 py-4 md:px-8">
            <span
              className="grid h-9 w-9 place-items-center rounded-full bg-ptop-landing-lime font-bold text-ptop-landing-ink"
              aria-hidden="true"
            >
              ✦
            </span>
            <p className="m-0 flex-1 text-sm leading-[1.6] text-ptop-muted">
              이 내용이 그대로 포트폴리오 초안 한 편이 됩니다 — 문단별로 고칠 수
              있고 PDF로 저장됩니다.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

function EvidenceParagraph({
  title,
  children,
}: {
  title: string;
  children: string;
}) {
  return (
    <div>
      <h4 className="m-0 mb-2 text-sm font-extrabold text-ptop-landing-ink">
        {title}
      </h4>
      <p className="m-0 text-sm leading-[1.8] text-ptop-muted [word-break:keep-all]">
        {children}
      </p>
    </div>
  );
}
