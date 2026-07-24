import type { Memo } from '@shared/schemas';
import type { CompletionPhases } from '../../types/completion';

type MemoCardProps = {
  memos: Memo[];
  completionPhases: CompletionPhases;
  onToggle: (memoId: string, completed: boolean) => void;
};

export default function MemoCard({ memos, completionPhases, onToggle }: MemoCardProps) {
  if (memos.length === 0) return null;

  return (
    <section className="card">
      <h2 className="card__title">메모</h2>
      {memos.map((m) => {
        const phase = completionPhases[m.id];
        const isDone = phase === 'done' || phase === 'fading';
        return (
          <div
            key={m.id}
            className={phase === 'fading' ? 'check-item check-item--fading' : 'check-item'}
          >
            <input
              type="checkbox"
              className="check-item__checkbox"
              checked={isDone}
              disabled={isDone}
              onChange={() => onToggle(m.id, true)}
              aria-label={`${m.content} 완료`}
            />
            <span
              className={isDone ? 'check-item__title check-item__title--done' : 'check-item__title'}
            >
              {m.content}
            </span>
          </div>
        );
      })}
    </section>
  );
}
