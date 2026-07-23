# 브라우저 E5 벤치마크

실제 브라우저에서 측정한 값만 기록합니다. Node 실행 수치로 대체하지 않습니다.

| 항목 | Desktop Chrome 150.0.7871.181 | Android Chrome 148.0.7778.215 |
| --- | ---: | ---: |
| 실제 backend | WASM | WASM |
| cold load | 30,272.365ms | 65,525.245ms |
| cache load | 2,315.080ms | 11,694.190ms |
| cold 첫 query | 142.625ms | 1,108.960ms |
| cache 첫 query | 50.590ms | 515.955ms |
| cache warm p50 / p95 | 13.735 / 27.410ms | 55.505 / 116.780ms |
| Cache Storage delta | 159,017,472 bytes | 159,017,472 bytes |
| Worker 취소 뒤 cache 전체 실행 | 성공 | 성공 |
| `hidden → visible` 뒤 384차원 query | 성공 | 성공 |

## 자산과 런타임

- 고정 모델: `Xenova/multilingual-e5-small`
- 고정 revision: `761b726dd34fb83930e26aab4e9ac3899aa1fa78`
- 가중치: q8, 출력: 384차원 유한 벡터
- progress callback 최대 total: 모델 118,308,185 bytes, tokenizer 17,083,173 bytes, 기타 658 bytes
- ONNX WASM 파일 크기: `null`. callback에서 모델·tokenizer와 분리해 관측되지 않았으며 Node 파일 크기로 대체하지 않았습니다.
- Desktop: hardwareConcurrency 8, deviceMemory 32, `crossOriginIsolated=true`, `navigator.gpu` 지원. 로컬 측정 플래그 `--enable-blink-features=ForceEagerMeasureMemory`를 사용했습니다.
- Android: hardwareConcurrency 4, deviceMemory 2, `crossOriginIsolated=true`, `navigator.gpu` 지원. 실제 실행 backend는 WebGPU가 아닌 WASM입니다.

## 방법과 한계

cold는 같은 origin의 Transformers Cache Storage를 삭제하고 CDP HTTP cache를
비활성화·초기화한 뒤 Worker 생성부터 `pipeline` ready까지 측정했습니다. cache는
cold 성공 뒤 새 Worker에서 같은 구간을 측정했습니다. 따라서 Worker 모듈, ONNX
WASM, 모델·tokenizer fetch와 초기화 비용을 포함합니다. warm은 고정 synthetic
query 20회의 nearest-rank(`ceil(p*n)-1`)입니다.

`measureUserAgentSpecificMemory`는 Desktop eager 측정 플래그를 포함해 실제
호출에 실패했습니다. 따라서 baseline/load/first/warm 단계 경계의 bytes와
"단계 경계 최대 추정치"를 모두 `null`로 기록했고, 메모리 peak를 만들거나
연속 peak로 해석하지 않았습니다. 전체 원시 관측값과 각 단계의 limitation은
`browser_benchmark_result.json`에 UTF-8 JSON으로 보존했습니다.
