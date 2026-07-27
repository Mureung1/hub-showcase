import OpenAI from 'openai';

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
  throw new Error(
    'GROQ_API_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.'
  );
}

// Groq는 OpenAI 호환 API라서 openai 패키지에 baseURL만 바꿔서 그대로 쓴다.
export const groq = new OpenAI({
  apiKey,
  baseURL: 'https://api.groq.com/openai/v1',
});
