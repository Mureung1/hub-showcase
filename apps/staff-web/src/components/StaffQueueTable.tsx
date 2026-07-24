import type { QueuePosition, WaitingStatus } from "@baro-jinryo/shared";
import { formatPatientCounts, formatPositionRange } from "@baro-jinryo/shared";
import { ArrowDown, ArrowUp, Megaphone, RotateCcw, UserCheck, UsersRound } from "lucide-react";
import { statusLabels } from "../utils/queueLabels";

interface StaffQueueTableProps {
  rows: QueuePosition[];
  activeRows: QueuePosition[];
  selectedId: string | undefined;
  onOpen: (waitingId: string) => void;
  onChangeStatus: (id: string, status: WaitingStatus) => void;
  onRestore: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
}

export function StaffQueueTable({
  rows,
  activeRows,
  selectedId,
  onOpen,
  onChangeStatus,
  onRestore,
  onMove,
}: StaffQueueTableProps) {
  if (rows.length === 0) {
    return (
      <section className="queue-table-wrap">
        <div className="staff-empty">
          <UsersRound size={28} />
          <strong>현재 대기 환자가 없습니다</strong>
          <p>현장 환자를 등록하거나 원격 접수를 열어 주세요.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="queue-table-wrap">
      <table className="queue-table">
        <thead>
          <tr>
            <th>대기 팀</th>
            <th>실제 환자 순서</th>
            <th>접수번호</th>
            <th>유형</th>
            <th>가족 인원</th>
            <th>현재 상태</th>
            <th>등록 시각</th>
            <th>다음 동작</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              className={selectedId === row.entry.id ? "is-selected" : ""}
              key={row.entry.id}
              onClick={() => onOpen(row.entry.id)}
            >
              <td>{row.teamNumber ? `${row.teamNumber}팀` : "-"}</td>
              <td>{formatPositionRange(row)}</td>
              <td><strong>{row.entry.ticketNumber}</strong></td>
              <td>
                <span className={`source-label source-label--${row.entry.source}`}>
                  {row.entry.source === "remote" ? "원격" : "현장"}
                </span>
              </td>
              <td>{formatPatientCounts(row.entry)}</td>
              <td>
                <span className={`waiting-state waiting-state--${row.entry.status}`}>
                  {statusLabels[row.entry.status]}
                </span>
              </td>
              <td>{row.entry.registeredAt}</td>
              <td>
                <div className="row-actions">
                  {row.entry.status === "entry_requested" && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onChangeStatus(row.entry.id, "onsite_waiting");
                      }}
                    >
                      <UserCheck size={17} /> 도착 처리
                    </button>
                  )}
                  {row.entry.status === "onsite_waiting" && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onChangeStatus(row.entry.id, "called");
                      }}
                    >
                      <Megaphone size={17} /> 진료실 호출
                    </button>
                  )}
                  {row.entry.status === "held" && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onRestore(row.entry.id);
                      }}
                    >
                      <RotateCcw size={17} /> 대기열 복귀
                    </button>
                  )}
                  {row.position !== null && (
                    <>
                      <button
                        type="button"
                        aria-label={`접수번호 ${row.entry.ticketNumber} 한 칸 위로`}
                        disabled={activeRows[0]?.entry.id === row.entry.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          onMove(row.entry.id, -1);
                        }}
                      >
                        <ArrowUp size={17} />
                      </button>
                      <button
                        type="button"
                        aria-label={`접수번호 ${row.entry.ticketNumber} 한 칸 아래로`}
                        disabled={activeRows.at(-1)?.entry.id === row.entry.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          onMove(row.entry.id, 1);
                        }}
                      >
                        <ArrowDown size={17} />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
