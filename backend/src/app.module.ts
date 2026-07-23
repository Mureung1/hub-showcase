import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { validateEnv } from './config/env.schema'
import { HealthController } from './health/health.controller'
import { HealthService } from './health/health.service'
import { SupabaseModule } from './supabase/supabase.module'

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }), SupabaseModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class AppModule {}
