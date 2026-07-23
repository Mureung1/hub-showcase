// 환경변수 파싱 및 기본값 (설정값은 이 모듈을 통해서만 접근)
const config = {
    port: Number(process.env.PORT) || 3000,
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    githubToken: process.env.GITHUB_TOKEN || '',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
};

export default config;
