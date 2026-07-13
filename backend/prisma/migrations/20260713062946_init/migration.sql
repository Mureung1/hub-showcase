-- CreateEnum
CREATE TYPE "PostingCategory" AS ENUM ('COMPETITION', 'ACTIVITY', 'POLICY', 'CAMPUS_EVENT');

-- CreateEnum
CREATE TYPE "ParseStatus" AS ENUM ('CURATED', 'NEEDS_REVIEW', 'FAILED');

-- CreateEnum
CREATE TYPE "RawPostingStatus" AS ENUM ('RAW', 'PARSED', 'FAILED');

-- CreateEnum
CREATE TYPE "CalendarEventType" AS ENUM ('EXAM', 'PART_TIME', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "major" TEXT,
    "grade" INTEGER,
    "enrollmentStatus" TEXT,
    "residenceRegion" TEXT,
    "incomeBracket" INTEGER,
    "age" INTEGER,
    "interestTags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_postings" (
    "id" TEXT NOT NULL,
    "sourceSite" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "rawTitle" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "scrapedAt" TIMESTAMP(3) NOT NULL,
    "status" "RawPostingStatus" NOT NULL DEFAULT 'RAW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raw_postings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "postings" (
    "id" TEXT NOT NULL,
    "rawPostingId" TEXT,
    "category" "PostingCategory" NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "hostOrg" VARCHAR(200),
    "receptionStartDate" TIMESTAMP(3),
    "receptionEndDate" TIMESTAMP(3),
    "eventStartDate" TIMESTAMP(3),
    "eventEndDate" TIMESTAMP(3),
    "sourceUrl" VARCHAR(1000) NOT NULL,
    "parseStatus" "ParseStatus" NOT NULL DEFAULT 'CURATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "postings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eligibilities" (
    "id" TEXT NOT NULL,
    "postingId" TEXT NOT NULL,
    "majors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "regions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "grades" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "enrollmentStatuses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ageMin" INTEGER,
    "ageMax" INTEGER,
    "incomeMax" INTEGER,
    "gpaMin" DOUBLE PRECISION,
    "rawEligibilityText" TEXT NOT NULL,

    CONSTRAINT "eligibilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "type" "CalendarEventType" NOT NULL,
    "dtstart" TIMESTAMP(3) NOT NULL,
    "dtend" TIMESTAMP(3) NOT NULL,
    "relatedPostingId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scraps" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postingId" TEXT NOT NULL,
    "scrappedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifyEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "scraps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_userId_key" ON "user_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "raw_postings_sourceUrl_key" ON "raw_postings"("sourceUrl");

-- CreateIndex
CREATE INDEX "raw_postings_sourceSite_idx" ON "raw_postings"("sourceSite");

-- CreateIndex
CREATE INDEX "raw_postings_status_idx" ON "raw_postings"("status");

-- CreateIndex
CREATE UNIQUE INDEX "postings_rawPostingId_key" ON "postings"("rawPostingId");

-- CreateIndex
CREATE INDEX "postings_category_idx" ON "postings"("category");

-- CreateIndex
CREATE INDEX "postings_receptionEndDate_idx" ON "postings"("receptionEndDate");

-- CreateIndex
CREATE INDEX "postings_parseStatus_idx" ON "postings"("parseStatus");

-- CreateIndex
CREATE UNIQUE INDEX "eligibilities_postingId_key" ON "eligibilities"("postingId");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_events_uid_key" ON "calendar_events"("uid");

-- CreateIndex
CREATE INDEX "calendar_events_userId_idx" ON "calendar_events"("userId");

-- CreateIndex
CREATE INDEX "calendar_events_dtstart_dtend_idx" ON "calendar_events"("dtstart", "dtend");

-- CreateIndex
CREATE INDEX "scraps_userId_idx" ON "scraps"("userId");

-- CreateIndex
CREATE INDEX "scraps_postingId_idx" ON "scraps"("postingId");

-- CreateIndex
CREATE UNIQUE INDEX "scraps_userId_postingId_key" ON "scraps"("userId", "postingId");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postings" ADD CONSTRAINT "postings_rawPostingId_fkey" FOREIGN KEY ("rawPostingId") REFERENCES "raw_postings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eligibilities" ADD CONSTRAINT "eligibilities_postingId_fkey" FOREIGN KEY ("postingId") REFERENCES "postings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_relatedPostingId_fkey" FOREIGN KEY ("relatedPostingId") REFERENCES "postings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scraps" ADD CONSTRAINT "scraps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scraps" ADD CONSTRAINT "scraps_postingId_fkey" FOREIGN KEY ("postingId") REFERENCES "postings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
