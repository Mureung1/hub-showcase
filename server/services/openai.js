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

module.exports = { createEmbedding, describeCluster };
