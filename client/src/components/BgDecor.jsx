// 앱 카드 뒤에서만 보이는 은은한 배경 블롭 장식. design.md 7번: 3개 고정, 새로 추가하지 않는다.
export default function BgDecor() {
  return (
    <div className="bg-decor" aria-hidden="true">
      <span className="blob blob-a" />
      <span className="blob blob-b" />
      <span className="blob blob-c" />
    </div>
  );
}
