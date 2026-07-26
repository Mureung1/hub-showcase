"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  apiBaseUrl,
  getRequestErrorMessage,
  readApiError,
} from "../lib/items";
import { getImageValidationError } from "../lib/image";

export default function Home() {
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedImage) {
      setImagePreviewUrl(null);
      return;
    }
    const previewUrl = URL.createObjectURL(selectedImage);
    setImagePreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [selectedImage]);

  async function handleSave() {
    if (!input.trim() && !selectedImage) return;
    setSaving(true);
    setError(null);

    try {
      const response = selectedImage
        ? await fetch(`${apiBaseUrl}/api/items`, {
            method: "POST",
            body: (() => {
              const formData = new FormData();
              formData.append("content", input.trim());
              formData.append("image", selectedImage);
              return formData;
            })(),
          })
        : await fetch(`${apiBaseUrl}/api/items`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: input.trim() }),
          });
      if (!response.ok) throw new Error(await readApiError(response));
      await response.json();
      setInput("");
      setSelectedImage(null);
      setImageError(null);
      if (imageInputRef.current) imageInputRef.current.value = "";
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, "항목을 저장하지 못했습니다."));
    } finally {
      setSaving(false);
    }
  }

  function selectImage(file: File | undefined) {
    if (!file) return;
    const validationError = getImageValidationError(file);
    if (validationError) {
      setImageError(validationError);
      setSelectedImage(null);
      if (imageInputRef.current) imageInputRef.current.value = "";
      return;
    }
    setImageError(null);
    setSelectedImage(file);
  }

  function removeImage() {
    setSelectedImage(null);
    setImageError(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
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
                if (!saving && (input.trim() || selectedImage)) void handleSave();
              }
            }}
            placeholder="링크나 텍스트를 붙여넣으세요"
            rows={3}
            className="w-full resize-none outline-none text-sm text-ink placeholder:text-muted bg-transparent"
          />
          {imagePreviewUrl && selectedImage && (
            <div className="mt-3 rounded-xl border border-creamDeep bg-cream/40 p-2">
              <img
                src={imagePreviewUrl}
                alt="선택한 이미지 미리보기"
                className="max-h-48 w-full rounded-lg object-cover"
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="truncate text-xs text-muted">{selectedImage.name}</span>
                <button
                  type="button"
                  onClick={removeImage}
                  className="shrink-0 text-xs text-red-500 hover:text-red-700"
                >
                  이미지 제거
                </button>
              </div>
            </div>
          )}
          {imageError && <p className="mt-2 text-xs text-red-600">{imageError}</p>}
          <div className="flex items-center justify-between mt-2">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => selectImage(event.target.files?.[0])}
            />
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-muted border border-creamDeep rounded-full px-3 py-1.5"
              onClick={() => imageInputRef.current?.click()}
            >
              📎 {selectedImage ? "이미지 변경" : "이미지"}
            </button>
            <span className="text-xs text-muted">스크린샷도 저장돼요</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || (!input.trim() && !selectedImage)}
          className="w-full mt-4 bg-accent hover:bg-accentDark disabled:opacity-50 text-white font-medium rounded-xl2 py-3.5 transition-colors"
        >
          {saving ? "저장하는 중..." : "저장"}
        </button>
      </section>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {/* 하단 네비게이션 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-creamDeep">
        <div className="max-w-md mx-auto flex justify-around py-3 text-xs text-muted">
          <Link href="/" className="text-accentDark font-medium">
            홈
          </Link>
          <Link href="/categories">카테고리</Link>
          <Link href="/archive">아카이브</Link>
          <span>설정</span>
        </div>
      </nav>
    </main>
  );
}
