"use client";

import { useEffect, useState } from "react";

type Item = {
  id: number;
  title: string | null;
  original_url: string | null;
  source_platform: string | null;
  category_main: string | null;
  category_sub: string | null;
  created_at: string;
};

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000"
).replace(/\/$/, "");

async function readApiError(response: Response) {
  const body = await response.json().catch(() => null);
  return body?.error || "API 요청에 실패했습니다.";
}

function getCategoryStyle(categoryMain: string | null) {
  const styles: Record<string, string> = {
    영상: "bg-red-50 text-red-600 hover:bg-red-100",
    콘텐츠: "bg-blue-50 text-blue-600 hover:bg-blue-100",
    개발: "bg-sky-50 text-sky-600 hover:bg-sky-100",
    쇼핑: "bg-purple-50 text-purple-600 hover:bg-purple-100",
    SNS: "bg-pink-50 text-pink-600 hover:bg-pink-100",
    건강: "bg-green-50 text-green-600 hover:bg-green-100",
    여행: "bg-amber-50 text-amber-700 hover:bg-amber-100",
    패션: "bg-violet-50 text-violet-600 hover:bg-violet-100",
  };

  return styles[categoryMain ?? ""] ?? "bg-gray-100 text-gray-600 hover:bg-gray-200";
}

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
      setError(
        requestError instanceof Error
          ? requestError.message
          : "저장 목록을 불러오지 못했습니다."
      );
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
      setError(
        requestError instanceof Error
          ? requestError.message === "Failed to fetch"
            ? "API 서버에 연결할 수 없습니다. Express 서버와 CORS 설정을 확인해주세요."
            : requestError.message
          : "항목을 저장하지 못했습니다."
      );
    } finally {
      setSaving(false);
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
            <li
              key={item.id}
              className="flex items-center justify-between bg-white/60 rounded-xl px-3 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm text-ink font-medium truncate">
                  {item.title || "(제목 없음)"}
                </p>
                <p className="text-xs text-muted">
                  {item.source_platform ?? "manual"} ·{" "}
                  {new Date(item.created_at).toLocaleDateString("ko-KR")}
                </p>
              </div>
              <span
                className={`text-xs rounded-full px-2 py-1 shrink-0 ml-2 font-medium transition-colors ${getCategoryStyle(
                  item.category_main
                )}`}
              >
                {item.category_main ?? "미분류"} · {item.category_sub ?? "기타"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* 하단 네비게이션 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-creamDeep">
        <div className="max-w-md mx-auto flex justify-around py-3 text-xs text-muted">
          <span className="text-accentDark font-medium">홈</span>
          <span>카테고리</span>
          <span>아카이브</span>
          <span>설정</span>
        </div>
      </nav>
    </main>
  );
}
