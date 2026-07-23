// 네이버 검색 API가 썸네일을 안 줘서, 실제 이미지 소스가 생기기 전까지 쓰는 임시 대체 이미지
// article.id를 시드로 써서 같은 기사는 새로고침해도 항상 같은 사진이 나오게 한다
export function getArticleImageUrl(articleId, { width = 600, height = 400 } = {}) {
  return `https://picsum.photos/seed/${articleId}/${width}/${height}`;
}
