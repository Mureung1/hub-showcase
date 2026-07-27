import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { validateEnv } from './config/env.schema'
import { HealthController } from './health/health.controller'
import { HealthService } from './health/health.service'
import { MarketModule } from './modules/market/market.module'
import { SupabaseModule } from './supabase/supabase.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    SupabaseModule,
    MarketModule,
  ],
  controllers: [HealthController],
  providers: [HealthService],
})
export class AppModule {}
