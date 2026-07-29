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
  const busy = status === "loading";

  if (mode === "guest") {
    return (
      <section className="guest-access guest-access--active" aria-label="게스트 보관 상태">
        <div>
          <strong>게스트 보관 모드</strong>
          <p>대화와 감정 기록을 서버에 30일간 보관합니다.</p>
        </div>
        {issuedKey && (
          <div className="guest-key-notice" role="status">
            <span>이 복구 키를 안전한 곳에 저장하세요. 다시 표시되지 않습니다.</span>
            <code>{issuedKey}</code>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(issuedKey)}
            >
              키 복사
            </button>
          </div>
        )}
        <button type="button" onClick={onUseAnonymous}>
          게스트에서 나가기
        </button>
      </section>
    );
  }

  return (
    <section className="guest-access" aria-label="기록 보관 방식">
      <div>
        <strong>익명 모드</strong>
        <p>현재 탭에만 저장되며 탭을 닫으면 기록이 사라집니다.</p>
      </div>
      <div className="guest-access__actions">
        <button type="button" onClick={onCreate} disabled={busy}>
          새 게스트 키 만들기
        </button>
        <form
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
      </div>
      {error && <p className="guest-access__error" role="alert">{error}</p>}
    </section>
  );
}
