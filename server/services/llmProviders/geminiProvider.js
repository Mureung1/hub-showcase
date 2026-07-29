import { GoogleGenAI, Type } from '@google/genai';
import { CLASSIFICATION_PROMPT_PREFIX, emptyBuckets, bucketsFromClassifications } from './prompt.js';
import { buildCodeQuestionPrompt } from './questionPrompt.js';
import { GEMINI_MODEL } from '../../config.js';

const CODE_QUESTION_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    question: { type: Type.STRING },
  },
  required: ['question'],
};

const GEMINI_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    classifications: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          category: {
            type: Type.STRING,
            enum: ['language', 'framework', 'database', 'infra', 'none'],
          },
        },
        required: ['name', 'category'],
      },
    },
  },
  required: ['classifications'],
};

let cachedClient = null;
function getClient() {
  if (!cachedClient) cachedClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return cachedClient;
}

export async function classify(names) {
  try {
    const client = getClient();
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: CLASSIFICATION_PROMPT_PREFIX + names.join('\n'),
      config: {
        responseMimeType: 'application/json',
        responseSchema: GEMINI_RESPONSE_SCHEMA,
      },
    });

    const parsed = JSON.parse(response.text);
    return bucketsFromClassifications(parsed.classifications);
  } catch (error) {
    console.error('[geminiProvider] classify 실패:', error.message);
    return emptyBuckets();
  }
}

export async function generateCodeQuestion({ file_path, score_reason, chunk }) {
  try {
    const client = getClient();
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: buildCodeQuestionPrompt({ file_path, score_reason, chunk }),
      config: {
        responseMimeType: 'application/json',
        responseSchema: CODE_QUESTION_RESPONSE_SCHEMA,
      },
    });

    const parsed = JSON.parse(response.text);
    return parsed.question ? { question: parsed.question } : null;
  } catch (error) {
    console.error('[geminiProvider] generateCodeQuestion 실패:', error.message);
    return null;
  }
}
