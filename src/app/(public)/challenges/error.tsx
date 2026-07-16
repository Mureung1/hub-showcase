'use client';
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) { return <main><div className="glass card state" role="alert"><h2>챌린지를 불러오지 못했어요</h2><button className="button button-primary" onClick={reset}>다시 시도</button></div></main> }
