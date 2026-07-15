import { AppShell, PageHead } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";

/** 저장한 공고 — 자리표시. 북마크 기능은 이후에 붙인다. */
export default function SavedPage() {
  return (
    <AppShell>
      <PageHead title="저장한 공고" description="관심 있는 포지션을 저장해 두고 나중에 다시 볼 수 있습니다." />
      <EmptyState
        title="아직 저장한 공고가 없어요"
        description="포지션 카드에서 북마크를 눌러 저장하세요."
        actionLabel="포지션 보러 가기"
      />
    </AppShell>
  );
}
