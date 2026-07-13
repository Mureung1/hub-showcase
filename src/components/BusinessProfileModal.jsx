import { useState, useEffect } from "react";
import { X, Store } from "lucide-react";

const BUSINESS_TYPES = ["카페", "식당", "소품샵", "기타"];

export function BusinessProfileModal({ initialProfile, onSave, onClose }) {
  const [type, setType] = useState(initialProfile?.type || BUSINESS_TYPES[0]);
  const [name, setName] = useState(initialProfile?.name || "");
  const [description, setDescription] = useState(initialProfile?.description || "");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleSave = () => {
    onSave({ type, name: name.trim(), description: description.trim() });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md mx-4 bg-card border border-border rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <Store size={16} style={{ color: "var(--primary)" }} />
          <span className="text-sm font-medium">내 업장 정보</span>
          <button
            onClick={onClose}
            className="ml-auto p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            업장 정보를 등록해두면, 콘텐츠를 생성할 때마다 자동으로 반영돼요. 한 번만 입력하면 됩니다.
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">업종</label>
            <div className="grid grid-cols-4 gap-2">
              {BUSINESS_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`py-2 rounded-lg border text-xs transition-all ${
                    type === t
                      ? "text-foreground"
                      : "border-border text-muted-foreground hover:border-[rgba(255,255,255,0.14)]"
                  }`}
                  style={
                    type === t
                      ? { borderColor: "var(--primary)", background: "rgba(255,77,31,0.07)" }
                      : {}
                  }
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">업장 이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예) 우리동네 커피"
              maxLength={30}
              className="bg-input-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-[rgba(255,77,31,0.45)] transition-colors placeholder:text-muted-foreground/50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">한 줄 소개</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="예) 원두 직접 로스팅하는 동네 작은 카페, 단골 위주"
              maxLength={80}
              rows={2}
              className="bg-input-background border border-border rounded-lg px-3 py-2 text-sm outline-none resize-none focus:border-[rgba(255,77,31,0.45)] transition-colors placeholder:text-muted-foreground/50"
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm hover:bg-muted transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:opacity-90"
            style={{ background: "var(--primary)" }}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}