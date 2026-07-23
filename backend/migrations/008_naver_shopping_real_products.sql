-- 남은 목업 제품 9개를 네이버 쇼핑검색 API로 확인한 실제 판매 중인 제품으로 교체
-- (업체명/가격/스마트스토어 링크는 실제 값, HACCP 인증 여부는 API가 안 줘서 false로 둠,
--  성분 함량(mg)은 구조화된 데이터가 없어 기존 목업 값 유지)

UPDATE products SET
  name = '캐나다산 비타민B 컴플렉스',
  company_name = '에코 뉴트리션',
  price = 19800,
  haccp_certified = FALSE,
  test_report_url = NULL,
  smartstore_url = 'https://smartstore.naver.com/main/products/5829484067'
WHERE name = '데일리케어 비타민B컴플렉스';

UPDATE products SET
  name = '올인원 멀티비타민 듀얼 이뮨 샷',
  company_name = '뉴트리 포유',
  price = 52900,
  haccp_certified = FALSE,
  test_report_url = NULL,
  smartstore_url = 'https://smartstore.naver.com/main/products/10532848731'
WHERE name = '헬스원 멀티비타민';

UPDATE products SET
  name = '종근당 눈 루테인 지아잔틴 아스타잔틴',
  company_name = '비타헬스',
  price = 28500,
  haccp_certified = FALSE,
  test_report_url = NULL,
  smartstore_url = 'https://smartstore.naver.com/main/products/11335082320'
WHERE name = '아이케어 루테인 플러스';

UPDATE products SET
  name = '오마비 알티지 오메가3 마그네슘 멀티비타민B',
  company_name = '트루엔',
  price = 62000,
  haccp_certified = FALSE,
  test_report_url = NULL,
  smartstore_url = 'https://smartstore.naver.com/main/products/7703581207'
WHERE name = '오메가라이프 오메가3 1000';

UPDATE products SET
  name = 'GNM 칼슘 마그네슘 아연 비타민D',
  company_name = 'GNM 자연의품격',
  price = 33900,
  haccp_certified = FALSE,
  test_report_url = NULL,
  smartstore_url = 'https://smartstore.naver.com/main/products/5579280566'
WHERE name = '이뮨가드 아연플러스D';

UPDATE products SET
  name = '테테셉트 밤에 먹는 마그네슘 나이트 500',
  company_name = '도이치직구몰',
  price = 17700,
  haccp_certified = FALSE,
  test_report_url = NULL,
  smartstore_url = 'https://smartstore.naver.com/main/products/12708566064'
WHERE name = '슬립웰 마그네슘나이트';

UPDATE products SET
  name = '더리얼 5000IU 비타민D3',
  company_name = 'Bonnywell',
  price = 19900,
  haccp_certified = FALSE,
  test_report_url = NULL,
  smartstore_url = 'https://smartstore.naver.com/main/products/5594065826'
WHERE name = '비타디 선샤인';

UPDATE products SET
  name = '종근당 락토핏 생유산균 골드',
  company_name = '뉴트라이트',
  price = 28700,
  haccp_certified = FALSE,
  test_report_url = NULL,
  smartstore_url = 'https://smartstore.naver.com/main/products/13447080129'
WHERE name = '장케어 유산균골드';

UPDATE products SET
  name = '한국야쿠르트 브이푸드 오메가3 저분자콜라겐',
  company_name = '호앤토',
  price = 98800,
  haccp_certified = FALSE,
  test_report_url = NULL,
  smartstore_url = 'https://smartstore.naver.com/main/products/13645568319'
WHERE name = '관절튼튼 오메가+콜라겐';
