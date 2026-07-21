CREATE TABLE symptom_ingredients (
  id SERIAL PRIMARY KEY,
  symptom_id INTEGER NOT NULL REFERENCES symptoms(id),
  ingredient_id INTEGER NOT NULL REFERENCES ingredients(id)
);

-- 증상 → 추천 성분 매핑 규칙 (규칙 기반, 성분 설명(description)에 근거)
INSERT INTO symptom_ingredients (symptom_id, ingredient_id)
SELECT s.id, i.id FROM symptoms s, ingredients i
WHERE (s.name, i.name) IN (
  ('피로', '비타민 B군'), ('피로', '마그네슘'),
  ('소화불량', '프로바이오틱스'),
  ('수면장애', '마그네슘'),
  ('눈 피로', '루테인'),
  ('관절 통증', '오메가3'), ('관절 통증', '콜라겐'),
  ('스트레스', '마그네슘'), ('스트레스', '비타민 B군'),
  ('면역력 저하', '비타민 D'), ('면역력 저하', '아연'),
  ('피부 트러블', '아연'), ('피부 트러블', '콜라겐')
);
