CREATE TABLE "AnalysisResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readiness" INTEGER NOT NULL,
    "targetRole" TEXT NOT NULL,
    "fitLevel" TEXT NOT NULL,
    "portfolioLevel" TEXT NOT NULL,
    "burnoutLevel" TEXT NOT NULL,
    "strengths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "gaps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recommendations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rawResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalysisResult_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AnalysisResult_userId_createdAt_idx" ON "AnalysisResult"("userId", "createdAt");

ALTER TABLE "AnalysisResult" ADD CONSTRAINT "AnalysisResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
