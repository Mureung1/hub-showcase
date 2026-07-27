-- 두두 커스터마이징 온보딩(1차: 몸 색상 + 눈 개수)을 위한 컬럼 추가.
-- 이미 쓰고 있던 유저가 다음 로그인에 갑자기 온보딩 화면을 보지 않도록,
-- 기존 행은 이 마이그레이션 시점에 전부 완료 처리(onboardedAt = NOW())로 소급 반영한다.
-- 이후 새로 생성되는 행(신규 가입자)은 onboardedAt이 NULL로 시작해 온보딩 대상이 된다.
ALTER TABLE "DodoAppearance" ADD COLUMN "eyeCount" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "DodoAppearance" ADD COLUMN "onboardedAt" TIMESTAMP(3);

UPDATE "DodoAppearance" SET "onboardedAt" = NOW() WHERE "onboardedAt" IS NULL;
