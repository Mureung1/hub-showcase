-- AlterTable
ALTER TABLE "Letter" ADD COLUMN     "isMatchable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "keywordsNorm" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "keywordsRaw" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "matchExposureCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "primaryEmotion" TEXT,
ADD COLUMN     "riskFlag" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "secondaryEmotions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "summary" TEXT,
ADD COLUMN     "taggingAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "taggingError" TEXT,
ADD COLUMN     "taggingModel" TEXT,
ADD COLUMN     "taggingPromptVersion" TEXT,
ADD COLUMN     "taggingRaw" JSONB,
ADD COLUMN     "taggingStatus" TEXT NOT NULL DEFAULT 'pending',
ALTER COLUMN "authorId" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "sourceLetterId" TEXT NOT NULL,
    "matchedLetterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'recommended',
    "candidateCount" INTEGER,
    "candidateSnapshot" JSONB,
    "matchPromptVersion" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "openedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Match_sourceLetterId_status_expiresAt_idx" ON "Match"("sourceLetterId", "status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Match_sourceLetterId_matchedLetterId_key" ON "Match"("sourceLetterId", "matchedLetterId");

-- CreateIndex
CREATE INDEX "Letter_taggingStatus_isMatchable_matchExposureCount_idx" ON "Letter"("taggingStatus", "isMatchable", "matchExposureCount");

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_sourceLetterId_fkey" FOREIGN KEY ("sourceLetterId") REFERENCES "Letter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_matchedLetterId_fkey" FOREIGN KEY ("matchedLetterId") REFERENCES "Letter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 아래는 Prisma DSL(@@index)로 표현할 수 없어 수기로 추가한 인덱스들이다.
-- (설계 근거: 계획서 17번 아키텍처 검토 참고)

-- CreateIndex (GIN)
-- keywordsNorm 배열 겹침(&&) 검색용. 지금은 감정 티어 필터가 임계경로라 당장 안 타지만
-- 향후 키워드 티어·synonyms 분석에 쓰인다.
CREATE INDEX "Letter_keywordsNorm_gin_idx" ON "Letter" USING GIN ("keywordsNorm");

-- CreateIndex (partial, primaryEmotion 선행)
-- 후보 조회(candidateFinder)의 핵심 인덱스. taggingStatus/isMatchable 같은 저-카디널리티
-- 불리언을 선행 컬럼으로 두면 안 걸러지므로, primaryEmotion을 선행으로 두고
-- done+matchable 조건을 부분 인덱스로 미리 필터링한다.
CREATE INDEX "Letter_candidate_lookup_idx"
  ON "Letter" ("primaryEmotion")
  WHERE "taggingStatus" = 'done' AND "isMatchable" = true;

-- CreateIndex (partial unique) — 동시성 가드
-- 한 source 편지에 active(recommended/opened) 상태의 match가 동시에 2개 이상 생기는 것을
-- DB 레벨에서 원천 차단한다. 동시 POST 요청 경쟁 상태의 최종 방어선.
CREATE UNIQUE INDEX "Match_one_active_per_source_idx"
  ON "Match" ("sourceLetterId")
  WHERE "status" IN ('recommended', 'opened');
