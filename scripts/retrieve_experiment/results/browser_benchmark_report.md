# 브라우저 E5 벤치마크

실제 브라우저에서 측정한 값만 기록합니다. Node 실행 수치로 대체하지 않습니다.

## 측정 계약

```json
{
  "backend": "wasm",
  "cacheLoad": "cold 성공 뒤 새 Worker를 만들고 Transformers Cache Storage 적중 상태에서 Worker 생성부터 pipeline ready까지 측정했습니다.",
  "coldLoad": "같은 origin의 Cache Storage를 삭제하고 HTTP cache를 CDP로 비활성화·초기화한 뒤 Worker 생성부터 pipeline ready까지 측정했습니다.",
  "dimensions": 384,
  "memory": "peak는 단계 경계의 최대 추정치이며 연속 peak가 아닙니다. 지원 API가 없으면 null과 한계를 기록합니다.",
  "model": "Xenova/multilingual-e5-small",
  "revision": "761b726dd34fb83930e26aab4e9ac3899aa1fa78",
  "warmPercentile": "정렬 후 ceil(p*n)-1 nearest-rank"
}
```

## 상세 관측값

```json
{
  "android": {
    "browserVersion": "Chrome/148.0.7778.215",
    "cache": {
      "cacheStorageDeltaBytes": 0,
      "firstQueryMs": 737.1850000005215,
      "loadMs": 10918.05999999959,
      "memory": {
        "afterFirst": {
          "bytes": null,
          "limitation": "UA 특정 메모리 측정 API가 거부되어 peak를 추정하지 않았습니다.",
          "source": "unavailable"
        },
        "afterLoad": {
          "bytes": null,
          "limitation": "UA 특정 메모리 측정 API가 거부되어 peak를 추정하지 않았습니다.",
          "source": "unavailable"
        },
        "afterWarm": {
          "bytes": null,
          "limitation": "UA 특정 메모리 측정 API가 거부되어 peak를 추정하지 않았습니다.",
          "source": "unavailable"
        },
        "baseline": {
          "bytes": null,
          "limitation": "UA 특정 메모리 측정 API가 거부되어 peak를 추정하지 않았습니다.",
          "source": "unavailable"
        },
        "peakStageBoundaryEstimateBytes": null
      },
      "workerAssets": {
        "model": 118308185,
        "other": 658,
        "tokenizer": 17083173,
        "wasm": null
      },
      "warmQueryMs": [
        349.12000000011176,
        151.3950000004843,
        157.79000000003725,
        243.44999999925494,
        172.80000000074506,
        200.62999999988824,
        244.8300000000745,
        217.98000000044703,
        198.3300000000745,
        138.01499999966472,
        106.56499999947846,
        91.69999999925494,
        114.17499999981374,
        179.46999999973923,
        205.2250000005588,
        222.4199999999255,
        109.67999999970198,
        53.65000000037253,
        32.56499999947846,
        69.57500000018626
      ],
      "warmQueryP50Ms": 157.79000000003725,
      "warmQueryP95Ms": 244.8300000000745,
      "cacheEvidence": {
        "cacheHitVerified": true,
        "missingRequiredBasenames": [],
        "cacheRunRemoteModelRequestCount": 0,
        "cacheStorage": {
          "cacheNames": [
            "transformers-cache"
          ],
          "entries": [
            {
              "basename": "config.json",
              "hasFixedRevision": false,
              "sizeBytes": 658
            },
            {
              "basename": "config.json",
              "hasFixedRevision": true,
              "sizeBytes": 658
            },
            {
              "basename": "tokenizer_config.json",
              "hasFixedRevision": true,
              "sizeBytes": 443
            },
            {
              "basename": "tokenizer.json",
              "hasFixedRevision": true,
              "sizeBytes": 17082730
            },
            {
              "basename": "model_quantized.onnx",
              "hasFixedRevision": true,
              "sizeBytes": 118308185
            }
          ],
          "wasm": {
            "attemptedMethods": [
              "Cache Storage response content-length"
            ],
            "limitation": null,
            "sizeBytes": 4732131
          }
        }
      }
    },
    "cancellation": {
      "firstProgressFile": "config.json",
      "signal": "first-progress-callback",
      "terminatedAfterFirstProgress": true,
      "cacheReady": true,
      "recoveryCacheBenchmark": {
        "firstQueryMs": 737.1850000005215,
        "loadMs": 10918.05999999959,
        "warmQueryCount": 20
      }
    },
    "cold": {
      "cacheStorageDeltaBytes": 159017472,
      "firstQueryMs": 688.0800000000745,
      "loadMs": 65790.34500000067,
      "memory": {
        "afterFirst": {
          "bytes": null,
          "limitation": "UA 특정 메모리 측정 API가 거부되어 peak를 추정하지 않았습니다.",
          "source": "unavailable"
        },
        "afterLoad": {
          "bytes": null,
          "limitation": "UA 특정 메모리 측정 API가 거부되어 peak를 추정하지 않았습니다.",
          "source": "unavailable"
        },
        "afterWarm": {
          "bytes": null,
          "limitation": "UA 특정 메모리 측정 API가 거부되어 peak를 추정하지 않았습니다.",
          "source": "unavailable"
        },
        "baseline": {
          "bytes": null,
          "limitation": "UA 특정 메모리 측정 API가 거부되어 peak를 추정하지 않았습니다.",
          "source": "unavailable"
        },
        "peakStageBoundaryEstimateBytes": null
      },
      "workerAssets": {
        "model": 118308185,
        "other": 658,
        "tokenizer": 17083173,
        "wasm": null
      },
      "warmQueryMs": [
        217.160000000149,
        136.37999999988824,
        69.15500000026077,
        176.7250000005588,
        152.54000000003725,
        113.62000000011176,
        77.62999999988824,
        76.74500000011176,
        74.42499999981374,
        87.08499999996275,
        62.700000000186265,
        52.96499999985099,
        87.19999999925494,
        80.60999999940395,
        45.78500000014901,
        75.62000000011176,
        54.294999999925494,
        92.32500000018626,
        62.230000000447035,
        157.31500000040978
      ],
      "warmQueryP50Ms": 77.62999999988824,
      "warmQueryP95Ms": 176.7250000005588
    },
    "device": "android",
    "runtime": {
      "backend": "wasm",
      "crossOriginIsolated": true,
      "deviceMemory": 2,
      "hardwareConcurrency": 4,
      "navigatorGpuSupported": true,
      "userAgent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36",
      "launchFlags": []
    },
    "status": "measured",
    "tabRecovery": {
      "queryVectorDimensions": 384,
      "visibilityEvents": [
        "hidden",
        "visible"
      ],
      "visibilityTransitionObserved": true
    }
  },
  "desktop": {
    "browserVersion": "Chrome/150.0.7871.181",
    "cache": {
      "cacheStorageDeltaBytes": 0,
      "firstQueryMs": 30.979999989271164,
      "loadMs": 2207.3349999934435,
      "memory": {
        "afterFirst": {
          "bytes": null,
          "limitation": "UA 특정 메모리 측정 API가 거부되어 peak를 추정하지 않았습니다.",
          "source": "unavailable"
        },
        "afterLoad": {
          "bytes": null,
          "limitation": "UA 특정 메모리 측정 API가 거부되어 peak를 추정하지 않았습니다.",
          "source": "unavailable"
        },
        "afterWarm": {
          "bytes": null,
          "limitation": "UA 특정 메모리 측정 API가 거부되어 peak를 추정하지 않았습니다.",
          "source": "unavailable"
        },
        "baseline": {
          "bytes": null,
          "limitation": "UA 특정 메모리 측정 API가 거부되어 peak를 추정하지 않았습니다.",
          "source": "unavailable"
        },
        "peakStageBoundaryEstimateBytes": null
      },
      "workerAssets": {
        "model": 118308185,
        "other": 658,
        "tokenizer": 17083173,
        "wasm": null
      },
      "warmQueryMs": [
        13.17000000178814,
        13.17000000178814,
        12.95499999821186,
        10.774999991059303,
        12.840000003576279,
        11.469999998807907,
        10.885000005364418,
        11.594999998807907,
        10.280000001192093,
        11.29500000178814,
        12.174999997019768,
        11.13000001013279,
        9.965000003576279,
        13.214999988675117,
        11.520000010728836,
        11.349999994039536,
        13.350000008940697,
        17.32999999821186,
        16.95499999821186,
        13.109999999403954
      ],
      "warmQueryP50Ms": 11.594999998807907,
      "warmQueryP95Ms": 16.95499999821186,
      "cacheEvidence": {
        "cacheHitVerified": true,
        "missingRequiredBasenames": [],
        "cacheRunRemoteModelRequestCount": 0,
        "cacheStorage": {
          "cacheNames": [
            "transformers-cache"
          ],
          "entries": [
            {
              "basename": "config.json",
              "hasFixedRevision": false,
              "sizeBytes": 658
            },
            {
              "basename": "config.json",
              "hasFixedRevision": true,
              "sizeBytes": 658
            },
            {
              "basename": "tokenizer_config.json",
              "hasFixedRevision": true,
              "sizeBytes": 443
            },
            {
              "basename": "model_quantized.onnx",
              "hasFixedRevision": true,
              "sizeBytes": 118308185
            },
            {
              "basename": "tokenizer.json",
              "hasFixedRevision": true,
              "sizeBytes": 17082730
            }
          ],
          "wasm": {
            "attemptedMethods": [
              "Cache Storage response content-length"
            ],
            "limitation": null,
            "sizeBytes": 4732131
          }
        }
      }
    },
    "cancellation": {
      "firstProgressFile": "config.json",
      "signal": "first-progress-callback",
      "terminatedAfterFirstProgress": true,
      "cacheReady": true,
      "recoveryCacheBenchmark": {
        "firstQueryMs": 30.979999989271164,
        "loadMs": 2207.3349999934435,
        "warmQueryCount": 20
      }
    },
    "cold": {
      "cacheStorageDeltaBytes": 159017472,
      "firstQueryMs": 90.75500001013279,
      "loadMs": 27052.55000001192,
      "memory": {
        "afterFirst": {
          "bytes": null,
          "limitation": "UA 특정 메모리 측정 API가 거부되어 peak를 추정하지 않았습니다.",
          "source": "unavailable"
        },
        "afterLoad": {
          "bytes": null,
          "limitation": "UA 특정 메모리 측정 API가 거부되어 peak를 추정하지 않았습니다.",
          "source": "unavailable"
        },
        "afterWarm": {
          "bytes": null,
          "limitation": "UA 특정 메모리 측정 API가 거부되어 peak를 추정하지 않았습니다.",
          "source": "unavailable"
        },
        "baseline": {
          "bytes": null,
          "limitation": "UA 특정 메모리 측정 API가 거부되어 peak를 추정하지 않았습니다.",
          "source": "unavailable"
        },
        "peakStageBoundaryEstimateBytes": null
      },
      "workerAssets": {
        "model": 118308185,
        "other": 658,
        "tokenizer": 17083173,
        "wasm": null
      },
      "warmQueryMs": [
        19.67000000178814,
        16.739999994635582,
        30.935000002384186,
        12.32999999821186,
        34.24000000953674,
        11.334999993443489,
        24.54000000655651,
        20.390000000596046,
        18.599999994039536,
        11.25500001013279,
        11.109999999403954,
        14.224999994039536,
        13.104999989271164,
        11.96000000834465,
        10.824999988079071,
        11.520000010728836,
        10.224999994039536,
        11.450000002980232,
        13.694999992847443,
        13.939999997615814
      ],
      "warmQueryP50Ms": 13.104999989271164,
      "warmQueryP95Ms": 30.935000002384186
    },
    "device": "desktop",
    "runtime": {
      "backend": "wasm",
      "crossOriginIsolated": true,
      "deviceMemory": 32,
      "hardwareConcurrency": 8,
      "navigatorGpuSupported": true,
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
      "launchFlags": [
        "--enable-blink-features=ForceEagerMeasureMemory"
      ]
    },
    "status": "measured",
    "tabRecovery": {
      "queryVectorDimensions": 384,
      "visibilityEvents": [
        "hidden",
        "visible"
      ],
      "visibilityTransitionObserved": true
    }
  }
}
```

## 방법과 한계

- Worker 생성부터 `pipeline` ready까지에는 Worker 모듈, ONNX WASM, 모델·tokenizer fetch와 초기화가 포함됩니다.
- warm p50/p95는 고정 synthetic query 20회의 nearest-rank(`ceil(p*n)-1`)이며 모든 출력은 384차원·유한값을 검증합니다.
- 메모리 peak는 단계 경계 최대 추정치일 뿐 연속 peak가 아닙니다. 관측 실패와 시간 초과는 결과 JSON의 limitation에 그대로 기록합니다.
- WebGPU 지원 여부와 실제 실행 backend는 별도로 기록하며 실제 backend는 고정 WASM입니다.
