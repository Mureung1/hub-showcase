"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ItemCard from "../ItemCard";
import {
  apiBaseUrl,
  getRequestErrorMessage,
  matchesItemSearch,
  readApiError,
  type ArchiveItemResponse,
  type DeleteItemResponse,
  type Item,
} from "../../lib/items";

export default function ArchivePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchArchivedItems() {
      try {
        const response = await fetch(`${apiBaseUrl}/api/items?archived=true`);
        if (!response.ok) {
          throw new Error(await readApiError(response, "아카이브를 불러오지 못했습니다."));
        }
        setItems(await response.json());
      } catch (requestError) {
        setError(getRequestErrorMessage(requestError, "아카이브를 불러오지 못했습니다."));
      } finally {
        setLoading(false);
      }
    }

    void fetchArchivedItems();
  }, []);

  async function changeArchiveState(id: number, archived: boolean) {
    try {
      const response = await fetch(`${apiBaseUrl}/api/items/${id}/archive`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived }),
      });
      if (!response.ok) throw new Error(await readApiError(response));
      const result: ArchiveItemResponse = await response.json();
      setItems((currentItems) => currentItems.filter((item) => item.id !== result.id));
    } catch (requestError) {
      throw new Error(getRequestErrorMessage(requestError, "항목을 복원하지 못했습니다."));
    }
  }

  async function deleteItem(id: number) {
    try {
      const response = await fetch(`${apiBaseUrl}/api/items/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await readApiError(response));
      const result: DeleteItemResponse = await response.json();
      setItems((currentItems) => currentItems.filter((item) => item.id !== result.id));
    } catch (requestError) {
      throw new Error(getRequestErrorMessage(requestError, "항목을 삭제하지 못했습니다."));
    }
  }

  const filteredItems = items.filter((item) => matchesItemSearch(item, searchQuery));

  return (
    <main className="min-h-screen bg-cream flex flex-col max-w-md mx-auto px-5 pt-6 pb-24">
      <header className="flex items-center justify-between mb-8">
        <Link href="/" className="text-xl font-semibold tracking-tight text-ink">
          later.
        </Link>
        <div className="w-8 h-8 rounded-full bg-white border border-creamDeep" />
      </header>

      <section className="mb-7">
        <h1 className="text-2xl font-bold text-ink mb-1">아카이브</h1>
        <p className="text-sm text-muted">확인을 마친 콘텐츠를 보관해두는 공간이에요.</p>
      </section>

      {loading && <p className="text-sm text-muted">불러오는 중...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && items.length > 0 && (
        <section className="mb-6">
          <label htmlFor="archive-search" className="sr-only">
            아카이브 검색
          </label>
          <input
            id="archive-search"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="제목, 요약, 원문, 카테고리 검색"
            className="w-full rounded-xl border border-creamDeep bg-white px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-accent"
          />
        </section>
      )}
      {!loading && !error && filteredItems.length === 0 && (
        <div className="bg-white/60 rounded-xl px-4 py-10 text-center">
          <p className="text-sm text-muted">
            {searchQuery.trim() ? "검색 결과가 없어요." : "아직 보관한 콘텐츠가 없어요."}
          </p>
          {!searchQuery.trim() && (
            <Link href="/categories" className="mt-3 inline-block text-sm text-accentDark">
              카테고리에서 콘텐츠 확인하기
            </Link>
          )}
        </div>
      )}
      {!loading && !error && filteredItems.length > 0 && (
        <ul className="space-y-3">
          {filteredItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onDelete={deleteItem}
              onArchive={changeArchiveState}
            />
          ))}
        </ul>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-creamDeep">
        <div className="max-w-md mx-auto flex justify-around pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] text-xs text-muted">
          <Link href="/">홈</Link>
          <Link href="/categories">카테고리</Link>
          <Link href="/archive" className="text-accentDark font-medium">
            아카이브
          </Link>
          <span>설정</span>
        </div>
      </nav>
    </main>
  );
}
