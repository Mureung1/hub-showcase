import { useEffect, useReducer, useRef, useState } from "react";
import { newId, now, type Product } from "@sherpa/core";
import { seedProducts } from "../seed";
import { productRepository } from "../repository/DexieProductRepository";
import { scanReducer, initialScanState } from "../session/scanReducer";
import { commitSession } from "../session/commitSession";
import type { SessionMode } from "../session/types";
import { useScanner } from "../scan/useScanner";
import { SessionHeader } from "./SessionHeader";
import { DevScanInput } from "./DevScanInput";
import { ScanLineList } from "./ScanLineList";
import { CommitBar } from "./CommitBar";
import { RegisterModal } from "./RegisterModal";

const MODE_LABEL: Record<SessionMode, string> = {
  inbound: "입고",
  outbound: "출고",
};

// 홈 = 스캔 화면. 세션 상태(mode + lines + 편집)를 useReducer로 소유하고 조립한다.
export function ScanScreen() {
  const [state, dispatch] = useReducer(scanReducer, initialScanState);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    void seedProducts();
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2500);
  }

  // 모드 전환 = 새 세션 시작(lines 리셋). 진행 중 항목이 있으면 확인 후 전환(파괴적 동작 보호).
  function handleModeChange(next: SessionMode) {
    if (next === state.mode) return;
    if (state.lines.length > 0) {
      const ok = window.confirm(
        `현재 ${MODE_LABEL[state.mode]} 세션의 ${state.lines.length}개 항목이 초기화됩니다. ` +
          `${MODE_LABEL[next]}로 전환할까요?`
      );
      if (!ok) return;
    }
    dispatch({ type: "SET_MODE", mode: next });
  }

  async function handleScan(raw: string) {
    const barcode = raw.trim();
    if (barcode === "") return;
    const product = await productRepository.findByBarcode(barcode);
    if (product) {
      // 등록된 상품 → 리스트 누적(모달 열려 있어도 무관, non-blocking).
      dispatch({ type: "SCAN_KNOWN", product });
      return;
    }
    if (state.mode === "outbound") {
      // 재고에 없는 유령 물량 차감 방지 — 경고만, 세션 미추가.
      showToast("등록·입고 이력이 없는 상품입니다");
    } else {
      // 입고 미등록 → pending 행 생성 + 등록 모달 연결(이전 편집 행은 리스트에 잔존).
      dispatch({ type: "SCAN_UNKNOWN", barcode });
    }
  }

  // 실물 스캐너(keyboard-wedge) 버스트를 document 레벨에서 감지 → 수동 입력과 병행.
  useScanner(handleScan);

  // 모달 저장 → 상품 마스터 저장(이후 스캔부터 등록됨 인식) 후 pending 행을 ready로 승격.
  async function handleRegister(name: string, category: string) {
    const line = editingLine;
    if (!line) return;
    const t = now();
    const product: Product = {
      id: newId(),
      barcode: line.barcode,
      name,
      category,
      createdAt: t,
      updatedAt: t,
    };
    await productRepository.save(product);
    dispatch({ type: "PROMOTE", lineId: line.id, name, category });
  }

  // 오스캔 취소 = 명시적 삭제. 파괴적 동작이라 확인 절차를 둔다.
  function handleDeleteLine(lineId: string) {
    const ok = window.confirm("이 미등록 항목을 삭제할까요? (오스캔 취소)");
    if (!ok) return;
    dispatch({ type: "REMOVE_LINE", lineId });
  }

  // 커밋 = 세션 전체를 단일 트랜잭션으로 반영(지금은 stub) 후 세션 리셋.
  // pending이 남아있으면 커밋 불가(강제 등록) — 버튼 비활성으로 이미 막히지만 방어.
  async function handleCommit() {
    if (state.lines.length === 0 || pendingCount > 0) return;
    const result = await commitSession(state.mode, state.lines);
    dispatch({ type: "RESET_SESSION" });
    showToast(
      `${MODE_LABEL[state.mode]} 확정 · ${result.itemCount}품목 ${result.totalQuantity}개`
    );
  }

  const editingLine =
    state.editingLineId != null
      ? state.lines.find((l) => l.id === state.editingLineId) ?? null
      : null;

  const totalQty = state.lines.reduce((sum, l) => sum + l.quantity, 0);
  const pendingCount = state.lines.filter((l) => l.status === "pending").length;

  return (
    <div className={`app app--${state.mode}`}>
      <header className="topbar">
        <span className="topbar__brand">셰르파</span>
        <span className="topbar__sub">스캔</span>
      </header>

      <SessionHeader mode={state.mode} onChange={handleModeChange} />

      <main className="stage">
        <DevScanInput onScan={handleScan} />
        <ScanLineList
          lines={state.lines}
          lastLineId={state.lastLineId}
          onEdit={(id) => dispatch({ type: "OPEN_EDIT", lineId: id })}
          onInc={(id) => dispatch({ type: "INC", lineId: id })}
          onDec={(id) => dispatch({ type: "DEC", lineId: id })}
        />
      </main>

      <CommitBar
        mode={state.mode}
        totalQty={totalQty}
        itemCount={state.lines.length}
        pendingCount={pendingCount}
        onCommit={handleCommit}
      />

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}

      {editingLine && editingLine.status === "pending" && (
        <RegisterModal
          key={editingLine.id}
          line={editingLine}
          onSave={handleRegister}
          onDelete={() => handleDeleteLine(editingLine.id)}
          onClose={() => dispatch({ type: "CLOSE_EDIT" })}
        />
      )}
    </div>
  );
}
