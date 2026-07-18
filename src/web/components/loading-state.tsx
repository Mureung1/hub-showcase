export function LoadingState({ label = '불러오는 중' }: { label?: string }) { return <div className="glass card state" role="status" aria-live="polite"><p className="status">{label}…</p></div> }
