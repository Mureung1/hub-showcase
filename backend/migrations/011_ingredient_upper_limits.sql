CREATE TABLE ingredient_upper_limits (
  id SERIAL PRIMARY KEY,
  ingredient_id INTEGER NOT NULL REFERENCES ingredients(id),
  gender VARCHAR NOT NULL CHECK (gender IN ('male', 'female')),
  min_age INTEGER NOT NULL,
  max_age INTEGER,
  upper_limit_mg NUMERIC NOT NULL
);

-- 칼슘: 2025 한국인 영양소 섭취기준(KDRIs) 성인 상한섭취량
INSERT INTO ingredient_upper_limits (ingredient_id, gender, min_age, max_age, upper_limit_mg)
SELECT id, 'male', 19, 29, 3000 FROM ingredients WHERE name = '칼슘'
UNION ALL
SELECT id, 'male', 30, NULL, 2500 FROM ingredients WHERE name = '칼슘'
UNION ALL
SELECT id, 'female', 19, 29, 2500 FROM ingredients WHERE name = '칼슘'
UNION ALL
SELECT id, 'female', 30, NULL, 2000 FROM ingredients WHERE name = '칼슘';

-- 아연: 기존 40mg은 구 기준값, 2025 KDRIs 공식 상한섭취량 35mg으로 정정
UPDATE ingredients SET upper_limit_mg = 35 WHERE name = '아연';
