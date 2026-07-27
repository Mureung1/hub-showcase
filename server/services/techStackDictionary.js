/**
 * 05_CODE_SCANNER_SCORER.md 8장 "tech_stack 매핑 규칙" — 사전 우선 분류.
 *
 * 자주 쓰이는 라이브러리는 여기 하드코딩 사전으로 즉시 분류한다. eslint/vitest/
 * jsdom 같은 순수 개발 도구(린터/테스트 러너/빌드 보조)는 language/framework/
 * database/infra 어디에도 해당하지 않으므로 EXCLUDED로 명시해 출력에서 제외한다.
 * 사전에도 EXCLUDED에도 없는 이름만 LLM 분류 대상(미분류)이 된다.
 */

const FRAMEWORK_MAP = {
  express: 'framework',
  react: 'framework',
  'react-dom': 'framework',
  vite: 'framework',
  next: 'framework',
  nextjs: 'framework',
  vue: 'framework',
  nuxt: 'framework',
  angular: 'framework',
  svelte: 'framework',
  koa: 'framework',
  fastify: 'framework',
  nestjs: 'framework',
  '@nestjs/core': 'framework',
  tailwindcss: 'framework',
  graphql: 'framework',
  apollo: 'framework',
  '@apollo/server': 'framework',
};

const DATABASE_MAP = {
  pg: 'database',
  postgres: 'database',
  postgresql: 'database',
  mysql: 'database',
  mysql2: 'database',
  mongodb: 'database',
  mongoose: 'database',
  sequelize: 'database',
  prisma: 'database',
  sqlite: 'database',
  sqlite3: 'database',
  redis: 'database',
};

const INFRA_MAP = {
  dotenv: 'infra',
  cors: 'infra',
  docker: 'infra',
  nginx: 'infra',
  'aws-sdk': 'infra',
  firebase: 'infra',
  supabase: 'infra',
  'socket.io': 'infra',
};

const EXCLUDED = new Set([
  'eslint',
  'vitest',
  'jsdom',
  'postcss',
  'autoprefixer',
  '@testing-library/react',
  '@testing-library/jest-dom',
  '@vitejs/plugin-react',
  '@eslint/js',
  'eslint-plugin-react-hooks',
  'eslint-plugin-react-refresh',
  'globals',
  '@types/react',
  '@types/react-dom',
  'nodemon',
  'prettier',
  'jest',
  'mocha',
  'chai',
  'webpack',
  'babel',
  '@babel/core',
  'ts-node',
  'concurrently',
  'cross-env',
  'husky',
  'lint-staged',
]);

/**
 * 이름 하나를 사전에서 조회한다.
 * - null: 의도적으로 제외(순수 개발 도구 등)
 * - 문자열('framework' 등): 매칭된 카테고리
 * - undefined: 사전에 없음(LLM 분류 대상)
 */
export function lookupDictionary(name) {
  const lower = name.toLowerCase();
  if (EXCLUDED.has(lower)) return null;
  if (FRAMEWORK_MAP[lower]) return FRAMEWORK_MAP[lower];
  if (DATABASE_MAP[lower]) return DATABASE_MAP[lower];
  if (INFRA_MAP[lower]) return INFRA_MAP[lower];
  return undefined;
}
