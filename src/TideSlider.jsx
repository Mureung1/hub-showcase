import { useId } from 'react';

// Figma 스펙: 트랙과 봉우리가 하나의 닫힌 path(wavePath)다. 이 path를 3번
// 복제해서 blur 강도(sharp/mid/soft)와 세로 방향 mask만 다르게 적용해
// "봉우리 위쪽만 선명하고 아래로 갈수록 안개처럼 번지는" progressive blur를
// 만든다. 색도 봉우리(cx) 근처만 진하고 트랙 양 끝은 연해지는 가로 그라데이션.
const WIDTH = 340;
const VIEW_HEIGHT = 116;
const WAVE_HALF_WIDTH = 68;
const TRACK_TOP = 38;
const TRACK_BOTTOM = 40;

function createWavePath(width, cx) {
  return `
    M 0 ${TRACK_TOP}
    L ${cx - WAVE_HALF_WIDTH} ${TRACK_TOP}

    C ${cx - 54} ${TRACK_TOP}
      ${cx - 47} 28
      ${cx - 22} 25

    C ${cx - 10} 23
      ${cx + 8} 23
      ${cx + 20} 25

    C ${cx + 44} 28
      ${cx + 54} ${TRACK_TOP}
      ${cx + WAVE_HALF_WIDTH} ${TRACK_TOP}

    L ${width} ${TRACK_TOP}
    L ${width} ${TRACK_BOTTOM}
    L ${cx + WAVE_HALF_WIDTH} ${TRACK_BOTTOM}

    C ${cx + 58} 48
      ${cx + 46} 70
      ${cx + 7} 82

    C ${cx - 42} 79
      ${cx - 59} 51
      ${cx - WAVE_HALF_WIDTH} ${TRACK_BOTTOM}

    L 0 ${TRACK_BOTTOM}
    Z
  `;
}

// 실제 마우스/터치/키보드 조작은 투명한 <input type="range">가 전담하고,
// SVG는 그 값을 그대로 따라 그리기만 하는 장식 레이어다.
function TideSlider({ value, onChange, min = 0, max = 100 }) {
  const uid = useId();
  const progress = (value - min) / (max - min);

  const minCenter = WAVE_HALF_WIDTH + 4;
  const maxCenter = WIDTH - WAVE_HALF_WIDTH - 4;
  const cx = minCenter + progress * (maxCenter - minCenter);
  const wavePath = createWavePath(WIDTH, cx);

  const sharpBlur = `${uid}-sharp-blur`;
  const midBlur = `${uid}-mid-blur`;
  const tideBlur = `${uid}-tide-blur`;
  const softBlur = `${uid}-soft-blur`;
  const sharpGradient = `${uid}-sharp-gradient`;
  const midGradient = `${uid}-mid-gradient`;
  const softGradient = `${uid}-soft-gradient`;
  const colorGradient = `${uid}-color-gradient`;
  const sharpMask = `${uid}-sharp-mask`;
  const midMask = `${uid}-mid-mask`;
  const softMask = `${uid}-soft-mask`;

  const maskX = -40;
  const maskY = -20;
  const maskWidth = WIDTH + 80;
  const maskHeight = 156;

  const waveFill = `url(#${colorGradient})`;

  return (
    <div className="tide-slider-wrap">
      <svg
        className="tide-slider-svg"
        viewBox={`0 0 ${WIDTH} ${VIEW_HEIGHT}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <filter id={sharpBlur} x="-20%" y="-30%" width="140%" height="180%">
            <feGaussianBlur stdDeviation="0.9" />
          </filter>
          <filter id={midBlur} x="-35%" y="-45%" width="170%" height="220%">
            <feGaussianBlur stdDeviation="5.5" />
          </filter>
          <filter id={tideBlur} x="-35%" y="-55%" width="170%" height="250%">
            <feGaussianBlur stdDeviation="2.5 10" />
          </filter>
          <filter id={softBlur} x="-60%" y="-75%" width="240%" height="330%">
            <feGaussianBlur stdDeviation="17 20" />
          </filter>

          {/* 가로 그라데이션 — 봉우리(cx) 근처만 진한 파랑, 트랙 양 끝은 연한 파랑 */}
          <linearGradient id={colorGradient} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={WIDTH} y2="0">
            <stop offset="0%" stopColor="#9ec5ff" stopOpacity="0.58" />
            <stop offset={`${Math.max(0, ((cx - 92) / WIDTH) * 100)}%`} stopColor="#82b5ff" stopOpacity="0.76" />
            <stop offset={`${(cx / WIDTH) * 100}%`} stopColor="#1a75ff" stopOpacity="1" />
            <stop offset={`${Math.min(100, ((cx + 92) / WIDTH) * 100)}%`} stopColor="#82b5ff" stopOpacity="0.76" />
            <stop offset="100%" stopColor="#9ec5ff" stopOpacity="0.58" />
          </linearGradient>

          {/* 세로 마스크 3종 — y좌표는 x2="100" 기준이라 0.31 = y:31과 동일 */}
          <linearGradient id={sharpGradient} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="100">
            <stop offset="0" stopColor="white" />
            <stop offset="0.30" stopColor="white" />
            <stop offset="0.42" stopColor="black" />
            <stop offset="1" stopColor="black" />
          </linearGradient>
          <linearGradient id={midGradient} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="100">
            <stop offset="0.16" stopColor="black" />
            <stop offset="0.30" stopColor="white" />
            <stop offset="0.43" stopColor="white" />
            <stop offset="0.68" stopColor="black" />
          </linearGradient>
          <linearGradient id={softGradient} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="100">
            <stop offset="0.20" stopColor="black" />
            <stop offset="0.34" stopColor="white" />
            <stop offset="0.72" stopColor="white" />
            <stop offset="1" stopColor="black" />
          </linearGradient>

          <mask id={sharpMask} maskUnits="userSpaceOnUse" x={maskX} y={maskY} width={maskWidth} height={maskHeight}>
            <rect x={maskX} y={maskY} width={maskWidth} height={maskHeight} fill={`url(#${sharpGradient})`} />
          </mask>
          <mask id={midMask} maskUnits="userSpaceOnUse" x={maskX} y={maskY} width={maskWidth} height={maskHeight}>
            <rect x={maskX} y={maskY} width={maskWidth} height={maskHeight} fill={`url(#${midGradient})`} />
          </mask>
          <mask id={softMask} maskUnits="userSpaceOnUse" x={maskX} y={maskY} width={maskWidth} height={maskHeight}>
            <rect x={maskX} y={maskY} width={maskWidth} height={maskHeight} fill={`url(#${softGradient})`} />
          </mask>
        </defs>

        {/* 가장 뒤: 아래로 넓게 퍼지는 안개 */}
        <path d={wavePath} fill={waveFill} filter={`url(#${softBlur})`} mask={`url(#${softMask})`} opacity="0.82" />
        {/* 수평선 전체와 봉우리 아래에 얇고 긴 물빛 띠를 만든다. */}
        <path d={wavePath} fill={waveFill} filter={`url(#${tideBlur})`} mask={`url(#${midMask})`} opacity="0.48" />
        {/* 중간: sharp와 soft를 이어주는 확산 */}
        <path d={wavePath} fill={waveFill} filter={`url(#${midBlur})`} mask={`url(#${midMask})`} opacity="0.62" />
        {/* 가장 앞: 봉우리 위쪽 + 트랙만 선명 */}
        <path d={wavePath} fill={waveFill} filter={`url(#${sharpBlur})`} mask={`url(#${sharpMask})`} opacity="1" />
      </svg>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="tide-slider-input"
      />
    </div>
  );
}

export default TideSlider;
