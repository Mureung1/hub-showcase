import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FitMeter } from "@/components/ui/FitMeter";
import { RequirementRow } from "@/components/positions/RequirementRow";
import { AdviceList } from "@/components/positions/AdviceList";
import { calcFitScore, fitLabel, fitTone } from "@/lib/fit";
import { getPosition } from "@/lib/mock";

/** F5 — 포지션 상세 + 방향 제시 (디자인.md 6.4) */
export default async function PositionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const position = await getPosition(id);
  if (!position) notFound();

  const total = calcFitScore(position.requirements);
  const tone = fitTone(position.fitScore);
  const required = position.requirements.filter((r) => r.required);
  const preferred = position.requirements.filter((r) => !r.required);
  const met = (rs: typeof required) => rs.filter((r) => r.fulfillment >= 1).length;

  return (
    <AppShell back={{ href: "/positions", label: "포지션 목록" }}>
      <div className="mb-6 flex items-center gap-3.5">
        <span className="grid h-13 w-13 place-items-center rounded-xl bg-primary-soft font-bold text-primary">
          {position.company.slice(0, 2)}
        </span>
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-strong">{position.title}</h1>
          <p className="mt-1 text-muted">
            {position.company} · {position.location} · 경력 {position.experience} · 수집일{" "}
            {position.collectedAt}
          </p>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-5">
          <Card>
            <div className="mb-3.5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-strong">요구조건별 충족도</h2>
              <span className="text-xs text-muted">가중치 × 충족도 = 기여 점수</span>
            </div>
            {position.requirements.map((r) => (
              <RequirementRow key={r.name} req={r} />
            ))}
            <div className="mt-4 flex justify-between border-t-2 border-line pt-4 font-bold text-strong">
              <span>합계</span>
              <span>
                {(total / 100).toFixed(2)} / 1.00
              </span>
            </div>
          </Card>

          <Card>
            <h2 className="mb-1.5 text-lg font-semibold text-strong">내 이력으로 맞추는 방향</h2>
            <p className="mb-4 text-[13px] text-muted">
              지금 가진 이력만으로 이 공고에 어떻게 쓸지 정리했습니다.
            </p>
            <AdviceList items={position.advice} />
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="px-5 py-7 text-center">
            <span className="text-xs text-muted">적합도</span>
            <span
              className="mt-1 block text-[40px] font-bold tracking-tight"
              style={{ color: `var(--color-${tone})` }}
            >
              {position.fitScore}%
            </span>
            <Badge tone={tone}>{fitLabel(position.fitScore)}</Badge>
            <FitMeter score={position.fitScore} className="my-4" />
            <p className="text-xs text-muted">전체 포지션 중 상위권</p>
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 font-semibold text-strong">공고 요약</h3>
            <dl className="text-[13px]">
              <Row label="직무" value={position.title} />
              <Row label="경력" value={position.experience} />
              <Row
                label="필수 조건"
                value={`${required.length}개 중 ${met(required)}개 충족`}
              />
              <Row
                label="우대 조건"
                value={`${preferred.length}개 중 ${met(preferred)}개 충족`}
              />
            </dl>
          </Card>

          <Link href={`/documents/${position.id}`}>
            <Button block>이 포지션에 맞춰 문서 만들기</Button>
          </Link>
          <Link href={`/apply?position=${position.id}`}>
            <Button variant="secondary" block>
              원본 공고 보기
            </Button>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-dashed border-line py-2.5 last:border-0">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right text-strong">{value}</dd>
    </div>
  );
}
