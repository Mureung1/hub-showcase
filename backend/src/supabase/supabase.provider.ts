import type { Provider } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient } from '@supabase/supabase-js'
import type { Env } from '../config/env.schema'
import { SUPABASE_CLIENT } from './supabase.constants'

export const supabaseClientProvider: Provider = {
  provide: SUPABASE_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService<Env, true>) => {
    const url = configService.get('SUPABASE_URL', { infer: true })
    const serviceRoleKey = configService.get('SUPABASE_SERVICE_ROLE_KEY', { infer: true })

    return createClient(url, serviceRoleKey, {
      auth: { persistSession: false },
    })
  },
}
