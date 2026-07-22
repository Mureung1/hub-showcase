-- smartstore.naver.com 개별 상품 URL을 확인할 수 없어(정책상 접근 불가),
-- 공스킨 자사몰(gongskin.co.kr)의 실제 해당 제품 상세 페이지로 교체
-- (스토어 대문이 아니라 그 제품 페이지로 바로 연결되도록)

UPDATE products SET smartstore_url = 'https://m.gongskin.co.kr/product/detail.html?product_no=4624'
WHERE name = '공스킨 먹는 마그네슘';

UPDATE products SET smartstore_url = 'https://m.gongskin.co.kr/product/detail.html?product_no=4600'
WHERE name = '공스킨 유산균 프로바이오틱스';

UPDATE products SET smartstore_url = 'https://m.gongskin.co.kr/product/detail.html?product_no=4599'
WHERE name = '공스킨 먹는 콜라겐';
