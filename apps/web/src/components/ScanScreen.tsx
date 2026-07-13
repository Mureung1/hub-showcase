import { useEffect, useReducer, useRef, useState } from "react";
import { newId, now, type Product } from "@sherpa/core";
import { productRepository } from "../repository/DexieProductRepository";
import { scanReducer, initialScanState } from "../session/scanReducer";
import { commitSession } from "../session/commitSession";
import type { SessionMode } from "../session/types";
import { expiryStatus } from "../lib/date";
import { useThresholdStore } from "../store/thresholdStore";
import { useScanner } from "../scan/useScanner";
import { SessionHeader } from "./SessionHeader";
import { ScanBar } from "./ScanBar";
import { DemoChips } from "./DemoChips";
import { ScanLineList } from "./ScanLineList";
import { SummaryRail } from "./SummaryRail";
import { RegisterModal } from "./RegisterModal";
import { ClearConfirmModal } from "./ClearConfirmModal";

const MODE_LABEL: Record<SessionMode, string> = { inbound: "입고", outbound: "출고" };

interface Toast {
  msg: string;
  ok: boolean;
}

// 홈 = 스캔 화면. 디자인 입고 탭 레이아웃(스캔바 → 데모칩 → 목록|요약 2단)을 조립하고,
// 세션 상태(mode + lines + 편집)를 useReducer로 소유한다. 입고/출고 모드는 유지(§7).
export function ScanScreen() {
  const [state, dispatch] = useReducer(scanReducer, initialScanState);
  const [toast, setToast] = useState<Toast | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const toastTimer = useRef<number | null>(null);
  const threshDays = useThresholdStore((s) => s.threshDays);

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }

  // 모드 전환 = 새 세션 시작(lines 리셋). 진행 중이면 확인 후 전환(파괴적 동작 보호).
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
      dispatch({ type: "SCAN_KNOWN", product });
      return;
    }
    if (state.mode === "outbound") {
      // 재고에 없는 유령 물량 차감 방지 — 경고만, 세션 미추가.
      showToast("등록·입고 이력이 없는 상품입니다", false);
    } else {
      dispatch({ type: "SCAN_UNKNOWN", barcode });
    }
  }

  useScanner(handleScan);

  // 모달 저장 → 상품 마스터 저장 후 pending 행을 ready로 승격(productId 확정).
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
    dispatch({ type: "PROMOTE", lineId: line.id, productId: product.id, name, category });
  }

  // 행 ✕ = draft에서 제거(커밋 전이라 확인 없이 즉시, 재스캔으로 복구 가능).
  function handleRemove(lineId: string) {
    dispatch({ type: "REMOVE_LINE", lineId });
  }

  // 커밋 = 세션 전체 반영(입고=Lot 생성 / 출고=stub) 후 세션 리셋.
  async function handleCommit() {
    if (state.lines.length === 0 || pendingCount > 0) return;
    const result = await commitSession(state.mode, state.lines);
    dispatch({ type: "RESET_SESSION" });
    showToast(
      `${MODE_LABEL[state.mode]} 완료 · ${result.itemCount}품목 ${result.totalQuantity}개가 반영됐어요`,
      true
    );
  }

  function doClear() {
    dispatch({ type: "RESET_SESSION" });
    setConfirmClear(false);
  }

  const editingLine =
    state.editingLineId != null
      ? state.lines.find((l) => l.id === state.editingLineId) ?? null
      : null;

  const totalQty = state.lines.reduce((sum, l) => sum + l.quantity, 0);
  const pendingCount = state.lines.filter((l) => l.status === "pending").length;
  const imminentCount =
    state.mode === "inbound"
      ? state.lines.filter(
          (l) => l.status === "ready" && expiryStatus(l.expiryDate, threshDays) === "imminent"
        ).length
      : 0;

  return (
    <div className={`workspace workspace--${state.mode}`}>
      <SessionHeader mode={state.mode} onChange={handleModeChange} />

      <main className="stage">
        <ScanBar onScan={handleScan} />
        {state.mode === "inbound" && <DemoChips onScan={handleScan} />}

        <div className="stage__work">
          <ScanLineList
            lines={state.lines}
            lastLineId={state.lastLineId}
            mode={state.mode}
            threshDays={threshDays}
            onEdit={(id) => dispatch({ type: "OPEN_EDIT", lineId: id })}
            onExpiry={(id, iso) => dispatch({ type: "SET_EXPIRY", lineId: id, expiry: iso })}
            onInc={(id) => dispatch({ type: "INC", lineId: id })}
            onDec={(id) => dispatch({ type: "DEC", lineId: id })}
            onRemove={handleRemove}
            onClear={() => setConfirmClear(true)}
          />
          <SummaryRail
            mode={state.mode}
            kinds={state.lines.length}
            totalQty={totalQty}
            imminentCount={imminentCount}
            pendingCount={pendingCount}
            hasLines={state.lines.length > 0}
            onCommit={handleCommit}
            onClear={() => setConfirmClear(true)}
          />
        </div>
      </main>

      {toast && (
        <div className={`toast toast--${toast.ok ? "ok" : "warn"}`} role="status">
          {toast.msg}
        </div>
      )}

      {editingLine && editingLine.status === "pending" && (
        <RegisterModal
          key={editingLine.id}
          line={editingLine}
          onSave={handleRegister}
          onDelete={() => handleRemove(editingLine.id)}
          onClose={() => dispatch({ type: "CLOSE_EDIT" })}
        />
      )}

      {confirmClear && (
        <ClearConfirmModal
          mode={state.mode}
          onCancel={() => setConfirmClear(false)}
          onConfirm={doClear}
        />
      )}
    </div>
  );
}
