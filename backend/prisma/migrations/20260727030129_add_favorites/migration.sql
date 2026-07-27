-- CreateTable
CREATE TABLE "favorites" (
    "id" UUID NOT NULL,
    "github_id" TEXT NOT NULL,
    "repo_full_name" TEXT NOT NULL,
    "issue_number" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "favorites_github_id_idx" ON "favorites"("github_id");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_github_id_repo_full_name_issue_number_key" ON "favorites"("github_id", "repo_full_name", "issue_number");
