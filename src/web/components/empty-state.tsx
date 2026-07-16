import Link from 'next/link';
export function EmptyState({ title, body, href = '/challenges' }: { title: string; body: string; href?: string }) { return <div className="glass card state"><h2>{title}</h2><p className="muted">{body}</p><Link className="button button-secondary" href={href}>챌린지 둘러보기</Link></div> }
