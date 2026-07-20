import { Module } from "@nestjs/common";
import { SupabaseModule } from "../supabase/supabase.module";
import { GitHubRepositoryClient } from "./github-repository.client";
import { RepositoryAnalysisController } from "./repository-analysis.controller";
import { RepositoryAnalysisPersistence } from "./repository-analysis.persistence";
import { RepositoryAnalysisService } from "./repository-analysis.service";
import {
  HttpTechnicalChallengeAiClient,
  TECHNICAL_CHALLENGE_AI_CLIENT,
} from "./technical-challenge.client";
import { TechnicalChallengeAnalyzer } from "./technical-challenge.analyzer";

@Module({
  imports: [SupabaseModule],
  controllers: [RepositoryAnalysisController],
  providers: [
    GitHubRepositoryClient,
    RepositoryAnalysisPersistence,
    RepositoryAnalysisService,
    HttpTechnicalChallengeAiClient,
    TechnicalChallengeAnalyzer,
    {
      provide: TECHNICAL_CHALLENGE_AI_CLIENT,
      useExisting: HttpTechnicalChallengeAiClient,
    },
  ],
})
export class RepositoryAnalysisModule {}
