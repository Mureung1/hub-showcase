export const CATEGORIES = ['language', 'framework', 'database', 'infra'];

export const CLASSIFICATION_PROMPT_PREFIX =
  '다음은 JS/TS 프로젝트의 package.json/docker-compose.yml에서 뽑은 의존성 이름 목록이다. ' +
  '각 이름을 language/framework/database/infra 중 하나로 분류하거나, 린터·테스트 러너·빌드 보조 도구처럼 ' +
  '어느 카테고리에도 해당하지 않으면 "none"으로 분류해라.\n\n';

export const CLASSIFICATION_JSON_SCHEMA = {
  type: 'object',
  properties: {
    classifications: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          category: { type: 'string', enum: [...CATEGORIES, 'none'] },
        },
        required: ['name', 'category'],
        additionalProperties: false,
      },
    },
  },
  required: ['classifications'],
  additionalProperties: false,
};

export function emptyBuckets() {
  return { language: [], framework: [], database: [], infra: [] };
}

export function bucketsFromClassifications(classifications) {
  const buckets = emptyBuckets();
  for (const item of classifications || []) {
    if (CATEGORIES.includes(item.category)) {
      buckets[item.category].push(item.name);
    }
  }
  return buckets;
}
