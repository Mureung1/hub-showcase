const OpenAI = require('openai');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const EMBEDDING_MODEL = 'text-embedding-3-small';
const CHAT_MODEL = 'gpt-4o-mini';

async function createEmbedding(text) {
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8000), // 토큰 한도 방어용 대략적인 길이 제한
  });
  return response.data[0].embedding;
}

async function describeCluster(titles) {
  const response = await client.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      {
        role: 'system',
        content:
          '너는 뉴스 큐레이션 서비스의 어시스턴트야. 아래 기사 제목들을 관통하는 시사 흐름을 간단한 이름과 2~3문장 설명으로 요약해줘. ' +
          '응답은 반드시 {"title": "...", "description": "..."} 형태의 JSON만 출력해.',
      },
      { role: 'user', content: titles.map((title, i) => `${i + 1}. ${title}`).join('\n') },
    ],
    response_format: { type: 'json_object' },
  });

  return JSON.parse(response.choices[0].message.content);
}

async function summarizeArticle(content) {
  const response = await client.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      {
        role: 'system',
        content: '너는 뉴스 기사를 요약해주는 어시스턴트야. 일반 성인 독자 수준으로, 핵심 맥락은 짚어주되 간결하게 3~5문장으로 요약해줘.',
      },
      { role: 'user', content: content.slice(0, 8000) }, // 토큰 한도 방어용 대략적인 길이 제한
    ],
  });

  return response.choices[0].message.content;
}

const SIMPLIFY_INSTRUCTION_BY_LEVEL = {
  easy:
    '이 분야를 전혀 모르는 사람도 이해할 수 있도록. ETF, 증시, 현물처럼 전문용어는 최대한 쓰지 말고 일상적인 말로 풀어 쓰고, ' +
    '꼭 써야 하는 용어가 있으면 바로 뒤에 괄호로 아주 짧게 설명을 붙여. 비유를 적극적으로 써도 좋음',
  medium: '일반 성인 독자 수준으로, 핵심 맥락은 짚어주되 간결하게',
};

// 요약이 아니라 원문 전체를 해당 난이도 수준으로 다시 써주는 함수 — 길이는 원문과 비슷하게 유지
async function simplifyArticle(content, level) {
  const response = await client.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      {
        role: 'system',
        content:
          `너는 뉴스 기사를 읽기 쉽게 다시 써주는 어시스턴트야. ${SIMPLIFY_INSTRUCTION_BY_LEVEL[level]} ` +
          '요약하지 말고, 원문에 담긴 내용을 빠짐없이 비슷한 분량으로 다시 써줘.',
      },
      { role: 'user', content: content.slice(0, 8000) }, // 토큰 한도 방어용 대략적인 길이 제한
    ],
  });

  return response.choices[0].message.content;
}

async function extractTerms(content) {
  const response = await client.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      {
        role: 'system',
        content:
          '너는 뉴스 기사에서 전문용어를 뽑아 설명해주는 어시스턴트야. 아래 기사 본문에서 일반 독자가 모를 만한 전문용어나 줄임말을 3~5개 골라서, ' +
          '각각 1~2문장으로 쉽게 설명해줘. 본문에 없는 용어를 지어내지 마. ' +
          '응답은 반드시 {"terms": [{"term": "...", "explanation": "..."}]} 형태의 JSON만 출력해.',
      },
      { role: 'user', content: content.slice(0, 8000) }, // 토큰 한도 방어용 대략적인 길이 제한
    ],
    response_format: { type: 'json_object' },
  });

  const parsed = JSON.parse(response.choices[0].message.content);
  return parsed.terms || [];
}

module.exports = { createEmbedding, describeCluster, summarizeArticle, simplifyArticle, extractTerms };
