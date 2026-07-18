'use client';
export function LiveStatus({ children, assertive = false }: { children: React.ReactNode; assertive?: boolean }) { return <div role={assertive ? 'alert' : 'status'} aria-live={assertive ? 'assertive' : 'polite'} aria-atomic="true">{children}</div>; }
