// 마스코트 이미지 재사용 헬퍼. design.md 6번: 새로 그리지 말고 character.png / pointing.png만 쓴다.
// variant="pointing"은 사용자의 시선/행동을 특정 CTA로 유도하고 싶은 지점에서만 의도적으로 쓴다
// (지도 초기 안내, 마이페이지 로그인 유도) — 그 외에는 기본(서 있는) 포즈를 쓴다.
const SOURCES = {
  default: '/character.png',
  pointing: '/pointing.png',
};

export default function Mascot({ variant = 'default', className = 'mascot-icon', style, alt = '빵지도 캐릭터' }) {
  return <img src={SOURCES[variant]} alt={alt} className={className} style={style} draggable={false} />;
}
