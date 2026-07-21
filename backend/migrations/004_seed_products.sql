-- 제품 목업 데이터 (기업 규모는 저장하지 않음 — 성분/품질 기준으로만 추천하기 위함)
INSERT INTO products (name, company_name, price, haccp_certified, test_report_url, smartstore_url) VALUES
  ('그린랩 마그네슘 350', '그린랩', 18900, TRUE, 'https://example.com/test-report/greenlab-mg', 'https://smartstore.naver.com/greenlab/products/1'),
  ('데일리케어 비타민B컴플렉스', '데일리케어', 12900, FALSE, NULL, 'https://smartstore.naver.com/dailycare/products/1'),
  ('헬스원 멀티비타민', '헬스원', 22900, TRUE, 'https://example.com/test-report/healthone-multi', 'https://smartstore.naver.com/healthone/products/1'),
  ('굿바이오 프로바이오틱스', '굿바이오', 29900, TRUE, 'https://example.com/test-report/goodbio-probiotics', 'https://smartstore.naver.com/goodbio/products/1'),
  ('아이케어 루테인 플러스', '아이케어', 19900, FALSE, NULL, 'https://smartstore.naver.com/eyecare/products/1'),
  ('오메가라이프 오메가3 1000', '오메가라이프', 25900, TRUE, 'https://example.com/test-report/omegalife-omega3', 'https://smartstore.naver.com/omegalife/products/1'),
  ('스킨플러스 콜라겐', '스킨플러스', 27900, TRUE, 'https://example.com/test-report/skinplus-collagen', 'https://smartstore.naver.com/skinplus/products/1'),
  ('이뮨가드 아연플러스D', '이뮨가드', 16900, FALSE, NULL, 'https://smartstore.naver.com/immuneguard/products/1'),
  ('슬립웰 마그네슘나이트', '슬립웰', 15900, TRUE, 'https://example.com/test-report/sleepwell-mg', 'https://smartstore.naver.com/sleepwell/products/1'),
  ('비타디 선샤인', '선샤인헬스', 13900, TRUE, 'https://example.com/test-report/sunshine-vitd', 'https://smartstore.naver.com/sunshinehealth/products/1'),
  ('장케어 유산균골드', '장케어', 21900, FALSE, NULL, 'https://smartstore.naver.com/gutcare/products/1'),
  ('관절튼튼 오메가+콜라겐', '조인트케어', 32900, TRUE, 'https://example.com/test-report/jointcare-omega-collagen', 'https://smartstore.naver.com/jointcare/products/1');

-- 제품 ↔ 성분 연결 (함량 포함)
INSERT INTO product_ingredients (product_id, ingredient_id, amount_mg)
SELECT p.id, i.id, x.amount_mg
FROM products p
JOIN (VALUES
  ('그린랩 마그네슘 350', '마그네슘', 300),
  ('데일리케어 비타민B컴플렉스', '비타민 B군', 80),
  ('헬스원 멀티비타민', '비타민 B군', 50),
  ('헬스원 멀티비타민', '아연', 10),
  ('굿바이오 프로바이오틱스', '프로바이오틱스', NULL),
  ('아이케어 루테인 플러스', '루테인', 15),
  ('오메가라이프 오메가3 1000', '오메가3', 1000),
  ('스킨플러스 콜라겐', '콜라겐', 2000),
  ('이뮨가드 아연플러스D', '아연', 15),
  ('이뮨가드 아연플러스D', '비타민 D', 0.05),
  ('슬립웰 마그네슘나이트', '마그네슘', 200),
  ('비타디 선샤인', '비타민 D', 0.08),
  ('장케어 유산균골드', '프로바이오틱스', NULL),
  ('관절튼튼 오메가+콜라겐', '오메가3', 500),
  ('관절튼튼 오메가+콜라겐', '콜라겐', 1000)
) AS x(product_name, ingredient_name, amount_mg) ON x.product_name = p.name
JOIN ingredients i ON i.name = x.ingredient_name;
