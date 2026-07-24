import type { ItemType } from '@shared/schemas';
import type { CompletedData } from '../../types/overlay';

type CompletedViewProps = {
  data: CompletedData;
  onRestore: (type: ItemType, id: string) => void;
  onPermanentDelete: (type: ItemType, id: string) => void;
};

export default function CompletedView({ data, onRestore, onPermanentDelete }: CompletedViewProps) {
  return (
    <div className="completed-view">
      <div className="completed-view__header">
        <h2 className="completed-view__title">Completed</h2>
      </div>

      <section className="completed-view__section">
        <h3 className="completed-view__section-title">
          완료된 과제 <span className="completed-view__count">{data.tasks.length}건</span>
        </h3>
        {data.tasks.length === 0 ? (
          <p className="completed-view__empty">완료된 과제가 없어요</p>
        ) : (
          data.tasks.map((task) => (
            <div key={task.id} className="completed-item">
              <span className="completed-item__title">{task.title}</span>
              <div className="completed-item__actions">
                <button
                  className="completed-item__btn completed-item__btn--restore"
                  onClick={() => onRestore('tasks', task.id)}
                >
                  복구
                </button>
                <button
                  className="completed-item__btn completed-item__btn--delete"
                  onClick={() => onPermanentDelete('tasks', task.id)}
                >
                  영구 삭제
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="completed-view__section">
        <h3 className="completed-view__section-title">
          완료된 메모 <span className="completed-view__count">{data.memos.length}건</span>
        </h3>
        {data.memos.length === 0 ? (
          <p className="completed-view__empty">완료된 메모가 없어요</p>
        ) : (
          data.memos.map((memo) => (
            <div key={memo.id} className="completed-item">
              <span className="completed-item__title">{memo.content}</span>
              <div className="completed-item__actions">
                <button
                  className="completed-item__btn completed-item__btn--restore"
                  onClick={() => onRestore('memos', memo.id)}
                >
                  복구
                </button>
                <button
                  className="completed-item__btn completed-item__btn--delete"
                  onClick={() => onPermanentDelete('memos', memo.id)}
                >
                  영구 삭제
                </button>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
