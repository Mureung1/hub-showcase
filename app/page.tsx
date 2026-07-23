"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ItemCard from "./ItemCard";
import {
  apiBaseUrl,
  getRequestErrorMessage,
  readApiError,
  type DeleteItemResponse,
  type Item,
} from "../lib/items";

export default function Home() {
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchItems() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/api/items`);
      if (!response.ok) throw new Error(await readApiError(response));
      setItems(await response.json());
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, "저장 목록을 불러오지 못했습니다."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchItems();
  }, []);

  async function handleSave() {
    if (!input.trim()) return;
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input.trim() }),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      const savedItem: Item = await response.json();
      setItems((currentItems) => [savedItem, ...currentItems]);
      setInput("");
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, "항목을 저장하지 못했습니다."));
    } finally {
      setSaving(false);
    }
  }

  async function updateItem(id: number, title: string) {
    try {
      const response = await fetch(`${apiBaseUrl}/api/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      const updatedItem: Item = await response.json();
      setItems((currentItems) =>
        currentItems.map((item) => (item.id === updatedItem.id ? updatedItem : item))
      );
    } catch (requestError) {
      throw new Error(getRequestErrorMessage(requestError, "항목을 수정하지 못했습니다."));
    }
  }

  async function deleteItem(id: number) {
    try {
      const response = await fetch(`${apiBaseUrl}/api/items/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(await readApiError(response));
      const result: DeleteItemResponse = await response.json();
      setItems((currentItems) => currentItems.filter((item) => item.id !== result.id));
    } catch (requestError) {
      throw new Error(getRequestErrorMessage(requestError, "항목을 삭제하지 못했습니다."));
    }
  }

  return (
    <main className="min-h-screen bg-cream flex flex-col max-w-md mx-auto px-5 pt-6 pb-24">
      {/* 헤더 */}
      <header className="flex items-center justify-between mb-8">
        <span className="text-xl font-semibold tracking-tight text-ink">
          later.
        </span>
        <div className="w-8 h-8 rounded-full bg-white border border-creamDeep" />
      </header>

      {/* 저장 입력 영역 */}
      <section className="mb-8">
        <h1 className="text-2xl font-bold leading-snug text-ink mb-4">
          무엇을
          <br />
          저장할까요?
        </h1>

        <div className="bg-white rounded-xl2 p-4 shadow-sm border border-creamDeep">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                if (!saving && input.trim()) void handleSave();
              }
            }}
            placeholder="링크나 텍스트를 붙여넣으세요"
            rows={3}
            className="w-full resize-none outline-none text-sm text-ink placeholder:text-muted bg-transparent"
          />
          <div className="flex items-center justify-between mt-2">
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-muted border border-creamDeep rounded-full px-3 py-1.5"
              onClick={() => alert("이미지 업로드는 곧 연결될 예정이에요")}
            >
              📎 이미지
            </button>
            <span className="text-xs text-muted">스크린샷도 저장돼요</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !input.trim()}
          className="w-full mt-4 bg-accent hover:bg-accentDark disabled:opacity-50 text-white font-medium rounded-xl2 py-3.5 transition-colors"
        >
          {saving ? "저장하는 중..." : "저장"}
        </button>
      </section>

      {/* 최근 저장 */}
      <section>
        <h2 className="text-sm font-medium text-muted mb-3">최근 저장</h2>

        {loading && <p className="text-sm text-muted">불러오는 중...</p>}

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        {!loading && items.length === 0 && (
          <p className="text-sm text-muted">
            아직 저장한 게 없어요. 위 입력창에 링크나 텍스트를 붙여넣어보세요.
          </p>
        )}

        <ul className="space-y-3">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onUpdate={updateItem}
              onDelete={deleteItem}
            />
          ))}
        </ul>
      </section>

      {/* 하단 네비게이션 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-creamDeep">
        <div className="max-w-md mx-auto flex justify-around py-3 text-xs text-muted">
          <Link href="/" className="text-accentDark font-medium">
            홈
          </Link>
          <Link href="/categories">카테고리</Link>
          <span>아카이브</span>
          <span>설정</span>
        </div>
      </nav>
    </main>
  );
}
