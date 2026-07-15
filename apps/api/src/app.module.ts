import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthModule } from "./health/health.module";
import { RepositoryAnalysisModule } from "./repository-analysis/repository-analysis.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
    }),
    HealthModule,
    RepositoryAnalysisModule,
  ],
})
export class AppModule {}
