"use client";

import { useState } from "react";
import type { Item } from "../lib/items";
import { getCategoryStyle } from "./categoryStyles";

type ItemCardProps = {
  item: Item;
  onUpdate: (id: number, title: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
};

export default function ItemCard({ item, onUpdate, onDelete }: ItemCardProps) {
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(item.title ?? "");
  const [pendingAction, setPendingAction] = useState<"update" | "delete" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function saveEdit() {
    const title = draftTitle.trim();
    if (!title) {
      setActionError("제목을 입력해주세요.");
      return;
    }

    setPendingAction("update");
    setActionError(null);
    try {
      await onUpdate(item.id, title);
      setEditing(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "항목을 수정하지 못했습니다.");
    } finally {
      setPendingAction(null);
    }
  }

  async function deleteItem() {
    if (!window.confirm("이 항목을 삭제할까요? 삭제 후에는 되돌릴 수 없습니다.")) return;

    setPendingAction("delete");
    setActionError(null);
    try {
      await onDelete(item.id);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "항목을 삭제하지 못했습니다.");
      setPendingAction(null);
    }
  }

  function cancelEdit() {
    setDraftTitle(item.title ?? "");
    setActionError(null);
    setEditing(false);
  }

  const isPending = pendingAction !== null;

  return (
    <li className="bg-white/60 rounded-xl px-3 py-3">
      {editing ? (
        <div>
          <input
            type="text"
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !isPending) void saveEdit();
              if (event.key === "Escape" && !isPending) cancelEdit();
            }}
            disabled={isPending}
            aria-label="항목 제목"
            className="w-full rounded-lg border border-creamDeep bg-white px-3 py-2 text-sm text-ink outline-none focus:border-accent disabled:opacity-60"
            autoFocus
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={cancelEdit}
              disabled={isPending}
              className="rounded-lg border border-creamDeep px-3 py-1.5 text-xs text-muted disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={saveEdit}
              disabled={isPending || !draftTitle.trim()}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              {pendingAction === "update" ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      ) : (
        <div>
          {item.image_url && (
            <img
              src={item.image_url}
              alt={item.title || "저장된 이미지"}
              className="mb-3 max-h-64 w-full rounded-lg object-cover"
            />
          )}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink font-medium break-words">
                {item.title || "(제목 없음)"}
              </p>
              <p className="text-xs text-muted">
                {item.source_platform ?? "manual"} ·{" "}
                {new Date(item.created_at).toLocaleDateString("ko-KR")}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <span
                className={`text-xs rounded-full px-2 py-1 font-medium transition-colors ${getCategoryStyle(
                  item.category_main
                )}`}
              >
                {item.category_main ?? "미분류"} · {item.category_sub ?? "기타"}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDraftTitle(item.title ?? "");
                    setActionError(null);
                    setEditing(true);
                  }}
                  disabled={isPending}
                  className="text-xs text-muted hover:text-ink disabled:opacity-50"
                >
                  수정
                </button>
                <button
                  type="button"
                  onClick={deleteItem}
                  disabled={isPending}
                  className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                >
                  {pendingAction === "delete" ? "삭제 중..." : "삭제"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {actionError && <p className="mt-2 text-xs text-red-600">{actionError}</p>}
    </li>
  );
}
