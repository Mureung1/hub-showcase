import { useEffect, useRef, useState } from 'react';
import { Bookmark, BookOpen, NotebookPen } from 'lucide-react';

import { loginWithGoogle } from '@/lib/api';

let initializedGoogleClientId = null;
let activeCredentialHandler = null;
const renderedGoogleButtons = new WeakSet();

function GoogleLoginButton({ onCredential }) {
  const buttonRef = useRef(null);
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return undefined;
    const handleCredential = ({ credential }) => activeCredentialHandler?.(credential);

    function initialize() {
      if (!window.google || !buttonRef.current) return;
      activeCredentialHandler = onCredentialRef.current;
      if (initializedGoogleClientId !== clientId) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredential,
        });
        initializedGoogleClientId = clientId;
      }
      if (!renderedGoogleButtons.has(buttonRef.current)) {
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width: 320,
        });
        renderedGoogleButtons.add(buttonRef.current);
      }
    }

    const script = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    initialize();
    script?.addEventListener('load', initialize);
    return () => {
      script?.removeEventListener('load', initialize);
      if (activeCredentialHandler === onCredentialRef.current) activeCredentialHandler = null;
    };
  }, []);

  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
    return <p className="field-error" role="alert">Google 로그인 설정이 필요해요.</p>;
  }
  return <div className="google-login-button" ref={buttonRef} />;
}

export function OnboardingPage({ onComplete }) {
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleCredential(credential) {
    setError('');
    setIsSaving(true);

    try {
      const user = await loginWithGoogle(credential);
      onComplete(user);
    } catch (requestError) {
      setError(requestError.message);
      setIsSaving(false);
    }
  }

  return (
    <main className="onboarding-page">
      <header className="onboarding-header" aria-label="잇장">
        <BookOpen aria-hidden="true" size={19} strokeWidth={1.8} />
        <span>잇장</span>
      </header>

      <section className="onboarding-content" aria-labelledby="onboarding-title">
        <div className="onboarding-copy">
          <p className="section-kicker">FIRST PAGE</p>
          <h1 id="onboarding-title">
            다시 펼칠 책을
            <br />
            한 권씩 모아봐요.
          </h1>
          <p className="onboarding-description">
            마지막 책갈피에서 다시 읽기를 시작해요.
            <br />
            읽은 자리에는 짧은 생각도 남길 수 있어요.
          </p>
          <p className="brand-origin">
            <strong>잇장</strong>은 읽은 장을 잇고, 다음 장으로 이어가는 나의 책장이에요.
          </p>
        </div>

        <div className="onboarding-form">
          <p className="field-help">Google 계정으로 내 책장과 글귀를 안전하게 이어가요.</p>
          {isSaving ? <p>잇장을 여는 중이에요…</p> : <GoogleLoginButton onCredential={handleCredential} />}
          {error && <p className="field-error" role="alert">{error}</p>}
        </div>
      </section>

      <aside className="onboarding-shelf" aria-label="비어 있는 첫 책장">
        <div className="onboarding-shelf__books" aria-hidden="true">
          <span className="shelf-book shelf-book--clay">첫 기록</span>
          <span className="shelf-book shelf-book--ink">다음 장</span>
          <span className="shelf-book shelf-book--linen" />
        </div>
        <p>첫 번째 책이 들어올 자리를 비워 두었어요.</p>
      </aside>

      <section className="onboarding-values" aria-labelledby="onboarding-values-title">
        <div className="onboarding-values__intro">
          <p className="section-kicker">WHAT YOU WILL KEEP</p>
          <h2 id="onboarding-values-title">한 번 읽고 끝나지 않는 독서</h2>
          <p>잇장은 읽은 시간보다, 다시 돌아온 자리와 그때의 생각을 소중히 모아요.</p>
        </div>
        <ul className="onboarding-values__list">
          <li>
            <Bookmark aria-hidden="true" size={20} strokeWidth={1.7} />
            <div>
              <h3>마지막 갈피에서 다시</h3>
              <p>읽다 멈춘 페이지를 기억해 두었다가, 다음에는 바로 그 다음 장을 열어요.</p>
            </div>
          </li>
          <li>
            <NotebookPen aria-hidden="true" size={20} strokeWidth={1.7} />
            <div>
              <h3>한 장씩 쌓이는 생각</h3>
              <p>끝낸 페이지와 짧은 감상을 남기면, 그날의 독서가 책 속 한 장의 기록이 돼요.</p>
            </div>
          </li>
          <li>
            <BookOpen aria-hidden="true" size={20} strokeWidth={1.7} />
            <div>
              <h3>나만의 읽기 흔적</h3>
              <p>채워지는 책장과 기록을 보며, 내 방식으로 이어 온 독서의 흐름을 돌아봐요.</p>
            </div>
          </li>
        </ul>
      </section>
    </main>
  );
}
