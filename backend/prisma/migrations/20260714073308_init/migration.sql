-- CreateTable
CREATE TABLE "analyses" (
    "id" UUID NOT NULL,
    "github_id" TEXT NOT NULL,
    "languages" JSONB NOT NULL,
    "skill_level" TEXT NOT NULL,
    "activity_summary" JSONB NOT NULL,
    "analyzed_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repo_cache" (
    "id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "description" TEXT,
    "primary_language" TEXT,
    "languages" TEXT[],
    "stars" INTEGER NOT NULL DEFAULT 0,
    "topics" TEXT[],
    "good_first_issue_count" INTEGER NOT NULL DEFAULT 0,
    "fetched_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repo_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issue_cache" (
    "id" UUID NOT NULL,
    "repo_full_name" TEXT NOT NULL,
    "issue_number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "labels" TEXT[],
    "difficulty" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "issue_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" UUID NOT NULL,
    "github_id" TEXT NOT NULL,
    "preferences" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_items" (
    "id" UUID NOT NULL,
    "recommendation_id" UUID NOT NULL,
    "repo_full_name" TEXT NOT NULL,
    "repo_description" TEXT,
    "repo_stars" INTEGER NOT NULL DEFAULT 0,
    "repo_url" TEXT NOT NULL,
    "primary_language" TEXT NOT NULL,
    "issue_number" INTEGER NOT NULL,
    "issue_title" TEXT NOT NULL,
    "issue_url" TEXT NOT NULL,
    "labels" TEXT[],
    "difficulty" TEXT NOT NULL,
    "match_score" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_usage" (
    "id" UUID NOT NULL,
    "token_key" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "analyses_github_id_key" ON "analyses"("github_id");

-- CreateIndex
CREATE UNIQUE INDEX "repo_cache_full_name_key" ON "repo_cache"("full_name");

-- CreateIndex
CREATE UNIQUE INDEX "issue_cache_repo_full_name_issue_number_key" ON "issue_cache"("repo_full_name", "issue_number");

-- CreateIndex
CREATE INDEX "recommendations_github_id_idx" ON "recommendations"("github_id");

-- CreateIndex
CREATE INDEX "recommendation_items_recommendation_id_idx" ON "recommendation_items"("recommendation_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_usage_token_key_date_key" ON "api_usage"("token_key", "date");

-- AddForeignKey
ALTER TABLE "recommendation_items" ADD CONSTRAINT "recommendation_items_recommendation_id_fkey" FOREIGN KEY ("recommendation_id") REFERENCES "recommendations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
