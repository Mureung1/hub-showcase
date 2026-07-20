/**
 * 인라인 SVG 아이콘 (lucide 경로 차용, 새 의존성 없이 CSP·오프라인 안전).
 * stroke: currentColor 이므로 부모 색(토큰)을 그대로 상속한다.
 * 사용: <Icon name="search" /> · <Icon name="star" size={18} />
 */

// 각 아이콘의 <path>/도형 조각 (viewBox 0 0 24 24, lucide 규격)
const PATHS = {
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  'arrow-right': (
    <>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </>
  ),
  star: <path d="M11.5 3.3a.6.6 0 0 1 1 0l2.2 4.5 4.9.7a.6.6 0 0 1 .3 1l-3.5 3.5.8 4.9a.6.6 0 0 1-.8.6L12 16.7l-4.4 2.3a.6.6 0 0 1-.8-.6l.8-4.9L4.1 10a.6.6 0 0 1 .3-1l4.9-.7z" />,
  refresh: (
    <>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </>
  ),
  history: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </>
  ),
  'layout-dashboard': (
    <>
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </>
  ),
  notebook: (
    <>
      <path d="M2 6h4" />
      <path d="M2 10h4" />
      <path d="M2 14h4" />
      <path d="M2 18h4" />
      <rect width="16" height="20" x="4" y="2" rx="2" />
      <path d="M16 2v20" />
    </>
  ),
  'notebook-pen': (
    <>
      <path d="M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4" />
      <path d="M2 6h4" />
      <path d="M2 10h4" />
      <path d="M2 14h4" />
      <path d="M2 18h4" />
      <path d="M18.4 2.6a2 2 0 0 1 3 3L16 11l-4 1 1-4z" />
    </>
  ),
  'list-checks': (
    <>
      <path d="m3 17 2 2 4-4" />
      <path d="m3 7 2 2 4-4" />
      <path d="M13 6h8" />
      <path d="M13 12h8" />
      <path d="M13 18h8" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </>
  ),
  mail: (
    <>
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </>
  ),
  lock: (
    <>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  eye: (
    <>
      <path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  'eye-off': (
    <>
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c4.6 0 8.58 2.9 9.94 7a10.7 10.7 0 0 1-1.6 3.1" />
      <path d="M6.6 6.6C4.4 7.9 2.8 9.8 2.06 12a10.75 10.75 0 0 0 15.34 5.4" />
      <path d="m9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m2 2 20 20" />
    </>
  ),
  settings: (
    <>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  discord: (
    <path d="M18.9 5.6A16.9 16.9 0 0 0 14.7 4.3a12 12 0 0 0-.54 1.1 15.7 15.7 0 0 0-4.32 0A12 12 0 0 0 9.3 4.3 16.9 16.9 0 0 0 5.1 5.6C2.4 9.6 1.67 13.5 2.03 17.3a17 17 0 0 0 5.2 2.6 12.6 12.6 0 0 0 1.1-1.8 11 11 0 0 1-1.75-.83l.43-.32a12.1 12.1 0 0 0 10.3 0l.43.32a11 11 0 0 1-1.75.84 12.6 12.6 0 0 0 1.1 1.8 17 17 0 0 0 5.2-2.61c.42-4.4-.72-8.27-3.1-11.7zM8.9 15c-1 0-1.87-.94-1.87-2.1S7.87 10.8 8.9 10.8s1.9.95 1.87 2.1c0 1.16-.84 2.1-1.87 2.1zm6.2 0c-1.03 0-1.87-.94-1.87-2.1s.83-2.1 1.87-2.1 1.9.95 1.87 2.1c0 1.16-.83 2.1-1.87 2.1z" />
  ),
  user: (
    <>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
}

export default function Icon({ name, size = 18, className, ...rest }) {
  const shape = PATHS[name]
  if (!shape) return null
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {shape}
    </svg>
  )
}
