import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

@Injectable()
export class SupabaseClientService {
  readonly client: SupabaseClient;

  constructor(configService: ConfigService) {
    const url = configService.get<string>("SUPABASE_URL");
    const secretKey = configService.get<string>("SUPABASE_SECRET_KEY");

    if (!url) {
      throw new Error("SUPABASE_URL 환경 변수가 필요합니다.");
    }

    if (!secretKey) {
      throw new Error("SUPABASE_SECRET_KEY 환경 변수가 필요합니다.");
    }

    this.client = createClient(url, secretKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
  }
}
