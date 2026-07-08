import type { PerspectiveItem } from "../types/context";

type PerspectiveTableProps = {
  perspectives: PerspectiveItem[];
};

function PerspectiveTable({ perspectives }: PerspectiveTableProps) {
  return (
    <section className="result-panel wide" aria-labelledby="perspective-title">
      <div className="panel-heading compact">
        <p className="section-kicker">Perspective</p>
        <h2 id="perspective-title">참여자별 관점 차이</h2>
      </div>

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
            {perspectives.map((item) => (
              <tr key={item.actor}>
                <td>{item.actor}</td>
                <td>{item.role}</td>
                <td>{item.focus}</td>
                <td>{item.concern}</td>
                <td>{item.question}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default PerspectiveTable;
