-- '비타민 B군'을 실제 KDRI 상한섭취량 기준 개별 성분으로 분리
BEGIN;

INSERT INTO ingredients (name, category, upper_limit_mg, description) VALUES
  ('니아신', '비타민', 35, '에너지 대사를 도와 피로 개선에 도움'),
  ('비타민 B6', '비타민', 100, '에너지 대사를 도와 피로 개선에 도움'),
  ('엽산', '비타민', 1, '세포 생성 및 에너지 대사에 관여');

-- 증상-성분 매핑: 기존 '비타민 B군'이 가리키던 증상(피로, 스트레스)을 니아신/비타민 B6에 동일 반영
INSERT INTO symptom_ingredients (symptom_id, ingredient_id)
SELECT s.id, i.id FROM symptoms s, ingredients i
WHERE (s.name, i.name) IN (
  ('피로', '니아신'), ('피로', '비타민 B6'),
  ('스트레스', '니아신'), ('스트레스', '비타민 B6')
);

-- 제품-성분 재매핑: '비타민 B군'을 참조하던 두 제품을 개별 성분으로 교체
INSERT INTO product_ingredients (product_id, ingredient_id, amount_mg)
SELECT p.id, i.id, x.amount_mg
FROM products p
JOIN (VALUES
  ('데일리케어 비타민B컴플렉스', '비타민 B6', 60),
  ('데일리케어 비타민B컴플렉스', '니아신', 20),
  ('헬스원 멀티비타민', '비타민 B6', 30),
  ('헬스원 멀티비타민', '니아신', 15),
  ('헬스원 멀티비타민', '엽산', 0.4)
) AS x(product_name, ingredient_name, amount_mg) ON x.product_name = p.name
JOIN ingredients i ON i.name = x.ingredient_name;

-- 사용자 진단 기록(diagnosis_ingredients)은 삭제 대신 니아신으로 재매핑 (기록 보존)
UPDATE diagnosis_ingredients
SET ingredient_id = (SELECT id FROM ingredients WHERE name = '니아신')
WHERE ingredient_id = (SELECT id FROM ingredients WHERE name = '비타민 B군');

-- 기존 '비타민 B군' 관련 행 정리 (재매핑 완료 후 안전하게 삭제)
DELETE FROM product_ingredients
WHERE ingredient_id = (SELECT id FROM ingredients WHERE name = '비타민 B군');

DELETE FROM symptom_ingredients
WHERE ingredient_id = (SELECT id FROM ingredients WHERE name = '비타민 B군');

DELETE FROM ingredients WHERE name = '비타민 B군';

COMMIT;
