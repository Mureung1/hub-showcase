import React, { useState } from "react";

export default function GuestAccessPanel({
  mode,
  issuedKey,
  status,
  error,
  onCreate,
  onRecover,
  onUseAnonymous
}) {
  const [keyInput, setKeyInput] = useState("");
  const [selectedMode, setSelectedMode] = useState(
    mode === "guest" ? "guest" : "anonymous"
  );
  const [showRecovery, setShowRecovery] = useState(false);
  const busy = status === "loading";

  if (mode === "guest") {
    return (
      <section className="guest-access guest-access--active" aria-label="게스트 보관 상태">
        <span className="access-eyebrow">GUEST STORAGE</span>
        <h2>대화를 이어서 보관해요</h2>
        <p>복구 키가 있는 이 탭에서만 기록을 불러올 수 있어요.</p>
        {issuedKey && (
          <div className="guest-key-notice" role="status">
            <strong>복구 키가 만들어졌어요</strong>
            <code>{issuedKey}</code>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(issuedKey)}
            >
              키 복사
            </button>
            <span>지금 한 번만 표시돼요. 안전한 곳에 보관하세요.</span>
          </div>
        )}
        <button type="button" className="guest-access__quiet-action" onClick={onUseAnonymous}>
          게스트에서 나가기
        </button>
      </section>
    );
  }

  return (
    <section className="guest-access" aria-label="기록 보관 방식">
      <span className="access-eyebrow">START PRIVATE</span>
      <h2>대화를 시작할까요?</h2>
      <div className="access-mode-tabs" role="group" aria-label="대화 시작 방식">
        <button
          type="button"
          className={selectedMode === "anonymous" ? "active" : ""}
          aria-pressed={selectedMode === "anonymous"}
          onClick={() => {
            setSelectedMode("anonymous");
            setShowRecovery(false);
          }}
        >
          익명
        </button>
        <button
          type="button"
          className={selectedMode === "guest" ? "active" : ""}
          aria-pressed={selectedMode === "guest"}
          onClick={() => setSelectedMode("guest")}
        >
          게스트 보관
        </button>
      </div>

      {selectedMode === "anonymous" ? (
        <>
          <p>이 탭에서만 기록되고 창을 닫으면 모두 사라져요.</p>
          <button type="button" className="guest-access__primary" onClick={onUseAnonymous}>
            익명으로 시작
          </button>
          <button
            type="button"
            className="guest-access__link"
            onClick={() => {
              setSelectedMode("guest");
              setShowRecovery(true);
            }}
          >
            복구 키로 이어하기
          </button>
        </>
      ) : (
        <div className="guest-access__actions">
          <p>대화와 감정 기록을 서버에 30일간 보관해요.</p>
          <button
            type="button"
            className="guest-access__primary"
            onClick={onCreate}
            disabled={busy}
          >
            {busy ? "게스트 준비 중..." : "새 게스트 키 만들기"}
          </button>
          <button
            type="button"
            className="guest-access__link"
            onClick={() => setShowRecovery((current) => !current)}
            aria-expanded={showRecovery}
          >
            복구 키로 이어하기
          </button>
        </div>
      )}

      {selectedMode === "guest" && showRecovery && (
        <form
          className="guest-recovery-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (keyInput.trim()) void onRecover(keyInput);
          }}
        >
          <label htmlFor="guest-recovery-key">기존 게스트 키</label>
          <div>
            <input
              id="guest-recovery-key"
              value={keyInput}
              onChange={(event) => setKeyInput(event.target.value)}
              autoComplete="off"
              spellCheck="false"
              placeholder="XXXX-XXXX-..."
              disabled={busy}
            />
            <button type="submit" disabled={busy || !keyInput.trim()}>
              복구
            </button>
          </div>
        </form>
      )}
      {error && <p className="guest-access__error" role="alert">{error}</p>}
      <p className="guest-access__privacy">
        <span aria-hidden="true">◇</span> 키와 대화 기록은 분리해서 보호해요
      </p>
    </section>
  );
}
