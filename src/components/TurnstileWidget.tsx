import { useEffect, useRef } from "react";

const TURNSTILE_SCRIPT_ID = "modu-brain-turnstile-script";
const TURNSTILE_SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      language: string;
      theme: "light";
      appearance: "interaction-only";
      callback(token: string): void;
      "expired-callback"(): void;
      "error-callback"(): void;
    },
  ): string;
  remove(widgetId: string): void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

type TurnstileWidgetProps = {
  siteKey: string;
  resetKey: number;
  onTokenChange(token: string | null): void;
};

function TurnstileWidget({ siteKey, resetKey, onTokenChange }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!siteKey || !container) return undefined;
    let disposed = false;
    let widgetId: string | null = null;

    const renderWidget = () => {
      if (disposed || widgetId || !window.turnstile) return;
      widgetId = window.turnstile.render(container, {
        sitekey: siteKey,
        language: "ko",
        theme: "light",
        appearance: "interaction-only",
        callback: (token) => onTokenChange(token),
        "expired-callback": () => onTokenChange(null),
        "error-callback": () => onTokenChange(null),
      });
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      let script = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement("script");
        script.id = TURNSTILE_SCRIPT_ID;
        script.src = TURNSTILE_SCRIPT_URL;
        script.async = true;
        script.defer = true;
        document.head.append(script);
      }
      script.addEventListener("load", renderWidget, { once: true });
    }

    return () => {
      disposed = true;
      onTokenChange(null);
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
      container.replaceChildren();
    };
  }, [onTokenChange, resetKey, siteKey]);

  if (!siteKey) return null;
  return (
    <div className="turnstile-field">
      <div ref={containerRef} aria-label="사람인지 확인" />
      <p>자동 요청을 막기 위한 보안 확인입니다. 이메일 주소는 이 확인 서비스에 전달하지 않습니다.</p>
    </div>
  );
}

export default TurnstileWidget;
