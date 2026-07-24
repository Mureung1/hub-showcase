ALTER TABLE "task_events"
ADD COLUMN "entryMode" TEXT,
ADD COLUMN "generationSource" TEXT,
ADD COLUMN "memoryEvidence" JSONB;
