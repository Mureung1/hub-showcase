import { notFound } from "next/navigation";
import { AppShell, PageHead } from "@/components/layout/AppShell";
import { DocEditor } from "@/components/documents/DocEditor";
import { getDocs, getPosition } from "@/lib/mock";

/** F6 — AI 문서 생성 (디자인.md 6.5) */
export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const position = await getPosition(id);
    if (!position) notFound();

    const docs = getDocs(id);

    return (
        <AppShell back={{ href: `/positions/${id}`, label: "포지션 상세" }}>
            <PageHead
                title="AI 문서"
                description={`${position.company} · ${position.title}에 맞춰 생성했습니다. 그대로 고쳐 쓸 수 있습니다.`}
            />
            <DocEditor docs={docs} positionId={id} />
        </AppShell>
    );
}