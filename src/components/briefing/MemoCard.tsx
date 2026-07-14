import type { Memo } from '@shared/schemas';

type MemoCardProps = {
  memos: Memo[];
};

export default function MemoCard({ memos }: MemoCardProps) {
  if (memos.length === 0) return null;

  return (
    <section className="card">
      <h2 className="card__title">메모</h2>
      {memos.map((m) => (
        <p key={m.id} className="memo-content">
          {m.content}
        </p>
      ))}
    </section>
  );
}
