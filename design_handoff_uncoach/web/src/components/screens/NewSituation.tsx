"use client";
import { useRef, useState } from "react";
import { useApp } from "@/lib/client/store";
import { generateSituation, extractCapture } from "@/lib/client/api";
import type { Situation } from "@/lib/domain/types";
import type { ScreenKey } from "@/components/AppShell";
import ProfileChip from "@/components/stitch/ProfileChip";

// 이 화면의 유일한 일: 말 꺼내기 어려운 상황 하나를 받아 훈련할 수 있는 카드로 만든다.
// 예전엔 제목·상대·목적·어려운 점 4칸을 다 요구했는데, 그건 데이터 모델을 그대로 폼으로 옮긴 것이었다.
// 사람은 "다음 주에 팀장님한테 휴가 얘기해야 하는데 눈치 보여" 한 문장으로 생각한다.
// 그래서 입력은 한 칸, 나머지는 접어 둔다. API도 title 하나만 필수다.

const MAX = 200;

/** 캡쳐 이미지를 브라우저에서 축소·재인코딩해 전송량을 줄인다. */
function compressImage(img: HTMLImageElement, maxDim = 1280, quality = 0.8): string {
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  if (w > maxDim || h > maxDim) {
    const r = Math.min(maxDim / w, maxDim / h);
    w = Math.round(w * r);
    h = Math.round(h * r);
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

export default function NewSituation({
  nav,
  onStart,
  defaultMedium = "chat",
}: {
  nav: (k: ScreenKey) => void;
  onStart: (s: Situation) => void;
  defaultMedium?: "chat" | "email";
}) {
  const app = useApp();
  const [text, setText] = useState("");
  const [medium, setMedium] = useState<"chat" | "email">(defaultMedium);
  const [who, setWho] = useState("");
  const [tension, setTension] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Situation | null>(null);
  const [captureBusy, setCaptureBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const back = () => nav(defaultMedium === "email" ? "mailPicker" : "chatPicker");

  function onCaptureFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      setError("이미지 파일을 올려주세요.");
      return;
    }
    setCaptureBusy(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = async () => {
        const m = /^data:(image\/\w+);base64,(.+)$/.exec(compressImage(img));
        if (!m) {
          setCaptureBusy(false);
          setError("이미지 형식을 인식하지 못했어요. jpg나 png로 올려주세요.");
          return;
        }
        try {
          const ex = await extractCapture(m[2], m[1]);
          // 캡처에서 읽은 내용으로 폼을 채운다 — 사용자가 확인하고 고칠 수 있게 덮어쓰지 않고 비어 있을 때만.
          setText((t) => t || ex.title || "");
          setWho((w) => w || ex.who || "");
          setTension((t) => t || ex.tension || "");
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setCaptureBusy(false);
        }
      };
      img.onerror = () => {
        setCaptureBusy(false);
        setError("이미지를 열지 못했어요.");
      };
      img.src = String(reader.result);
    };
    reader.onerror = () => {
      setCaptureBusy(false);
      setError("파일을 읽지 못했어요.");
    };
    reader.readAsDataURL(file);
  }

  async function build() {
    const title = text.trim();
    if (busy || title.length < 2) return;
    setBusy(true);
    setError(null);
    try {
      const sit = await generateSituation({ title, who: who.trim() || undefined, tension: tension.trim() || undefined, medium });
      setPreview(sit);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function start() {
    if (!preview) return;
    app.addCustomSit(preview);
    onStart(preview);
  }

  const ready = text.trim().length >= 2;

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col">
      <header className="fixed top-0 right-0 left-0 z-40 flex items-center px-4 md:px-8 h-16 bg-surface/80 backdrop-blur-md border-b border-border-light">
        <button onClick={back} className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="ml-4 font-headline-md text-headline-md text-primary">내 상황 만들기</h1>
        <div className="ml-auto"><ProfileChip name={app.profile?.name || app.profile?.role} /></div>
      </header>

      <main className="pt-24 pb-12 px-4 md:px-8 w-full max-w-2xl mx-auto flex flex-col gap-6">
        {preview ? (
          <>
            <div>
              <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-1">이렇게 훈련해볼까요?</h2>
              <p className="font-body-md text-on-surface-variant">코치가 상대와 어려운 지점을 정리했어요. 마음에 들면 시작하세요.</p>
            </div>

            {/* 미리보기는 픽커 카드와 같은 모양이다 — 내가 쓴 것이 어떤 훈련이 되는지 바로 읽히게 */}
            <div className="bg-white rounded-xl border border-border-light shadow-card p-5 flex flex-col gap-4" style={{ animation: "ob-pop 0.28s ease-out" }}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-chat-bg-user text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined">{preview.medium === "email" ? "mail" : "forum"}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-headline-md text-headline-md text-on-surface">{preview.title}</h3>
                    <span className="px-2.5 py-1 rounded-md font-label-sm bg-primary-fixed text-on-primary-fixed-variant whitespace-nowrap">
                      {preview.medium === "email" ? "메일 훈련" : "대화 훈련"}
                    </span>
                  </div>
                  <p className="font-body-md text-slate-muted">{preview.goal}</p>
                </div>
              </div>

              <dl className="border-t border-border-light pt-4 grid gap-3 text-sm">
                <div className="flex gap-3">
                  <dt className="font-label-sm text-outline w-16 shrink-0 pt-0.5">상대</dt>
                  <dd className="text-on-surface-variant flex-1">{preview.counterpart || preview.rel}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="font-label-sm text-outline w-16 shrink-0 pt-0.5">어려운 점</dt>
                  <dd className="text-on-surface-variant flex-1">{preview.tension}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="font-label-sm text-outline w-16 shrink-0 pt-0.5">핵심 축</dt>
                  <dd className="text-on-surface-variant flex-1">{preview.axis}</dd>
                </div>
              </dl>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={start} className="flex-1 py-3 rounded-lg bg-primary text-white font-bold shadow-pop hover:bg-surface-tint transition-colors">
                훈련 시작하기
              </button>
              <button onClick={() => setPreview(null)} className="py-3 px-5 rounded-lg border border-border-light text-on-surface-variant font-medium hover:bg-surface-container-low transition-colors">
                고쳐 쓰기
              </button>
            </div>
          </>
        ) : (
          <>
            <div>
              <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-1">어떤 상황이 어려우세요?</h2>
              <p className="font-body-md text-on-surface-variant">한 문장이면 충분해요. 상대와 채점 기준은 코치가 만듭니다.</p>
            </div>

            <div className="bg-white rounded-xl border border-border-light shadow-card p-4">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX))}
                rows={4}
                autoFocus
                placeholder="예: 다음 주에 팀장님께 휴가를 미리 말씀드려야 하는데, 눈치가 보여서 어떻게 꺼낼지 모르겠어요"
                className="w-full min-w-0 resize-none bg-transparent font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none"
              />
              <div className="flex items-center justify-between gap-3 border-t border-border-light pt-3 mt-2">
                <div className="flex gap-1 p-1 rounded-lg bg-surface-container-low">
                  {([["chat", "대화로"], ["email", "메일로"]] as const).map(([k, label]) => (
                    <button
                      key={k}
                      onClick={() => setMedium(k)}
                      aria-pressed={medium === k}
                      className={
                        "px-3 py-1.5 rounded-md font-label-sm transition-colors " +
                        (medium === k ? "bg-white text-primary font-bold shadow-card" : "text-on-surface-variant hover:text-on-surface")
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <span className="font-label-sm text-outline tabular-nums shrink-0">{text.length}/{MAX}</span>
              </div>
            </div>

            <details className="group">
              <summary className="flex items-center gap-1.5 cursor-pointer font-label-sm text-on-surface-variant hover:text-primary transition-colors list-none w-fit">
                <span className="material-symbols-outlined text-[16px] transition-transform group-open:rotate-90">chevron_right</span>
                상대나 걱정되는 점을 더 알려주기
              </summary>
              <div className="mt-3 flex flex-col gap-3">
                <input
                  value={who}
                  onChange={(e) => setWho(e.target.value)}
                  placeholder="상대는 어떤 사람인가요? (예: 원칙을 중시하는 40대 팀장)"
                  className="w-full min-w-0 bg-white rounded-lg border border-border-light px-4 py-3 font-body-md text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  value={tension}
                  onChange={(e) => setTension(e.target.value)}
                  placeholder="무엇이 가장 걱정되나요? (예: 무책임해 보일까 봐)"
                  className="w-full min-w-0 bg-white rounded-lg border border-border-light px-4 py-3 font-body-md text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </details>

            <button
              onClick={() => fileRef.current?.click()}
              disabled={captureBusy}
              className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-border-light text-left hover:border-primary/40 hover:bg-surface-container-low transition-colors disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-slate-muted">{captureBusy ? "progress_activity" : "add_photo_alternate"}</span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-on-surface">{captureBusy ? "캡처를 읽는 중…" : "대화 캡처로 채우기"}</span>
                <span className="block font-label-sm text-outline">카톡 캡처를 올리면 상황을 대신 적어드려요. 이름·번호는 지웁니다.</span>
              </span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={onCaptureFile} className="hidden" />

            {error && (
              <div className="flex items-start gap-2 p-4 rounded-xl bg-error-container/40 border border-error/20">
                <span className="material-symbols-outlined text-error text-[20px]">error</span>
                <p className="text-sm text-on-error-container">{error}</p>
              </div>
            )}

            <button
              onClick={build}
              disabled={!ready || busy}
              className="w-full py-3 rounded-lg bg-primary text-white font-bold shadow-pop hover:bg-surface-tint transition-colors disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
            >
              {busy ? (
                <><span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span> 상황을 만드는 중…</>
              ) : (
                "상황 만들기"
              )}
            </button>
          </>
        )}
      </main>
    </div>
  );
}
