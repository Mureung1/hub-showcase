import React from 'react';

/** Crochet-doily scallop trim (§6): outer scallop + inner scallop at 60% + 2.4px eyelets,
    20px pattern unit repeating across the container width. Max ONE per screen. */
export function LaceTrim({ color = 'var(--line)', background = 'var(--cream)', height = 14, flip = false, style }) {
  const uid = React.useMemo(() => 'lace' + Math.random().toString(36).slice(2, 8), []);
  return (
    <svg
      width="100%"
      height={height}
      style={{ display: 'block', transform: flip ? 'scaleY(-1)' : 'none', ...style }}
      aria-hidden="true"
    >
      <defs>
        <pattern id={uid} patternUnits="userSpaceOnUse" width="20" height={height}>
          {/* outer scallop */}
          <path d={`M0 0 H20 A10 10 0 0 1 0 0 Z`} fill={color} />
          {/* inner scallop, 60% */}
          <path d={`M4 0 H16 A6 6 0 0 1 4 0 Z`} fill={background} />
          {/* eyelets at scallop junctions */}
          <circle cx="0" cy="2.4" r="1.2" fill={background} />
          <circle cx="20" cy="2.4" r="1.2" fill={background} />
        </pattern>
      </defs>
      <rect width="100%" height={height} fill={`url(#${uid})`} />
    </svg>
  );
}
