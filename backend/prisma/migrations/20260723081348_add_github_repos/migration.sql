-- CreateTable
CREATE TABLE "github_repos" (
    "id" TEXT NOT NULL,
    "githubId" INTEGER NOT NULL,
    "owner" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "forks" INTEGER NOT NULL DEFAULT 0,
    "openIssues" INTEGER NOT NULL DEFAULT 0,
    "language" TEXT,
    "readme" TEXT,
    "readmeHtml" TEXT,
    "summary" TEXT,
    "summaryBullets" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "license" TEXT,
    "homepageUrl" TEXT,
    "lastFetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "github_repos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_github_stars" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "repoId" TEXT NOT NULL,
    "starredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_github_stars_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "github_repos_githubId_key" ON "github_repos"("githubId");

-- CreateIndex
CREATE UNIQUE INDEX "github_repos_fullName_key" ON "github_repos"("fullName");

-- CreateIndex
CREATE INDEX "github_repos_stars_idx" ON "github_repos"("stars");

-- CreateIndex
CREATE INDEX "github_repos_language_idx" ON "github_repos"("language");

-- CreateIndex
CREATE INDEX "github_repos_lastFetchedAt_idx" ON "github_repos"("lastFetchedAt");

-- CreateIndex
CREATE INDEX "user_github_stars_userId_idx" ON "user_github_stars"("userId");

-- CreateIndex
CREATE INDEX "user_github_stars_repoId_idx" ON "user_github_stars"("repoId");

-- CreateIndex
CREATE UNIQUE INDEX "user_github_stars_userId_repoId_key" ON "user_github_stars"("userId", "repoId");

-- AddForeignKey
ALTER TABLE "user_github_stars" ADD CONSTRAINT "user_github_stars_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_github_stars" ADD CONSTRAINT "user_github_stars_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "github_repos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
