// LLM 응답 텍스트(가끔 ```json 코드펜스로 감싸져서 옴)를 정리해서 JSON 객체로 변환한다.
export function parseLLMResponse(responseText) {
  const cleaned = responseText.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}