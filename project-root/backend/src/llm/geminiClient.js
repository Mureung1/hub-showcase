require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('GEMINI_API_KEY가 .env에 설정되어 있지 않습니다.');
}

const gemini = new GoogleGenAI({ apiKey });

module.exports = gemini;
