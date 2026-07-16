-- CreateTable
CREATE TABLE "Letter" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL DEFAULT 'anon',
    "title" TEXT,
    "content" TEXT NOT NULL,
    "envelope" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Letter_pkey" PRIMARY KEY ("id")
);
