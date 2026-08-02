import { StarIcon } from './icons.jsx';

// "운영자 PICK" 배지 — 리스트 카드/지도 팝업/좌측 브라우즈 리스트처럼 카드가 노출되는 곳마다
// bakery.isFeatured일 때만 붙는다. 트레이(선택함 목록)는 이름만 보여주기로 이미 정해둬서 여기엔 안 붙인다.
// 한줄코멘트(comment)가 있으면 "왜 추천하는지"를 네이티브 툴팁으로 보여준다.
export default function FeaturedBadge({ comment }) {
  return (
    <span className="featured-badge" title={comment || '운영자가 직접 가보고 추천하는 빵집이에요'}>
      <StarIcon style={{ width: 10, height: 10 }} />
      PICK
    </span>
  );
}
