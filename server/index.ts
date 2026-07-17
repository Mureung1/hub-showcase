import { createApp } from './app';
import { readSupabaseServerConfig } from './supabase_config';
import { createSupabaseInsightCaptureService } from './supabase_insight_capture';
import { createSupabaseInsightMemoService } from './supabase_insight_memo';

const port = Number(process.env.PORT ?? 3001);
const supabaseConfig = readSupabaseServerConfig(process.env);
const app = createApp({
  captureService: createSupabaseInsightCaptureService(supabaseConfig),
  memoService: createSupabaseInsightMemoService(supabaseConfig),
});

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});
