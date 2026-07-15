import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';

function requireEnv(name: 'ANTHROPIC_API_KEY'): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[anthropicClient] 환경변수 ${name}이(가) 설정되지 않았습니다. .env 파일을 .env.example 기준으로 채워주세요.`,
    );
  }
  return value;
}

let cachedClient: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!cachedClient) {
    cachedClient = new Anthropic({ apiKey: requireEnv('ANTHROPIC_API_KEY') });
  }
  return cachedClient;
}
