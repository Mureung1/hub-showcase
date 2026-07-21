import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });
const conversation = "요즘 이직을 진지하게 고민 중이에요. 자신감이 좀 떨어졌어요.";


const prompt = `
다음 문장에서 고민 키워드(keyword)와 감정(emotion)을 뽑아서
JSON 형식으로만 응답해.

keyword는 "취업고민", "인간관계", "건강관리"처럼
넓은 범주의 명사+고민/관계/관리 형태로 만들어줘.

문장: "${conversation}"

응답 형식: { "keyword": "...", "emotion": "..." }
`;

const result = await model.generateContent(prompt);
console.log(result.response.text());