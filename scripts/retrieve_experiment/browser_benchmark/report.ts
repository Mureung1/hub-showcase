export type BrowserBenchmarkReportInput = Readonly<{
  generatedAt: string;
  measurementContract: Readonly<Record<string, unknown>>;
  platforms: Readonly<Record<'android' | 'desktop', unknown>>;
}>;

export function renderBrowserBenchmarkReport(
  result: BrowserBenchmarkReportInput
): string {
  return [
    '# 브라우저 E5 벤치마크',
    '',
    '실제 브라우저에서 측정한 값만 기록합니다. Node 실행 수치로 대체하지 않습니다.',
    '',
    '## 측정 계약',
    '',
    '```json',
    JSON.stringify(result.measurementContract, null, 2),
    '```',
    '',
    '## 상세 관측값',
    '',
    '```json',
    JSON.stringify(result.platforms, null, 2),
    '```',
    '',
    '## 방법과 한계',
    '',
    '- Worker 생성부터 `pipeline` ready까지에는 Worker 모듈, ONNX WASM, 모델·tokenizer fetch와 초기화가 포함됩니다.',
    '- warm p50/p95는 고정 synthetic query 20회의 nearest-rank(`ceil(p*n)-1`)이며 모든 출력은 384차원·유한값을 검증합니다.',
    '- 메모리 peak는 단계 경계 최대 추정치일 뿐 연속 peak가 아닙니다. 관측 실패와 시간 초과는 결과 JSON의 limitation에 그대로 기록합니다.',
    '- WebGPU 지원 여부와 실제 실행 backend는 별도로 기록하며 실제 backend는 고정 WASM입니다.',
    '',
  ].join('\n');
}
