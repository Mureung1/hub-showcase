-- 008_naver_shopping_real_products.sql에서 제품명을 실제 판매 중인 상품명으로 바꿨지만,
-- 이름에 새로 포함된 성분(마그네슘, 칼슘)이 product_ingredients에는 연결되지 않아
-- 성분 중복 체크 시 제품명 검색과 실제 연결된 성분이 어긋나는 문제가 있었음.
-- 실제 상품명이 언급하는 성분을 그럴듯한 목업 함량으로 추가해 이름과 데이터를 일치시킴.

INSERT INTO product_ingredients (product_id, ingredient_id, amount_mg)
SELECT p.id, i.id, x.amount_mg
FROM products p
JOIN (VALUES
  ('오마비 알티지 오메가3 마그네슘 멀티비타민B', '마그네슘', 100),
  ('GNM 칼슘 마그네슘 아연 비타민D', '칼슘', 300),
  ('GNM 칼슘 마그네슘 아연 비타민D', '마그네슘', 100)
) AS x(product_name, ingredient_name, amount_mg) ON x.product_name = p.name
JOIN ingredients i ON i.name = x.ingredient_name;
