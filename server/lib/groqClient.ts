import 'dotenv/config';
import Groq from 'groq-sdk';

function requireEnv(name: 'GROQ_API_KEY'): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[groqClient] 환경변수 ${name}이(가) 설정되지 않았습니다. .env 파일을 .env.example 기준으로 채워주세요.`,
    );
  }
  return value;
}

let cachedClient: Groq | null = null;

export function getGroqClient(): Groq {
  if (!cachedClient) {
    cachedClient = new Groq({ apiKey: requireEnv('GROQ_API_KEY') });
  }
  return cachedClient;
}
