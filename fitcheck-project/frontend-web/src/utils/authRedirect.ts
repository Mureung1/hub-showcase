/**
 * OAuth 완료 후 Supabase가 돌려보낼 URL.
 * Vercel 등 배포 환경에서는 VITE_SITE_URL을 설정하는 것을 권장합니다.
 */
export function getAuthRedirectUrl(): string {
  const siteUrl = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim().replace(/\/$/, '');
  const origin =
    siteUrl ||
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173');
  return `${origin}/auth/callback`;
}

export function getSiteOrigin(): string {
  const siteUrl = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim().replace(/\/$/, '');
  if (siteUrl) return siteUrl;
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:5173';
}

/** 비밀번호 재설정 메일 링크 리다이렉트 URL */
export function getPasswordResetRedirectUrl(): string {
  return `${getSiteOrigin()}/reset-password`;
}
