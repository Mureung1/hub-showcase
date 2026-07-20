import React from 'react';

/* Letter&Co line icons — stroke 1.5px round caps, detail lines at 70% weight.
   Motif vocabulary only: flower · leaf · vine · seed · sprout · envelope · postcard · check · mailbox (§4). */

const detail = { strokeWidth: 1.05 };

const GLYPHS = {
  leaf: (filled) => (
    <g>
      <path d="M5 19C5 11.5 11 5.5 19.5 4.5C18.5 13.5 12.5 19.5 5 19Z" fill={filled ? 'var(--wedgwood-pale)' : 'none'} />
      <path d="M6 18C9.5 13.5 13.5 9 17.5 5.8" {...detail} />
    </g>
  ),
  flower: (filled) => (
    <g>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="12" cy="6.8" rx="2.5" ry="3.3" transform={`rotate(${a} 12 12)`} fill={filled ? 'var(--wedgwood-pale)' : 'none'} />
      ))}
      <circle cx="12" cy="12" r="2" fill={filled ? 'var(--wedgwood)' : 'none'} />
    </g>
  ),
  vine: (filled) => (
    <g>
      <path d="M4 20C8 16.5 6.5 11.5 10.5 9C14.5 6.5 14 4.5 16.5 3" />
      <path d="M16.5 3C19 3.5 19.8 5.8 18.2 7.2" {...detail} />
      <path d="M8 15C5.8 15 4.4 13.5 4.4 11.6C6.6 11.6 8 13 8 15Z" fill={filled ? 'var(--wedgwood-pale)' : 'none'} {...detail} />
      <path d="M12 8.4C12 6.4 13.4 5 15.2 5C15.2 7 13.9 8.4 12 8.4Z" fill={filled ? 'var(--wedgwood-pale)' : 'none'} {...detail} />
    </g>
  ),
  seed: (filled) => (
    <g>
      <path d="M12 4C16.5 8 17.5 13.5 12 20C6.5 13.5 7.5 8 12 4Z" fill={filled ? 'var(--wedgwood-pale)' : 'none'} />
      <path d="M12 8V16" {...detail} />
    </g>
  ),
  sprout: (filled) => (
    <g>
      <path d="M12 20.5V11" />
      <path d="M12 12.5C8.4 12.5 6 10 6 6.6C9.8 6.6 12 9 12 12.5Z" fill={filled ? 'var(--wedgwood-pale)' : 'none'} />
      <path d="M12 10.5C12 7.6 14 5.2 17.4 5.2C17.4 8.6 15 10.5 12 10.5Z" fill={filled ? 'var(--wedgwood-pale)' : 'none'} />
    </g>
  ),
  envelope: (filled) => (
    <g>
      <rect x="3" y="6" width="18" height="13" rx="2" fill={filled ? 'var(--wedgwood-pale)' : 'none'} />
      <path d="M3.5 7L12 13.5L20.5 7" />
    </g>
  ),
  postcard: (filled) => (
    <g>
      <rect x="3" y="5.5" width="18" height="13" rx="1.5" fill={filled ? 'var(--wedgwood-pale)' : 'none'} />
      <path d="M13.5 6.2V18" {...detail} />
      <path d="M5.5 10H10.5M5.5 13H10" {...detail} />
      <rect x="15.6" y="7.6" width="3.2" height="4" strokeDasharray="1.6 1.3" {...detail} />
    </g>
  ),
  check: () => <path d="M5 12.5L10 17.5L19 6.5" />,
  mailbox: (filled) => (
    <g>
      <path d="M4 15.5V11.5C4 9 6 7 8.5 7H15.5C18 7 20 9 20 11.5V15.5H4Z" fill={filled ? 'var(--wedgwood-pale)' : 'none'} />
      <path d="M9 15.5V21" />
      <path d="M15.5 7C16.8 8.1 17.5 9.7 17.5 11.5V15.5" {...detail} />
      <path d="M8 3.5H12V7" {...detail} />
    </g>
  ),
};

/** 24px stroke icons in the Letter&Co garden motif vocabulary. */
export function Icon({ name = 'leaf', size = 24, filled = false, color = 'var(--ink)', style, ...rest }) {
  const draw = GLYPHS[name] || GLYPHS.leaf;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }}
      aria-hidden="true"
      {...rest}
    >
      {draw(filled)}
    </svg>
  );
}
