import { Module } from "@nestjs/common";
import { SupabaseModule } from "../supabase/supabase.module";
import { GitHubRepositoryClient } from "./github-repository.client";
import { RepositoryAnalysisController } from "./repository-analysis.controller";
import { RepositoryAnalysisPersistence } from "./repository-analysis.persistence";
import { RepositoryAnalysisService } from "./repository-analysis.service";

@Module({
  imports: [SupabaseModule],
  controllers: [RepositoryAnalysisController],
  providers: [
    GitHubRepositoryClient,
    RepositoryAnalysisPersistence,
    RepositoryAnalysisService,
  ],
})
export class RepositoryAnalysisModule {}
