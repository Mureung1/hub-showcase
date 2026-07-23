import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getPosition } from "@/lib/mock";

/** F7 — 외부 지원 연결 (디자인.md 6.5) */
export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ position?: string }>;
}) {
  const { position: id } = await searchParams;
  const position = id ? await getPosition(id) : undefined;  const company = position?.company ?? "채용";

  return (
    <AppShell
      back={{
        href: id ? `/documents/${id}` : "/positions",
        label: "문서로 돌아가기",
      }}
    >
      <Card className="mx-auto my-10 max-w-[520px] px-6 py-14 text-center">
        <div className="mx-auto mb-4.5 grid h-15 w-15 place-items-center rounded-[18px] bg-primary-soft text-[26px] text-primary">
          ↗
        </div>
        <h1 className="mb-2 text-[22px] font-bold text-strong">
          {company} 채용 페이지로 이동합니다
        </h1>
        <p className="mb-6 text-muted">
          지원서 제출은 회사 채용 사이트에서 진행됩니다.
          <br />
          생성한 문서는 클립보드에 복사해 두었습니다.
        </p>
        <div className="flex justify-center gap-2">
          <Link href={id ? `/documents/${id}` : "/positions"}>
            <Button variant="secondary">취소</Button>
          </Link>
          <a href={position?.sourceUrl ?? "#"} target="_blank" rel="noreferrer noopener">
            <Button>{company} 채용 페이지 열기</Button>
          </a>
        </div>
        <p className="mt-5 text-xs text-muted">
          MVP에서는 지원 완료 여부를 추적하지 않습니다.
        </p>
      </Card>
    </AppShell>
  );
}
