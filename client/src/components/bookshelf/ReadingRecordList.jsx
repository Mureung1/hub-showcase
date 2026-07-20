import { formatRecordDate } from '@/lib/reading';
import { Button } from '@/components/ui/button';

export function ReadingRecordList({ records, latestRecord, onEditRecord, onDeleteRecord }) {
  return (
    <section className="record-list" aria-labelledby="record-list-title">
      <p className="section-kicker">RECORDS</p>
      <h2 id="record-list-title">{records.length ? '읽은 자리가 한 장씩 쌓이고 있어요.' : '아직 남긴 기록이 없어요.'}</h2>
      {records.length ? (
        <ol>
          {records.map((record) => (
            <li key={record.id} className="record-page">
              <time dateTime={record.createdAt}>{formatRecordDate(record.createdAt)}</time>
              <strong>{record.startPage}–{record.endPage}쪽 · {record.endPage - record.startPage + 1}쪽 읽음</strong>
              {record.impression && <p>{record.impression}</p>}
              <div className="record-page__actions" aria-label="기록 작업">
                <Button type="button" variant="ghost" size="sm" onClick={() => onEditRecord(record)}>
                  수정
                </Button>
                {record.id === latestRecord?.id && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => onDeleteRecord(record)}>
                    삭제
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="record-list__empty">첫 독서 기록을 이곳에 남겨 보세요.</p>
      )}
    </section>
  );
}
