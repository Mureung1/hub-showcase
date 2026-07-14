import { AppShell, PageHead } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { PositionCard } from "@/components/positions/PositionCard";
import { PositionFilters } from "@/components/positions/PositionFilters";
import { EmptyState } from "@/components/ui/EmptyState";
import { listPositions } from "@/lib/mock";

/** F4 — 포지션 목록 (적합도순 정렬). 서버 컴포넌트. */
export default function PositionsPage() {
  const positions = listPositions();

  return (
    <AppShell>
      <PageHead
        title="내 이력에 맞는 포지션"
        description={`이력 기준으로 적합도를 계산해 높은 순으로 정렬했습니다 · ${positions.length}개`}
        action={<Button variant="secondary">적합도순 ▾</Button>}
      />

      <PositionFilters />

      {positions.length === 0 ? (
        <EmptyState
          title="아직 추천할 포지션이 없습니다"
          description="이력을 먼저 입력하면 적합도를 계산해 드립니다."
          actionLabel="이력 입력하기"
        />
      ) : (
        <div className="flex flex-col gap-3">
          {positions.map((p, i) => (
            <PositionCard key={p.id} position={p} rank={i + 1} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
