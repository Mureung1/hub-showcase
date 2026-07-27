INSERT INTO symptoms (name) VALUES
  ('두통'),
  ('빈혈·어지러움'),
  ('탈모·모발 손상');

INSERT INTO symptom_ingredients (symptom_id, ingredient_id)
SELECT s.id, i.id FROM symptoms s, ingredients i
WHERE (s.name, i.name) IN (
  ('두통', '마그네슘'), ('두통', '니아신'),
  ('빈혈·어지러움', '철분'), ('빈혈·어지러움', '엽산'),
  ('탈모·모발 손상', '아연'), ('탈모·모발 손상', '비타민 B6')
);
