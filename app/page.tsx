"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Item = {
  id: number;
  title: string | null;
  original_url: string | null;
  source_platform: string | null;
  category_main: string | null;
  created_at: string;
};

function isUrl(text: string) {
  try {
    new URL(text.trim());
    return true;
  } catch {
    return false;
  }
}

function guessSourcePlatform(url: string) {
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("instagram.com")) return "instagram";
  if (url.includes("twitter.com") || url.includes("x.com")) return "twitter";
  if (url.includes("naver.com")) return "naver";
  return "web";
}

export default function Home() {
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchItems() {
    setLoading(true);
    const { data, error } = await supabase
      .from("items")
      .select(
        "id, title, original_url, source_platform, category_main, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error(error);
    } else {
      setItems(data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchItems();
  }, []);

  async function handleSave() {
    if (!input.trim()) return;
    setSaving(true);

    const trimmed = input.trim();
    const urlDetected = isUrl(trimmed);

    const { error } = await supabase.from("items").insert({
      type: urlDetected ? "link" : "text",
      original_url: urlDetected ? trimmed : null,
      title: urlDetected ? trimmed : trimmed.slice(0, 50),
      source_platform: urlDetected ? guessSourcePlatform(trimmed) : "manual",
      status: "unread",
    });

    if (error) {
      console.error(error);
      alert("저장에 실패했어요. 콘솔을 확인해주세요.");
    } else {
      setInput("");
      await fetchItems();
    }
    setSaving(false);
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
              <span className="text-xs text-accentDark bg-accent/10 rounded-full px-2 py-1 shrink-0 ml-2">
                {item.category_main ?? "미분류"}
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
