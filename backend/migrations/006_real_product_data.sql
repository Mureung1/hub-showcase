-- 목업 제품 3개를 실제 존재하는 제품(㈜제이에이치와이그룹 '공스킨' 브랜드)으로 교체
-- 가격/인증 정보는 공스킨 자사몰(gongskin.co.kr) 제품 페이지 기준으로 확인한 실제 값
-- test_report_url은 공개된 실제 링크를 확인하지 못해 NULL로 둠 (가짜 example.com 링크 제거)

UPDATE products SET
  name = '공스킨 먹는 마그네슘',
  company_name = '(주)제이에이치와이그룹',
  price = 2500,
  haccp_certified = TRUE,
  test_report_url = NULL,
  smartstore_url = 'https://smartstore.naver.com/gongskin'
WHERE name = '그린랩 마그네슘 350';

UPDATE products SET
  name = '공스킨 유산균 프로바이오틱스',
  company_name = '(주)제이에이치와이그룹',
  price = 2500,
  haccp_certified = TRUE,
  test_report_url = NULL,
  smartstore_url = 'https://smartstore.naver.com/gongskin'
WHERE name = '굿바이오 프로바이오틱스';

UPDATE products SET
  name = '공스킨 먹는 콜라겐',
  company_name = '(주)제이에이치와이그룹',
  price = 1900,
  haccp_certified = TRUE,
  test_report_url = NULL,
  smartstore_url = 'https://smartstore.naver.com/gongskin'
WHERE name = '스킨플러스 콜라겐';
