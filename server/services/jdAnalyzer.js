import { analyzeJD } from './llmClient.js';

export class JDAnalyzerError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/**
 * JD 텍스트를 JDMetadataSchema로 구조화한다.
 */
export function analyze(jdText) {
  if (!jdText || jdText.trim().length < 10) {
    throw new JDAnalyzerError('JD_TOO_SHORT', '채용공고 내용이 너무 짧습니다. 좀 더 자세히 입력해주세요.');
  }
  return analyzeJD(jdText);
}
