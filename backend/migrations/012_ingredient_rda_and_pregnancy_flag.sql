ALTER TABLE ingredient_upper_limits ADD COLUMN rda_mg NUMERIC;
ALTER TABLE ingredients ADD COLUMN pregnancy_caution BOOLEAN NOT NULL DEFAULT false;

-- 칼슘: 기존 4행에 권장섭취량 채우기 + 여성 50세 이상 구간(RDA만 다름) 추가
UPDATE ingredient_upper_limits SET rda_mg = 800
  WHERE ingredient_id = (SELECT id FROM ingredients WHERE name = '칼슘') AND gender = 'male';
UPDATE ingredient_upper_limits SET rda_mg = 650
  WHERE ingredient_id = (SELECT id FROM ingredients WHERE name = '칼슘') AND gender = 'female' AND min_age = 19;
UPDATE ingredient_upper_limits SET rda_mg = 650, max_age = 49
  WHERE ingredient_id = (SELECT id FROM ingredients WHERE name = '칼슘') AND gender = 'female' AND min_age = 30;
INSERT INTO ingredient_upper_limits (ingredient_id, gender, min_age, max_age, upper_limit_mg, rda_mg)
SELECT id, 'female', 50, NULL, 2000, 750 FROM ingredients WHERE name = '칼슘';

-- 철분 (UL 45mg 상수, RDA는 성별·폐경 여부로 크게 갈림)
INSERT INTO ingredient_upper_limits (ingredient_id, gender, min_age, max_age, upper_limit_mg, rda_mg)
SELECT id, 'male', 19, 74, 45, 8 FROM ingredients WHERE name = '철분'
UNION ALL SELECT id, 'male', 75, NULL, 45, 7 FROM ingredients WHERE name = '철분'
UNION ALL SELECT id, 'female', 19, 49, 45, 12 FROM ingredients WHERE name = '철분'
UNION ALL SELECT id, 'female', 50, NULL, 45, 7 FROM ingredients WHERE name = '철분';

-- 아연 (UL 35mg 상수, RDA는 65세부터 소폭 감소)
INSERT INTO ingredient_upper_limits (ingredient_id, gender, min_age, max_age, upper_limit_mg, rda_mg)
SELECT id, 'male', 19, 64, 35, 10 FROM ingredients WHERE name = '아연'
UNION ALL SELECT id, 'male', 65, NULL, 35, 9 FROM ingredients WHERE name = '아연'
UNION ALL SELECT id, 'female', 19, 64, 35, 8 FROM ingredients WHERE name = '아연'
UNION ALL SELECT id, 'female', 65, NULL, 35, 7 FROM ingredients WHERE name = '아연';

-- 니아신 (UL 35mg NE 상수, RDA는 65세부터 단계적으로 감소)
INSERT INTO ingredient_upper_limits (ingredient_id, gender, min_age, max_age, upper_limit_mg, rda_mg)
SELECT id, 'male', 19, 64, 35, 14 FROM ingredients WHERE name = '니아신'
UNION ALL SELECT id, 'male', 65, 74, 35, 13 FROM ingredients WHERE name = '니아신'
UNION ALL SELECT id, 'male', 75, NULL, 35, 12 FROM ingredients WHERE name = '니아신'
UNION ALL SELECT id, 'female', 19, 64, 35, 13 FROM ingredients WHERE name = '니아신'
UNION ALL SELECT id, 'female', 65, 74, 35, 12 FROM ingredients WHERE name = '니아신'
UNION ALL SELECT id, 'female', 75, NULL, 35, 11 FROM ingredients WHERE name = '니아신';

-- 비타민B6 (UL 100mg 상수, RDA는 성별로만 다르고 성인 전 연령 상수)
INSERT INTO ingredient_upper_limits (ingredient_id, gender, min_age, max_age, upper_limit_mg, rda_mg)
SELECT id, 'male', 19, NULL::integer, 100, 1.5 FROM ingredients WHERE name = '비타민 B6'
UNION ALL SELECT id, 'female', 19, NULL::integer, 100, 1.4 FROM ingredients WHERE name = '비타민 B6';

-- 엽산 (UL 1mg(=1,000μg) 상수, RDA 0.4mg(=400μg) 상수)
INSERT INTO ingredient_upper_limits (ingredient_id, gender, min_age, max_age, upper_limit_mg, rda_mg)
SELECT id, 'male', 19, NULL::integer, 1, 0.4 FROM ingredients WHERE name = '엽산'
UNION ALL SELECT id, 'female', 19, NULL::integer, 1, 0.4 FROM ingredients WHERE name = '엽산';

-- 비타민C (UL 2000mg 상수, RDA 100mg 상수)
INSERT INTO ingredient_upper_limits (ingredient_id, gender, min_age, max_age, upper_limit_mg, rda_mg)
SELECT id, 'male', 19, NULL::integer, 2000, 100 FROM ingredients WHERE name = '비타민 C'
UNION ALL SELECT id, 'female', 19, NULL::integer, 2000, 100 FROM ingredients WHERE name = '비타민 C';

-- 비타민D (UL 0.1mg(=100μg) 상수, RDA는 65세부터 증가, 성별무관)
INSERT INTO ingredient_upper_limits (ingredient_id, gender, min_age, max_age, upper_limit_mg, rda_mg)
SELECT id, 'male', 19, 64, 0.1, 0.01 FROM ingredients WHERE name = '비타민 D'
UNION ALL SELECT id, 'male', 65, NULL, 0.1, 0.015 FROM ingredients WHERE name = '비타민 D'
UNION ALL SELECT id, 'female', 19, 64, 0.1, 0.01 FROM ingredients WHERE name = '비타민 D'
UNION ALL SELECT id, 'female', 65, NULL, 0.1, 0.015 FROM ingredients WHERE name = '비타민 D';

-- 비타민A (UL 3mg(=3,000μg RAE) 상수, RDA는 성별·연령별로 갈림)
INSERT INTO ingredient_upper_limits (ingredient_id, gender, min_age, max_age, upper_limit_mg, rda_mg)
SELECT id, 'male', 19, 49, 3, 0.8 FROM ingredients WHERE name = '비타민 A'
UNION ALL SELECT id, 'male', 50, 64, 3, 0.75 FROM ingredients WHERE name = '비타민 A'
UNION ALL SELECT id, 'male', 65, NULL, 3, 0.7 FROM ingredients WHERE name = '비타민 A'
UNION ALL SELECT id, 'female', 19, 49, 3, 0.65 FROM ingredients WHERE name = '비타민 A'
UNION ALL SELECT id, 'female', 50, NULL, 3, 0.6 FROM ingredients WHERE name = '비타민 A';

-- 마그네슘 (UL 350mg 상수 - 식품 외 급원 기준, RDA는 남성만 30세부터 소폭 증가)
INSERT INTO ingredient_upper_limits (ingredient_id, gender, min_age, max_age, upper_limit_mg, rda_mg)
SELECT id, 'male', 19, 29, 350, 360 FROM ingredients WHERE name = '마그네슘'
UNION ALL SELECT id, 'male', 30, NULL, 350, 380 FROM ingredients WHERE name = '마그네슘'
UNION ALL SELECT id, 'female', 19, NULL, 350, 280 FROM ingredients WHERE name = '마그네슘';
