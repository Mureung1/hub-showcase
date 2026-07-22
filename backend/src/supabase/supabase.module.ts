import { Global, Module } from '@nestjs/common'
import { supabaseClientProvider } from './supabase.provider'
import { SupabaseService } from './supabase.service'

@Global()
@Module({
  providers: [supabaseClientProvider, SupabaseService],
  exports: [SupabaseService],
})
export class SupabaseModule {}
