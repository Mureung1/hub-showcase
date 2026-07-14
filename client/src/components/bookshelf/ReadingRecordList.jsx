import { formatRecordDate } from '@/lib/reading';

export function ReadingRecordList({ records }) {
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
            </li>
          ))}
        </ol>
      ) : (
        <p className="record-list__empty">첫 독서 기록을 이곳에 남겨 보세요.</p>
      )}
    </section>
  );
}
