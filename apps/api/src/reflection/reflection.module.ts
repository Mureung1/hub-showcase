import { Module } from "@nestjs/common";
import { SupabaseModule } from "../supabase/supabase.module";
import { ReflectionDraftController } from "./reflection.controller";
import { ReflectionDraftPersistence } from "./reflection.persistence";
import { ReflectionService } from "./reflection.service";

@Module({
  imports: [SupabaseModule],
  controllers: [ReflectionDraftController],
  providers: [ReflectionDraftPersistence, ReflectionService],
})
export class ReflectionModule {}
