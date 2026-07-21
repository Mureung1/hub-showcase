적용 순서
1. server.ts → 프로젝트 최상위 server.ts 덮어쓰기
2. src/types.ts → 기존 types.ts 덮어쓰기
3. src/data/productCatalog.ts 추가
4. src/components/OutfitsTab.tsx 덮어쓰기
5. public/products 폴더 전체 복사
6. 개발 서버를 완전히 종료한 뒤 npm run dev 재실행

상품 수: 상의 30, 하의 30, 신발 20, 액세서리 20 = 총 100개
외부 쇼핑 검색과 외부 이미지 URL을 사용하지 않습니다.
