import { Module } from "@nestjs/common";
import { SupabaseModule } from "../supabase/supabase.module";
import { RepositoryAnalysisModule } from "../repository-analysis/repository-analysis.module";
import { ReflectionDraftController } from "./reflection.controller";
import { ReflectionDraftPersistence } from "./reflection.persistence";
import { ReflectionService } from "./reflection.service";
import { ReflectionAlignmentAnalyzer } from "./reflection.alignment";

@Module({
  imports: [SupabaseModule, RepositoryAnalysisModule],
  controllers: [ReflectionDraftController],
  providers: [ReflectionDraftPersistence, ReflectionService, ReflectionAlignmentAnalyzer],
})
export class ReflectionModule {}
