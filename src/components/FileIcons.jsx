/**
 * 파일류 아이콘 — 이모지(📁🗂️📄) 대신 사용해 색상을 브랜드 블루로 통일한다.
 * tone="primary" → --color-primary 채움 (밝은 배경 위)
 * tone="white"   → 흰색 채움 (블루 배경 위)
 */
export function FolderIcon({ size = 16, tone = 'primary', className = '' }) {
  const fill = tone === 'white' ? '#FFFFFF' : 'var(--color-primary)';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 20"
      className={className}
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M2 4a2 2 0 0 1 2-2h5.2l2 2H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4Z"
        fill={fill}
      />
    </svg>
  );
}

export function DocumentIcon({ size = 16, tone = 'primary', className = '' }) {
  const fill = tone === 'white' ? '#FFFFFF' : 'var(--color-primary)';
  const stroke = tone === 'white' ? 'var(--color-primary)' : '#FFFFFF';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 24"
      className={className}
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M4 2h7l5 5v15a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" fill={fill} />
      <path d="M11 2v5h5" fill="none" stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
