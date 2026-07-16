'use client';
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <html lang="ko"><body><main><div className="glass card state" role="alert"><h1>화면을 복구하지 못했어요</h1><p>안전하게 다시 시도해 주세요.</p><button className="button button-primary" onClick={reset}>다시 시도</button></div></main></body></html> }
