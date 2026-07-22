import { Module } from "@nestjs/common";
import { SupabaseModule } from "../supabase/supabase.module";
import { GitHubRepositoryClient } from "./infrastructure/github/github-repository.client";
import { RepositoryAnalysisController } from "./presentation/repository-analysis.controller";
import { RepositoryAnalysisPersistence } from "./infrastructure/persistence/repository-analysis.persistence";
import { RepositoryAnalysisService } from "./application/repository-analysis.service";
import {
  HttpTechnicalChallengeAiClient,
  TECHNICAL_CHALLENGE_AI_CLIENT,
} from "./infrastructure/ai/technical-challenge.client";
import { TechnicalChallengeAnalyzer } from "./application/technical-challenge/technical-challenge.analyzer";

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
