// 썸네일·히어로·요일칩 도형에 쓰는 손그림 러프 SVG 필터. styles.css의 filter:url(#roughen) 참조 대상.
export default function RoughenFilter() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }}>
      <filter id="roughen" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="2" seed="7" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="4" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}
