import OpenAI from 'openai';
import {
  CLASSIFICATION_PROMPT_PREFIX,
  CLASSIFICATION_JSON_SCHEMA,
  emptyBuckets,
  bucketsFromClassifications,
} from './prompt.js';
import { buildCodeQuestionPrompt, CODE_QUESTION_JSON_SCHEMA } from './questionPrompt.js';

let cachedClient = null;
function getClient() {
  if (!cachedClient) cachedClient = new OpenAI();
  return cachedClient;
}

export async function classify(names) {
  try {
    const client = getClient();
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'user', content: CLASSIFICATION_PROMPT_PREFIX + names.join('\n') },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'tech_stack_classification',
          schema: CLASSIFICATION_JSON_SCHEMA,
          strict: true,
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return emptyBuckets();

    const parsed = JSON.parse(content);
    return bucketsFromClassifications(parsed.classifications);
  } catch (error) {
    console.error('[openaiProvider] classify 실패:', error.message);
    return emptyBuckets();
  }
}

export async function generateCodeQuestion({ file_path, score_reason, chunk }) {
  try {
    const client = getClient();
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'user', content: buildCodeQuestionPrompt({ file_path, score_reason, chunk }) },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'code_question',
          schema: CODE_QUESTION_JSON_SCHEMA,
          strict: true,
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    return parsed.question ? { question: parsed.question } : null;
  } catch (error) {
    console.error('[openaiProvider] generateCodeQuestion 실패:', error.message);
    return null;
  }
}
