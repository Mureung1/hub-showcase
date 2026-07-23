"use client";

import { useState } from "react";
import type { Item } from "../lib/items";
import { getCategoryStyle } from "./categoryStyles";

type ItemCardProps = {
  item: Item;
  onDelete: (id: number) => Promise<void>;
};

function getDisplayTitle(item: Item) {
  if (item.title && !/^https?:\/\//i.test(item.title)) return item.title;
  if (item.category_sub) return `${item.category_sub} 관련 콘텐츠`;
  if (item.category_main && item.category_main !== "미분류") {
    return `${item.category_main} 관련 콘텐츠`;
  }
  return item.image_url ? "저장한 이미지" : "저장한 웹 콘텐츠";
}

export default function ItemCard({ item, onDelete }: ItemCardProps) {
  const [pendingAction, setPendingAction] = useState<"delete" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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

  const isPending = pendingAction !== null;

  return (
    <li className="bg-white/60 rounded-xl px-3 py-3">
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
              {getDisplayTitle(item)}
            </p>
            {item.original_url && (
              <p className="mt-1 truncate text-[11px] text-muted/80" title={item.original_url}>
                {item.original_url}
              </p>
            )}
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
      {actionError && <p className="mt-2 text-xs text-red-600">{actionError}</p>}
    </li>
  );
}
