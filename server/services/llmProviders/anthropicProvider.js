import Anthropic from '@anthropic-ai/sdk';
import {
  CLASSIFICATION_PROMPT_PREFIX,
  CLASSIFICATION_JSON_SCHEMA,
  emptyBuckets,
  bucketsFromClassifications,
} from './prompt.js';

let cachedClient = null;
function getClient() {
  if (!cachedClient) cachedClient = new Anthropic();
  return cachedClient;
}

export async function classify(names) {
  try {
    const client = getClient();
    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 2048,
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: CLASSIFICATION_JSON_SCHEMA },
      },
      messages: [
        { role: 'user', content: CLASSIFICATION_PROMPT_PREFIX + names.join('\n') },
      ],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock) return emptyBuckets();

    const parsed = JSON.parse(textBlock.text);
    return bucketsFromClassifications(parsed.classifications);
  } catch (error) {
    console.error('[anthropicProvider] classify 실패:', error.message);
    return emptyBuckets();
  }
}
