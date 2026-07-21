# 자체 상품 DB 적용 방법

1. `productCatalog.ts`를 프로젝트의 `src/data/productCatalog.ts`에 넣습니다.
2. 프로젝트의 `public` 폴더 안에 `products` 폴더를 만듭니다.
3. 아래 이름으로 상품 이미지를 넣습니다.

- top-001.jpg ~ top-005.jpg
- bottom-001.jpg ~ bottom-005.jpg
- shoes-001.jpg ~ shoes-005.jpg
- accessories-001.jpg ~ accessories-005.jpg

4. 이미지 파일은 직접 촬영한 사진, 직접 제작한 이미지, 또는 사용 허가가 명확한 무료 이미지를 사용합니다.
5. `server.ts`, `OutfitsTab.tsx`, `types.ts`를 연결하면 Gemini가 이 목록 안에서만 상품을 선택하도록 만들 수 있습니다.