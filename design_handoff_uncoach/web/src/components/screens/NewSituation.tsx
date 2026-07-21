"use client";
import { useRef, useState } from "react";
import { useApp } from "@/lib/client/store";
import { generateSituation, extractCapture } from "@/lib/client/api";
import type { Situation } from "@/lib/domain/types";

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
  onStart,
  onCancel,
}: {
  onStart: (s: Situation) => void;
  onCancel: () => void;
}) {
  const app = useApp();
  const [title, setTitle] = useState("");
  const [who, setWho] = useState("");
  const [goal, setGoal] = useState("");
  const [tension, setTension] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Situation | null>(null);
  const [captureBusy, setCaptureBusy] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function onCaptureFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      setCaptureError("이미지 파일을 올려주세요.");
      return;
    }
    setCaptureBusy(true);
    setCaptureError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = async () => {
        const dataUrl = compressImage(img);
        const m = /^data:(image\/\w+);base64,(.+)$/.exec(dataUrl);
        if (!m) {
          setCaptureBusy(false);
          setCaptureError("이미지 형식을 인식하지 못했어요.");
          return;
        }
        try {
          const out = await extractCapture(m[2], m[1]);
          setTitle(out.title);
          setWho(out.rel ? `${out.who} (${out.rel})` : out.who);
          setGoal(out.goal);
          setTension(out.tension);
        } catch (err) {
          setCaptureError((err as Error).message);
        } finally {
          setCaptureBusy(false);
        }
      };
      img.onerror = () => {
        setCaptureBusy(false);
        setCaptureError("이미지를 읽지 못했어요.");
      };
      img.src = String(reader.result);
    };
    reader.onerror = () => {
      setCaptureBusy(false);
      setCaptureError("파일을 읽지 못했어요.");
    };
    reader.readAsDataURL(file);
  }

  async function design() {
    if (title.trim().length < 2) {
      setError("상황 제목을 입력해주세요.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const s = await generateSituation({ title: title.trim(), who, goal, tension });
      setPreview(s);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function saveAndStart() {
    if (!preview) return;
    app.addCustomSit(preview);
    onStart(preview);
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <button onClick={onCancel} className="rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold" style={{ background: "var(--surface)", borderColor: "var(--line)", color: "var(--sub)" }}>
          ← 뒤로
        </button>
        <h1 className="flex-1 text-xl font-extrabold">내 상황 만들기</h1>
      </div>
      <p className="mb-4 text-[13px]" style={{ color: "var(--sub)" }}>
        연습하고 싶은 상황을 적으면 AI가 관계·긴장·채점 기준을 설계해줍니다.
      </p>

      {!preview && (
        <div className="mb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onCaptureFile}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={captureBusy}
            className="w-full rounded-xl border border-dashed px-3.5 py-2.5 text-[13px] font-semibold"
            style={{ borderColor: "var(--line)", color: "var(--sub)", opacity: captureBusy ? 0.6 : 1 }}
          >
            {captureBusy ? "캡쳐에서 상황을 읽는 중…" : "📷 카톡 캡쳐로 채우기"}
          </button>
          <p className="mt-1.5 text-[11px]" style={{ color: "var(--sub)" }}>
            이미지는 저장되지 않지만, 인식을 위해 Gemini에 1회 전송됩니다. 상대 동의 없는 사적 대화는 주의하세요.
          </p>
          {captureError && (
            <div className="mt-2 rounded-lg px-3 py-2 text-[12.5px]" style={{ background: "var(--bad-soft)", color: "var(--bad)" }}>
              {captureError}
            </div>
          )}
        </div>
      )}

      {!preview && (
        <div className="flex flex-col gap-3">
          <Field label="상황 제목 *" value={title} onChange={setTitle} placeholder="예: 팀장님께 휴가 하루 당겨쓰기 요청" />
          <Field label="상대는 누구인가요?" value={who} onChange={setWho} placeholder="예: 깐깐한 직속 팀장" />
          <Field label="하고 싶은 말/목적" value={goal} onChange={setGoal} placeholder="예: 개인 사정으로 예정보다 하루 일찍 쉬고 싶다" />
          <Field label="어려운 점" value={tension} onChange={setTension} placeholder="예: 이기적으로 보일까 걱정된다" />
          {error && <div className="rounded-lg px-3 py-2 text-[12.5px]" style={{ background: "var(--bad-soft)", color: "var(--bad)" }}>{error}</div>}
          <button
            onClick={design}
            disabled={busy}
            className="rounded-xl py-3 text-[14.5px] font-bold"
            style={{ background: "var(--accent)", color: "var(--accent-ink)", opacity: busy ? 0.6 : 1 }}
          >
            {busy ? "AI가 설계 중…" : "AI로 상황 설계하기"}
          </button>
        </div>
      )}

      {preview && (
        <div>
          <div className="rounded-2xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
            <div className="mb-2 text-lg font-extrabold">{preview.title}</div>
            <PRow label="상대">{preview.counterpart}</PRow>
            <PRow label="목적">{preview.goal}</PRow>
            <PRow label="긴장 포인트">{preview.tension}</PRow>
            <PRow label="핵심 축">{preview.axis}</PRow>
            {preview.direction && (
              <div className="mt-3 rounded-lg p-3 text-[12.5px]" style={{ background: "var(--accent-soft)", color: "var(--ink)", lineHeight: 1.6 }}>
                <strong style={{ color: "var(--accent)" }}>&apos;적절&apos;의 방향</strong>
                <br />
                {preview.direction}
              </div>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={saveAndStart} className="flex-1 rounded-xl py-3 text-[14.5px] font-bold" style={{ background: "var(--good)", color: "#fff" }}>
              저장하고 훈련 시작
            </button>
            <button onClick={() => setPreview(null)} className="rounded-xl border px-4 py-3 text-[13.5px] font-semibold" style={{ background: "var(--surface)", borderColor: "var(--line)", color: "var(--sub)" }}>
              다시 설계
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[13px] font-bold">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border px-3.5 py-2.5 text-[14px] outline-none"
        style={{ background: "var(--bg)", borderColor: "var(--line)", color: "var(--ink)" }}
      />
    </label>
  );
}

function PRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 py-0.5 text-[13px]">
      <span className="shrink-0 font-semibold" style={{ color: "var(--sub)", minWidth: 60 }}>{label}</span>
      <span style={{ color: "var(--ink)" }}>{children}</span>
    </div>
  );
}
