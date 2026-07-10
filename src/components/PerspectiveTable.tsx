import type { PerspectiveItem } from "../types/context";

type PerspectiveTableProps = {
  participants: PerspectiveItem[];
};

function PerspectiveTable({ participants }: PerspectiveTableProps) {
  return (
    <section className="result-panel wide" aria-labelledby="perspective-title">
      <div className="panel-heading compact">
        <p className="section-kicker">Perspective</p>
        <h2 id="perspective-title">참여자별 관점 차이</h2>
      </div>

      {participants.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>참여자</th>
                <th>역할</th>
                <th>중점</th>
                <th>우려</th>
                <th>질문</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((item) => (
                <tr key={item.actor}>
                  <td data-label="참여자">{item.actor}</td>
                  <td data-label="역할">{item.role}</td>
                  <td data-label="중점">{item.focus}</td>
                  <td data-label="우려">{item.concern}</td>
                  <td data-label="질문">{item.question}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="result-empty-state">입력 기록에서 참여자별 발언 주체를 구분할 수 없습니다.</p>
      )}
    </section>
  );
}

export default PerspectiveTable;
