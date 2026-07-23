# 꺼내보기 Gemini Embedding 2 합성 탐색 결과

> **해석 제한: 이 합성 평가는 통계적 우월성을 증명하지 않음.**
> 작은 고정 corpus에서 실패 유형을 찾고 실제 개인 데이터 파일럿 후보를 고르기 위한 탐색 결과다.

## 실행 계약

| 항목 | 값 |
| --- | --- |
| manifest SHA-256 | `49c9186fde6b33fb0087e8ec565613254b205b095ffec58f3942033f4ebf555f` |
| corpus 버전 | `exploratory-corpus-v1` |
| corpus SHA-256 | `91eb31bf622438b4a8319c7dd389761edaf006928c7ccca8c0da03f74c958c41` |
| query 버전 | `exploratory-queries-v1` |
| query SHA-256 | `3384643d0d6eef83330720be5c76dcc2a7f29378b6f7afc4207ee956a2bbd183` |
| 공급자 | `gemini-developer-api:free-tier:rest-v1beta:768` |
| 모델 | `gemini-embedding-2` |
| 모델 리비전 | `stable-alias-observed-2026-07-23` |

## Semantic threshold calibration

외부 기본값을 가져오지 않고 negative calibration 상위 점수의 50·90·100 분위만 비교했다.
선택값은 가장 높은 negative calibration 점수이며, 실제 반환은 이 값을 **엄격히 초과**한 결과만 허용한다.

| threshold | positive Recall@5 | positive nDCG@6 | negative 평균 반환 수 | 상태 |
| ---: | ---: | ---: | ---: | --- |
| 0.562693 | 1.000000 | 0.949759 | 1.700000 |  |
| 0.584918 | 1.000000 | 0.949759 | 0.100000 |  |
| 0.588108 | 1.000000 | 0.949759 | 0.000000 | 선택 |

선택 threshold: `0.588108`

## Slice·phase 집계

| slice | phase | 후보 | Recall@5 | MRR@6 | nDCG@6 | 평균 반환 수 |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| lexical | calibration | 현행 어휘 검색 | 1.000000 | 1.000000 | 0.949537 | 2.800000 |
| lexical | calibration | Gemini Embedding 2 의미 검색 | 1.000000 | 1.000000 | 0.975412 | 5.300000 |
| lexical | calibration | Gemini Embedding 2 하이브리드 k=60 | 1.000000 | 1.000000 | 0.975901 | 5.800000 |
| lexical | calibration | Gemini Embedding 2 하이브리드 k=10 | 1.000000 | 1.000000 | 0.975901 | 5.800000 |
| lexical | check | 현행 어휘 검색 | 1.000000 | 1.000000 | 1.000000 | 3.800000 |
| lexical | check | Gemini Embedding 2 의미 검색 | 1.000000 | 1.000000 | 1.000000 | 6.000000 |
| lexical | check | Gemini Embedding 2 하이브리드 k=60 | 1.000000 | 1.000000 | 1.000000 | 6.000000 |
| lexical | check | Gemini Embedding 2 하이브리드 k=10 | 1.000000 | 1.000000 | 1.000000 | 6.000000 |
| semantic | calibration | 현행 어휘 검색 | 0.500000 | 0.270000 | 0.214914 | 4.100000 |
| semantic | calibration | Gemini Embedding 2 의미 검색 | 1.000000 | 1.000000 | 0.924107 | 5.800000 |
| semantic | calibration | Gemini Embedding 2 하이브리드 k=60 | 1.000000 | 0.673333 | 0.628230 | 6.000000 |
| semantic | calibration | Gemini Embedding 2 하이브리드 k=10 | 1.000000 | 0.673333 | 0.639048 | 6.000000 |
| semantic | check | 현행 어휘 검색 | 0.600000 | 0.300000 | 0.334704 | 4.000000 |
| semantic | check | Gemini Embedding 2 의미 검색 | 1.000000 | 1.000000 | 0.942903 | 4.200000 |
| semantic | check | Gemini Embedding 2 하이브리드 k=60 | 1.000000 | 0.740000 | 0.763331 | 4.800000 |
| semantic | check | Gemini Embedding 2 하이브리드 k=10 | 1.000000 | 0.750000 | 0.770573 | 4.800000 |
| negative | calibration | 현행 어휘 검색 | 0.000000 | 0.000000 | 0.000000 | 1.500000 |
| negative | calibration | Gemini Embedding 2 의미 검색 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| negative | calibration | Gemini Embedding 2 하이브리드 k=60 | 0.000000 | 0.000000 | 0.000000 | 1.500000 |
| negative | calibration | Gemini Embedding 2 하이브리드 k=10 | 0.000000 | 0.000000 | 0.000000 | 1.500000 |
| negative | check | 현행 어휘 검색 | 0.000000 | 0.000000 | 0.000000 | 0.200000 |
| negative | check | Gemini Embedding 2 의미 검색 | 0.000000 | 0.000000 | 0.000000 | 0.600000 |
| negative | check | Gemini Embedding 2 하이브리드 k=60 | 0.000000 | 0.000000 | 0.000000 | 0.800000 |
| negative | check | Gemini Embedding 2 하이브리드 k=10 | 0.000000 | 0.000000 | 0.000000 | 0.800000 |

## 현행 대비 query별 nDCG@6

| 후보 | wins | ties | losses |
| --- | ---: | ---: | ---: |
| Gemini Embedding 2 의미 검색 | 18 | 10 | 2 |
| Gemini Embedding 2 하이브리드 k=60 | 18 | 12 | 0 |
| Gemini Embedding 2 하이브리드 k=10 | 18 | 12 | 0 |

## RRF 민감도

- k=60: 18승 12무 0패
- k=10: 18승 12무 0패
- 결론 방향 뒤집힘: 아니요

## critical miss

현행이 찾은 관련도 2 자료를 후보가 놓친 사례가 없다.

## Negative query 반환 수

| query | phase | 후보 | 반환 수 |
| --- | --- | --- | ---: |
| negative-calibration-01 | calibration | 현행 어휘 검색 | 2 |
| negative-calibration-01 | calibration | Gemini Embedding 2 의미 검색 | 0 |
| negative-calibration-01 | calibration | Gemini Embedding 2 하이브리드 k=60 | 2 |
| negative-calibration-01 | calibration | Gemini Embedding 2 하이브리드 k=10 | 2 |
| negative-calibration-02 | calibration | 현행 어휘 검색 | 0 |
| negative-calibration-02 | calibration | Gemini Embedding 2 의미 검색 | 0 |
| negative-calibration-02 | calibration | Gemini Embedding 2 하이브리드 k=60 | 0 |
| negative-calibration-02 | calibration | Gemini Embedding 2 하이브리드 k=10 | 0 |
| negative-calibration-03 | calibration | 현행 어휘 검색 | 0 |
| negative-calibration-03 | calibration | Gemini Embedding 2 의미 검색 | 0 |
| negative-calibration-03 | calibration | Gemini Embedding 2 하이브리드 k=60 | 0 |
| negative-calibration-03 | calibration | Gemini Embedding 2 하이브리드 k=10 | 0 |
| negative-calibration-04 | calibration | 현행 어휘 검색 | 2 |
| negative-calibration-04 | calibration | Gemini Embedding 2 의미 검색 | 0 |
| negative-calibration-04 | calibration | Gemini Embedding 2 하이브리드 k=60 | 2 |
| negative-calibration-04 | calibration | Gemini Embedding 2 하이브리드 k=10 | 2 |
| negative-calibration-05 | calibration | 현행 어휘 검색 | 0 |
| negative-calibration-05 | calibration | Gemini Embedding 2 의미 검색 | 0 |
| negative-calibration-05 | calibration | Gemini Embedding 2 하이브리드 k=60 | 0 |
| negative-calibration-05 | calibration | Gemini Embedding 2 하이브리드 k=10 | 0 |
| negative-calibration-06 | calibration | 현행 어휘 검색 | 3 |
| negative-calibration-06 | calibration | Gemini Embedding 2 의미 검색 | 0 |
| negative-calibration-06 | calibration | Gemini Embedding 2 하이브리드 k=60 | 3 |
| negative-calibration-06 | calibration | Gemini Embedding 2 하이브리드 k=10 | 3 |
| negative-calibration-07 | calibration | 현행 어휘 검색 | 1 |
| negative-calibration-07 | calibration | Gemini Embedding 2 의미 검색 | 0 |
| negative-calibration-07 | calibration | Gemini Embedding 2 하이브리드 k=60 | 1 |
| negative-calibration-07 | calibration | Gemini Embedding 2 하이브리드 k=10 | 1 |
| negative-calibration-08 | calibration | 현행 어휘 검색 | 1 |
| negative-calibration-08 | calibration | Gemini Embedding 2 의미 검색 | 0 |
| negative-calibration-08 | calibration | Gemini Embedding 2 하이브리드 k=60 | 1 |
| negative-calibration-08 | calibration | Gemini Embedding 2 하이브리드 k=10 | 1 |
| negative-calibration-09 | calibration | 현행 어휘 검색 | 0 |
| negative-calibration-09 | calibration | Gemini Embedding 2 의미 검색 | 0 |
| negative-calibration-09 | calibration | Gemini Embedding 2 하이브리드 k=60 | 0 |
| negative-calibration-09 | calibration | Gemini Embedding 2 하이브리드 k=10 | 0 |
| negative-calibration-10 | calibration | 현행 어휘 검색 | 6 |
| negative-calibration-10 | calibration | Gemini Embedding 2 의미 검색 | 0 |
| negative-calibration-10 | calibration | Gemini Embedding 2 하이브리드 k=60 | 6 |
| negative-calibration-10 | calibration | Gemini Embedding 2 하이브리드 k=10 | 6 |
| negative-check-01 | check | 현행 어휘 검색 | 0 |
| negative-check-01 | check | Gemini Embedding 2 의미 검색 | 0 |
| negative-check-01 | check | Gemini Embedding 2 하이브리드 k=60 | 0 |
| negative-check-01 | check | Gemini Embedding 2 하이브리드 k=10 | 0 |
| negative-check-02 | check | 현행 어휘 검색 | 0 |
| negative-check-02 | check | Gemini Embedding 2 의미 검색 | 2 |
| negative-check-02 | check | Gemini Embedding 2 하이브리드 k=60 | 2 |
| negative-check-02 | check | Gemini Embedding 2 하이브리드 k=10 | 2 |
| negative-check-03 | check | 현행 어휘 검색 | 0 |
| negative-check-03 | check | Gemini Embedding 2 의미 검색 | 0 |
| negative-check-03 | check | Gemini Embedding 2 하이브리드 k=60 | 0 |
| negative-check-03 | check | Gemini Embedding 2 하이브리드 k=10 | 0 |
| negative-check-04 | check | 현행 어휘 검색 | 1 |
| negative-check-04 | check | Gemini Embedding 2 의미 검색 | 0 |
| negative-check-04 | check | Gemini Embedding 2 하이브리드 k=60 | 1 |
| negative-check-04 | check | Gemini Embedding 2 하이브리드 k=10 | 1 |
| negative-check-05 | check | 현행 어휘 검색 | 0 |
| negative-check-05 | check | Gemini Embedding 2 의미 검색 | 1 |
| negative-check-05 | check | Gemini Embedding 2 하이브리드 k=60 | 1 |
| negative-check-05 | check | Gemini Embedding 2 하이브리드 k=10 | 1 |

## Query별 결과와 오류 사례



### lexical-calibration-01 · lexical/calibration

React 폼 검증

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | dev-01(g2, 31.500000)<br>dev-03(g1, 12.000000)<br>media-11(g0, 9.000000)<br>project-04(g0, 8.000000) | 1.000000 | 0.878962 |
| Gemini Embedding 2 의미 검색 | dev-01(g2, 0.798836)<br>dev-02(g1, 0.660192)<br>dev-03(g1, 0.640452) | 1.000000 | 1.000000 |
| Gemini Embedding 2 하이브리드 k=60 | dev-01(g2, 0.032787)<br>dev-03(g1, 0.032002)<br>dev-02(g1, 0.016129)<br>media-11(g0, 0.015873)<br>project-04(g0, 0.015625) | 1.000000 | 1.000000 |
| Gemini Embedding 2 하이브리드 k=10 | dev-01(g2, 0.181818)<br>dev-03(g1, 0.160256)<br>dev-02(g1, 0.083333)<br>media-11(g0, 0.076923)<br>project-04(g0, 0.071429) | 1.000000 | 1.000000 |

### lexical-calibration-02 · lexical/calibration

캐시 무효화

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | dev-05(g2, 18.000000) | 1.000000 | 1.000000 |
| Gemini Embedding 2 의미 검색 | dev-05(g2, 0.737492)<br>dev-06(g0, 0.637945)<br>account-04(g0, 0.635196)<br>dev-01(g0, 0.622021)<br>account-12(g0, 0.621628)<br>dev-10(g0, 0.621591) | 1.000000 | 1.000000 |
| Gemini Embedding 2 하이브리드 k=60 | dev-05(g2, 0.032787)<br>dev-06(g0, 0.016129)<br>account-04(g0, 0.015873)<br>dev-01(g0, 0.015625)<br>account-12(g0, 0.015385)<br>dev-10(g0, 0.015152) | 1.000000 | 1.000000 |
| Gemini Embedding 2 하이브리드 k=10 | dev-05(g2, 0.181818)<br>dev-06(g0, 0.083333)<br>account-04(g0, 0.076923)<br>dev-01(g0, 0.071429)<br>account-12(g0, 0.066667)<br>dev-10(g0, 0.062500) | 1.000000 | 1.000000 |

### lexical-calibration-03 · lexical/calibration

출처 인용 체크리스트

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | study-04(g2, 27.000000)<br>media-05(g1, 9.000000)<br>media-04(g0, 9.000000)<br>media-11(g0, 8.000000) | 1.000000 | 1.000000 |
| Gemini Embedding 2 의미 검색 | study-04(g2, 0.823845)<br>media-11(g0, 0.688993)<br>media-05(g1, 0.661745)<br>media-07(g0, 0.649030)<br>media-04(g0, 0.639706)<br>project-02(g0, 0.632381) | 1.000000 | 0.963940 |
| Gemini Embedding 2 하이브리드 k=60 | study-04(g2, 0.032787)<br>media-05(g1, 0.032002)<br>media-11(g0, 0.031754)<br>media-04(g0, 0.031258)<br>media-07(g0, 0.015625)<br>project-02(g0, 0.015152) | 1.000000 | 1.000000 |
| Gemini Embedding 2 하이브리드 k=10 | study-04(g2, 0.181818)<br>media-05(g1, 0.160256)<br>media-11(g0, 0.154762)<br>media-04(g0, 0.143590)<br>media-07(g0, 0.071429)<br>project-02(g0, 0.062500) | 1.000000 | 1.000000 |

### lexical-calibration-04 · lexical/calibration

공모전 문제 정의

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | project-01(g2, 27.000000)<br>project-08(g0, 12.000000)<br>study-11(g0, 8.000000)<br>study-06(g0, 8.000000) | 1.000000 | 0.826235 |
| Gemini Embedding 2 의미 검색 | project-01(g2, 0.767433)<br>project-02(g1, 0.636094)<br>project-08(g0, 0.633650)<br>study-06(g0, 0.630214)<br>study-11(g0, 0.627729)<br>project-11(g0, 0.620166) | 1.000000 | 1.000000 |
| Gemini Embedding 2 하이브리드 k=60 | project-01(g2, 0.032787)<br>project-08(g0, 0.032002)<br>study-11(g0, 0.031258)<br>study-06(g0, 0.031250)<br>project-02(g1, 0.016129)<br>project-11(g0, 0.015152) | 1.000000 | 0.932778 |
| Gemini Embedding 2 하이브리드 k=10 | project-01(g2, 0.181818)<br>project-08(g0, 0.160256)<br>study-11(g0, 0.143590)<br>study-06(g0, 0.142857)<br>project-02(g1, 0.083333)<br>project-11(g0, 0.062500) | 1.000000 | 0.932778 |

### lexical-calibration-05 · lexical/calibration

제주 비 오는 날

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | travel-01(g2, 36.000000)<br>project-11(g0, 14.000000)<br>account-01(g0, 8.000000)<br>dev-04(g0, 8.000000)<br>travel-08(g0, 7.000000)<br>account-06(g0, 6.000000) | 1.000000 | 1.000000 |
| Gemini Embedding 2 의미 검색 | travel-01(g2, 0.768420)<br>travel-11(g0, 0.616358)<br>travel-07(g0, 0.601094) | 1.000000 | 1.000000 |
| Gemini Embedding 2 하이브리드 k=60 | travel-01(g2, 0.032787)<br>travel-11(g0, 0.031054)<br>project-11(g0, 0.016129)<br>account-01(g0, 0.015873)<br>travel-07(g0, 0.015873)<br>dev-04(g0, 0.015625) | 1.000000 | 1.000000 |
| Gemini Embedding 2 하이브리드 k=10 | travel-01(g2, 0.181818)<br>travel-11(g0, 0.142157)<br>project-11(g0, 0.083333)<br>account-01(g0, 0.076923)<br>travel-07(g0, 0.076923)<br>dev-04(g0, 0.071429) | 1.000000 | 1.000000 |

### lexical-calibration-06 · lexical/calibration

기내 반입 보조배터리

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | travel-02(g2, 26.000000) | 1.000000 | 1.000000 |
| Gemini Embedding 2 의미 검색 | travel-02(g2, 0.745911)<br>travel-03(g0, 0.620013)<br>travel-08(g0, 0.602554)<br>travel-04(g0, 0.596246)<br>travel-06(g0, 0.591488) | 1.000000 | 1.000000 |
| Gemini Embedding 2 하이브리드 k=60 | travel-02(g2, 0.032787)<br>travel-03(g0, 0.016129)<br>travel-08(g0, 0.015873)<br>travel-04(g0, 0.015625)<br>travel-06(g0, 0.015385) | 1.000000 | 1.000000 |
| Gemini Embedding 2 하이브리드 k=10 | travel-02(g2, 0.181818)<br>travel-03(g0, 0.083333)<br>travel-08(g0, 0.076923)<br>travel-04(g0, 0.071429)<br>travel-06(g0, 0.066667) | 1.000000 | 1.000000 |

### lexical-calibration-07 · lexical/calibration

팟캐스트 타임스탬프

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | media-04(g2, 18.000000) | 1.000000 | 0.826235 |
| Gemini Embedding 2 의미 검색 | media-04(g2, 0.793312)<br>media-02(g0, 0.636640)<br>media-12(g0, 0.632646)<br>study-07(g0, 0.631849)<br>travel-09(g0, 0.629305)<br>travel-03(g0, 0.624604) | 1.000000 | 0.826235 |
| Gemini Embedding 2 하이브리드 k=60 | media-04(g2, 0.032787)<br>media-02(g0, 0.016129)<br>media-12(g0, 0.015873)<br>study-07(g0, 0.015625)<br>travel-09(g0, 0.015385)<br>travel-03(g0, 0.015152) | 1.000000 | 0.826235 |
| Gemini Embedding 2 하이브리드 k=10 | media-04(g2, 0.181818)<br>media-02(g0, 0.083333)<br>media-12(g0, 0.076923)<br>study-07(g0, 0.071429)<br>travel-09(g0, 0.066667)<br>travel-03(g0, 0.062500) | 1.000000 | 0.826235 |

### lexical-calibration-08 · lexical/calibration

브라우저 북마크 내보내기

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | account-03(g2, 27.000000)<br>dev-07(g0, 12.000000) | 1.000000 | 1.000000 |
| Gemini Embedding 2 의미 검색 | account-03(g2, 0.795361)<br>account-05(g0, 0.648667)<br>account-08(g0, 0.632177)<br>account-06(g0, 0.629384)<br>media-06(g0, 0.623639)<br>media-09(g0, 0.612143) | 1.000000 | 1.000000 |
| Gemini Embedding 2 하이브리드 k=60 | account-03(g2, 0.032787)<br>dev-07(g0, 0.030415)<br>account-05(g0, 0.016129)<br>account-08(g0, 0.015873)<br>account-06(g0, 0.015625)<br>media-06(g0, 0.015385) | 1.000000 | 1.000000 |
| Gemini Embedding 2 하이브리드 k=10 | account-03(g2, 0.181818)<br>dev-07(g0, 0.133333)<br>account-05(g0, 0.083333)<br>account-08(g0, 0.076923)<br>account-06(g0, 0.071429)<br>media-06(g0, 0.066667) | 1.000000 | 1.000000 |

### lexical-calibration-09 · lexical/calibration

복구 코드 2단계 인증

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | account-02(g2, 42.000000)<br>account-01(g1, 8.000000) | 1.000000 | 1.000000 |
| Gemini Embedding 2 의미 검색 | account-02(g2, 0.807055)<br>dev-07(g0, 0.629221)<br>account-01(g1, 0.615453)<br>account-06(g0, 0.611823)<br>account-07(g0, 0.607995)<br>account-05(g0, 0.603479) | 1.000000 | 0.963940 |
| Gemini Embedding 2 하이브리드 k=60 | account-02(g2, 0.032787)<br>account-01(g1, 0.032002)<br>dev-07(g0, 0.016129)<br>account-06(g0, 0.015625)<br>account-07(g0, 0.015385)<br>account-05(g0, 0.015152) | 1.000000 | 1.000000 |
| Gemini Embedding 2 하이브리드 k=10 | account-02(g2, 0.181818)<br>account-01(g1, 0.160256)<br>dev-07(g0, 0.083333)<br>account-06(g0, 0.071429)<br>account-07(g0, 0.066667)<br>account-05(g0, 0.062500) | 1.000000 | 1.000000 |

### lexical-calibration-10 · lexical/calibration

비밀번호 관리자 이전

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | account-06(g2, 27.000000)<br>account-05(g0, 12.000000)<br>account-01(g1, 12.000000) | 1.000000 | 0.963940 |
| Gemini Embedding 2 의미 검색 | account-06(g2, 0.782741)<br>account-01(g1, 0.681336)<br>account-03(g0, 0.670578)<br>account-05(g0, 0.629886)<br>account-11(g0, 0.626747)<br>account-02(g0, 0.625947) | 1.000000 | 1.000000 |
| Gemini Embedding 2 하이브리드 k=60 | account-06(g2, 0.032787)<br>account-01(g1, 0.032002)<br>account-05(g0, 0.031754)<br>account-03(g0, 0.015873)<br>account-11(g0, 0.015385)<br>account-02(g0, 0.015152) | 1.000000 | 1.000000 |
| Gemini Embedding 2 하이브리드 k=10 | account-06(g2, 0.181818)<br>account-01(g1, 0.160256)<br>account-05(g0, 0.154762)<br>account-03(g0, 0.076923)<br>account-11(g0, 0.066667)<br>account-02(g0, 0.062500) | 1.000000 | 1.000000 |

### lexical-check-01 · lexical/check

Supabase RLS

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | dev-08(g2, 22.500000) | 1.000000 | 1.000000 |
| Gemini Embedding 2 의미 검색 | dev-08(g2, 0.825515)<br>project-04(g0, 0.605282)<br>dev-02(g0, 0.603648)<br>project-05(g0, 0.603560)<br>account-07(g0, 0.595529)<br>dev-07(g0, 0.591863) | 1.000000 | 1.000000 |
| Gemini Embedding 2 하이브리드 k=60 | dev-08(g2, 0.032787)<br>project-04(g0, 0.016129)<br>dev-02(g0, 0.015873)<br>project-05(g0, 0.015625)<br>account-07(g0, 0.015385)<br>dev-07(g0, 0.015152) | 1.000000 | 1.000000 |
| Gemini Embedding 2 하이브리드 k=10 | dev-08(g2, 0.181818)<br>project-04(g0, 0.083333)<br>dev-02(g0, 0.076923)<br>project-05(g0, 0.071429)<br>account-07(g0, 0.066667)<br>dev-07(g0, 0.062500) | 1.000000 | 1.000000 |

### lexical-check-02 · lexical/check

오답 노트

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | study-11(g2, 18.000000)<br>media-11(g0, 9.000000)<br>study-12(g0, 9.000000) | 1.000000 | 1.000000 |
| Gemini Embedding 2 의미 검색 | study-11(g2, 0.767850)<br>media-11(g0, 0.673478)<br>study-06(g0, 0.666770)<br>study-05(g0, 0.665341)<br>study-02(g0, 0.662434)<br>study-01(g0, 0.661804) | 1.000000 | 1.000000 |
| Gemini Embedding 2 하이브리드 k=60 | study-11(g2, 0.032787)<br>media-11(g0, 0.032258)<br>study-12(g0, 0.030159)<br>study-06(g0, 0.015873)<br>study-05(g0, 0.015625)<br>study-02(g0, 0.015385) | 1.000000 | 1.000000 |
| Gemini Embedding 2 하이브리드 k=10 | study-11(g2, 0.181818)<br>media-11(g0, 0.166667)<br>study-12(g0, 0.126923)<br>study-06(g0, 0.076923)<br>study-05(g0, 0.071429)<br>study-02(g0, 0.066667) | 1.000000 | 1.000000 |

### lexical-check-03 · lexical/check

사용자 테스트 관찰

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | project-09(g2, 24.000000)<br>project-01(g0, 12.000000)<br>dev-10(g0, 9.000000)<br>dev-08(g0, 8.000000)<br>dev-03(g0, 8.000000) | 1.000000 | 1.000000 |
| Gemini Embedding 2 의미 검색 | project-09(g2, 0.796180)<br>project-03(g0, 0.673094)<br>media-07(g0, 0.660374)<br>project-12(g0, 0.654984)<br>project-01(g0, 0.650140)<br>project-07(g0, 0.637582) | 1.000000 | 1.000000 |
| Gemini Embedding 2 하이브리드 k=60 | project-09(g2, 0.032787)<br>project-01(g0, 0.031514)<br>dev-10(g0, 0.030159)<br>dev-03(g0, 0.029274)<br>project-03(g0, 0.016129)<br>media-07(g0, 0.015873) | 1.000000 | 1.000000 |
| Gemini Embedding 2 하이브리드 k=10 | project-09(g2, 0.181818)<br>project-01(g0, 0.150000)<br>dev-10(g0, 0.126923)<br>dev-03(g0, 0.112121)<br>project-03(g0, 0.083333)<br>media-07(g0, 0.076923) | 1.000000 | 1.000000 |

### lexical-check-04 · lexical/check

여행 경비 정산

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | travel-10(g2, 33.000000)<br>travel-08(g0, 15.000000)<br>travel-12(g0, 6.000000)<br>travel-11(g0, 6.000000)<br>travel-09(g0, 6.000000)<br>travel-07(g0, 6.000000) | 1.000000 | 1.000000 |
| Gemini Embedding 2 의미 검색 | travel-10(g2, 0.766132)<br>travel-05(g0, 0.645087)<br>travel-03(g0, 0.640931)<br>travel-08(g0, 0.636783)<br>travel-02(g0, 0.624031)<br>travel-12(g0, 0.619241) | 1.000000 | 1.000000 |
| Gemini Embedding 2 하이브리드 k=60 | travel-10(g2, 0.032787)<br>travel-08(g0, 0.031754)<br>travel-12(g0, 0.031025)<br>travel-05(g0, 0.030835)<br>travel-11(g0, 0.030331)<br>travel-03(g0, 0.030159) | 1.000000 | 1.000000 |
| Gemini Embedding 2 하이브리드 k=10 | travel-10(g2, 0.181818)<br>travel-08(g0, 0.154762)<br>travel-12(g0, 0.139423)<br>travel-05(g0, 0.138889)<br>travel-11(g0, 0.126984)<br>travel-03(g0, 0.126923) | 1.000000 | 1.000000 |

### lexical-check-05 · lexical/check

의심스러운 로그인

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | account-07(g2, 18.000000)<br>dev-07(g0, 12.000000)<br>dev-01(g0, 12.000000)<br>account-01(g0, 9.000000) | 1.000000 | 1.000000 |
| Gemini Embedding 2 의미 검색 | account-07(g2, 0.787433)<br>account-01(g0, 0.669317)<br>account-08(g0, 0.654661)<br>account-06(g0, 0.646934)<br>account-02(g0, 0.646533)<br>account-11(g0, 0.644858) | 1.000000 | 1.000000 |
| Gemini Embedding 2 하이브리드 k=60 | account-07(g2, 0.032787)<br>account-01(g0, 0.031754)<br>dev-07(g0, 0.031054)<br>dev-01(g0, 0.030579)<br>account-08(g0, 0.015873)<br>account-06(g0, 0.015625) | 1.000000 | 1.000000 |
| Gemini Embedding 2 하이브리드 k=10 | account-07(g2, 0.181818)<br>account-01(g0, 0.154762)<br>dev-07(g0, 0.142157)<br>dev-01(g0, 0.132479)<br>account-08(g0, 0.076923)<br>account-06(g0, 0.071429) | 1.000000 | 1.000000 |

### negative-calibration-01 · negative/calibration

고양이 예방접종 일정

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | project-06(g0, 12.000000)<br>travel-07(g0, 8.000000) | 0.000000 | 0.000000 |
| Gemini Embedding 2 의미 검색 | - | 0.000000 | 0.000000 |
| Gemini Embedding 2 하이브리드 k=60 | project-06(g0, 0.016393)<br>travel-07(g0, 0.016129) | 0.000000 | 0.000000 |
| Gemini Embedding 2 하이브리드 k=10 | project-06(g0, 0.090909)<br>travel-07(g0, 0.083333) | 0.000000 | 0.000000 |

### negative-calibration-02 · negative/calibration

주식 양도소득세 신고

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | - | 0.000000 | 0.000000 |
| Gemini Embedding 2 의미 검색 | - | 0.000000 | 0.000000 |
| Gemini Embedding 2 하이브리드 k=60 | - | 0.000000 | 0.000000 |
| Gemini Embedding 2 하이브리드 k=10 | - | 0.000000 | 0.000000 |

### negative-calibration-03 · negative/calibration

집에서 천연 발효빵 굽기

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | - | 0.000000 | 0.000000 |
| Gemini Embedding 2 의미 검색 | - | 0.000000 | 0.000000 |
| Gemini Embedding 2 하이브리드 k=60 | - | 0.000000 | 0.000000 |
| Gemini Embedding 2 하이브리드 k=10 | - | 0.000000 | 0.000000 |

### negative-calibration-04 · negative/calibration

자동차 엔진오일 교체 주기

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | account-03(g0, 12.000000)<br>study-01(g0, 8.000000) | 0.000000 | 0.000000 |
| Gemini Embedding 2 의미 검색 | - | 0.000000 | 0.000000 |
| Gemini Embedding 2 하이브리드 k=60 | account-03(g0, 0.016393)<br>study-01(g0, 0.016129) | 0.000000 | 0.000000 |
| Gemini Embedding 2 하이브리드 k=10 | account-03(g0, 0.090909)<br>study-01(g0, 0.083333) | 0.000000 | 0.000000 |

### negative-calibration-05 · negative/calibration

이력서 연봉 협상 문구

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | - | 0.000000 | 0.000000 |
| Gemini Embedding 2 의미 검색 | - | 0.000000 | 0.000000 |
| Gemini Embedding 2 하이브리드 k=60 | - | 0.000000 | 0.000000 |
| Gemini Embedding 2 하이브리드 k=10 | - | 0.000000 | 0.000000 |

### negative-calibration-06 · negative/calibration

아기 이유식 알레르기 순서

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | travel-06(g0, 9.000000)<br>project-08(g0, 9.000000)<br>study-03(g0, 8.000000) | 0.000000 | 0.000000 |
| Gemini Embedding 2 의미 검색 | - | 0.000000 | 0.000000 |
| Gemini Embedding 2 하이브리드 k=60 | travel-06(g0, 0.016393)<br>project-08(g0, 0.016129)<br>study-03(g0, 0.015873) | 0.000000 | 0.000000 |
| Gemini Embedding 2 하이브리드 k=10 | travel-06(g0, 0.090909)<br>project-08(g0, 0.083333)<br>study-03(g0, 0.076923) | 0.000000 | 0.000000 |

### negative-calibration-07 · negative/calibration

실내 화분 진딧물 제거

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | travel-01(g0, 12.000000) | 0.000000 | 0.000000 |
| Gemini Embedding 2 의미 검색 | - | 0.000000 | 0.000000 |
| Gemini Embedding 2 하이브리드 k=60 | travel-01(g0, 0.016393) | 0.000000 | 0.000000 |
| Gemini Embedding 2 하이브리드 k=10 | travel-01(g0, 0.090909) | 0.000000 | 0.000000 |

### negative-calibration-08 · negative/calibration

웨딩 촬영 드레스 예약

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | media-03(g0, 9.000000) | 0.000000 | 0.000000 |
| Gemini Embedding 2 의미 검색 | - | 0.000000 | 0.000000 |
| Gemini Embedding 2 하이브리드 k=60 | media-03(g0, 0.016393) | 0.000000 | 0.000000 |
| Gemini Embedding 2 하이브리드 k=10 | media-03(g0, 0.090909) | 0.000000 | 0.000000 |

### negative-calibration-09 · negative/calibration

중고 자전거 체인 수리

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | - | 0.000000 | 0.000000 |
| Gemini Embedding 2 의미 검색 | - | 0.000000 | 0.000000 |
| Gemini Embedding 2 하이브리드 k=60 | - | 0.000000 | 0.000000 |
| Gemini Embedding 2 하이브리드 k=10 | - | 0.000000 | 0.000000 |

### negative-calibration-10 · negative/calibration

전세 계약 등기부 확인

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | media-05(g0, 9.000000)<br>account-07(g0, 8.000000)<br>media-11(g0, 8.000000)<br>travel-12(g0, 8.000000)<br>travel-04(g0, 8.000000)<br>travel-02(g0, 8.000000) | 0.000000 | 0.000000 |
| Gemini Embedding 2 의미 검색 | - | 0.000000 | 0.000000 |
| Gemini Embedding 2 하이브리드 k=60 | media-05(g0, 0.016393)<br>account-07(g0, 0.016129)<br>media-11(g0, 0.015873)<br>travel-12(g0, 0.015625)<br>travel-04(g0, 0.015385)<br>travel-02(g0, 0.015152) | 0.000000 | 0.000000 |
| Gemini Embedding 2 하이브리드 k=10 | media-05(g0, 0.090909)<br>account-07(g0, 0.083333)<br>media-11(g0, 0.076923)<br>travel-12(g0, 0.071429)<br>travel-04(g0, 0.066667)<br>travel-02(g0, 0.062500) | 0.000000 | 0.000000 |

### negative-check-01 · negative/check

강아지 사료 급여량

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | - | 0.000000 | 0.000000 |
| Gemini Embedding 2 의미 검색 | - | 0.000000 | 0.000000 |
| Gemini Embedding 2 하이브리드 k=60 | - | 0.000000 | 0.000000 |
| Gemini Embedding 2 하이브리드 k=10 | - | 0.000000 | 0.000000 |

### negative-check-02 · negative/check

부가가치세 세금계산서

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | - | 0.000000 | 0.000000 |
| Gemini Embedding 2 의미 검색 | account-12(g0, 0.597541)<br>travel-10(g0, 0.593336) | 0.000000 | 0.000000 |
| Gemini Embedding 2 하이브리드 k=60 | account-12(g0, 0.016393)<br>travel-10(g0, 0.016129) | 0.000000 | 0.000000 |
| Gemini Embedding 2 하이브리드 k=10 | account-12(g0, 0.090909)<br>travel-10(g0, 0.083333) | 0.000000 | 0.000000 |

### negative-check-03 · negative/check

김치 냉장고 냄새 청소

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | - | 0.000000 | 0.000000 |
| Gemini Embedding 2 의미 검색 | - | 0.000000 | 0.000000 |
| Gemini Embedding 2 하이브리드 k=60 | - | 0.000000 | 0.000000 |
| Gemini Embedding 2 하이브리드 k=10 | - | 0.000000 | 0.000000 |

### negative-check-04 · negative/check

마라톤 무릎 통증 훈련

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | travel-08(g0, 8.000000) | 0.000000 | 0.000000 |
| Gemini Embedding 2 의미 검색 | - | 0.000000 | 0.000000 |
| Gemini Embedding 2 하이브리드 k=60 | travel-08(g0, 0.016393) | 0.000000 | 0.000000 |
| Gemini Embedding 2 하이브리드 k=10 | travel-08(g0, 0.090909) | 0.000000 | 0.000000 |

### negative-check-05 · negative/check

부모님 건강검진 예약

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | - | 0.000000 | 0.000000 |
| Gemini Embedding 2 의미 검색 | travel-08(g0, 0.596113) | 0.000000 | 0.000000 |
| Gemini Embedding 2 하이브리드 k=60 | travel-08(g0, 0.016393) | 0.000000 | 0.000000 |
| Gemini Embedding 2 하이브리드 k=10 | travel-08(g0, 0.090909) | 0.000000 | 0.000000 |

### semantic-calibration-01 · semantic/calibration

통신이 끊긴 동안 작성하던 것을 연결 뒤 자동으로 보내기

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | account-08(g0, 12.000000)<br>travel-06(g0, 12.000000)<br>study-12(g0, 12.000000)<br>study-07(g0, 12.000000)<br>study-02(g0, 12.000000)<br>dev-05(g0, 12.000000) | 0.000000 | 0.000000 |
| Gemini Embedding 2 의미 검색 | dev-06(g2, 0.747432)<br>account-02(g0, 0.630679)<br>travel-06(g0, 0.621874)<br>media-09(g0, 0.611316)<br>account-04(g1, 0.608282)<br>dev-05(g0, 0.603320) | 1.000000 | 0.932778 |
| Gemini Embedding 2 하이브리드 k=60 | travel-06(g0, 0.032002)<br>account-08(g0, 0.031319)<br>dev-05(g0, 0.030303)<br>account-03(g0, 0.029418)<br>dev-06(g2, 0.016393)<br>account-02(g0, 0.016129) | 1.000000 | 0.319631 |
| Gemini Embedding 2 하이브리드 k=10 | travel-06(g0, 0.160256)<br>account-08(g0, 0.149733)<br>dev-05(g0, 0.125000)<br>account-03(g0, 0.111455)<br>dev-06(g2, 0.090909)<br>account-02(g0, 0.083333) | 1.000000 | 0.319631 |

### semantic-calibration-02 · semantic/calibration

암호를 치지 않고 얼굴이나 지문으로 서비스 들어가기

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | media-07(g0, 12.000000)<br>project-03(g0, 12.000000)<br>study-02(g0, 12.000000)<br>study-01(g0, 12.000000)<br>project-11(g0, 9.000000)<br>account-09(g0, 8.000000) | 0.000000 | 0.000000 |
| Gemini Embedding 2 의미 검색 | account-01(g2, 0.730754)<br>account-02(g0, 0.629527)<br>account-09(g0, 0.623744)<br>account-11(g0, 0.619430)<br>account-08(g0, 0.618070)<br>dev-01(g0, 0.616583) | 1.000000 | 0.826235 |
| Gemini Embedding 2 하이브리드 k=60 | account-09(g0, 0.031025)<br>account-01(g2, 0.016393)<br>media-07(g0, 0.016393)<br>account-02(g0, 0.016129)<br>project-03(g0, 0.016129)<br>study-02(g0, 0.015873) | 1.000000 | 0.521296 |
| Gemini Embedding 2 하이브리드 k=10 | account-09(g0, 0.139423)<br>account-01(g2, 0.090909)<br>media-07(g0, 0.090909)<br>account-02(g0, 0.083333)<br>project-03(g0, 0.083333)<br>study-02(g0, 0.076923) | 1.000000 | 0.521296 |

### semantic-calibration-03 · semantic/calibration

두 번째 확인 수단을 못 쓰는 때를 위한 일회용 열쇠

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | media-05(g0, 9.000000)<br>account-07(g1, 8.000000)<br>media-11(g0, 8.000000)<br>travel-12(g0, 8.000000)<br>travel-04(g0, 8.000000)<br>travel-02(g0, 8.000000) | 1.000000 | 0.173765 |
| Gemini Embedding 2 의미 검색 | account-02(g2, 0.727537)<br>account-01(g0, 0.670456)<br>account-06(g0, 0.650036)<br>account-07(g1, 0.648825)<br>dev-07(g0, 0.627194)<br>account-05(g0, 0.620886) | 1.000000 | 0.944848 |
| Gemini Embedding 2 하이브리드 k=60 | account-07(g1, 0.031754)<br>travel-04(g0, 0.029469)<br>travel-02(g0, 0.027972)<br>account-02(g2, 0.016393)<br>media-05(g0, 0.016393)<br>account-01(g0, 0.016129) | 1.000000 | 0.631251 |
| Gemini Embedding 2 하이브리드 k=10 | account-07(g1, 0.154762)<br>travel-04(g0, 0.114286)<br>travel-02(g0, 0.098214)<br>account-02(g2, 0.090909)<br>media-05(g0, 0.090909)<br>account-01(g0, 0.083333) | 1.000000 | 0.631251 |

### semantic-calibration-04 · semantic/calibration

시간이 부족한데 제품에서 제일 위험한 가정 하나만 확인하기

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | project-04(g2, 12.000000) | 1.000000 | 0.826235 |
| Gemini Embedding 2 의미 검색 | project-04(g2, 0.731857)<br>project-12(g0, 0.650916)<br>project-01(g0, 0.641551)<br>study-03(g0, 0.641132)<br>project-03(g0, 0.631994)<br>project-06(g1, 0.625158) | 1.000000 | 0.924338 |
| Gemini Embedding 2 하이브리드 k=60 | project-04(g2, 0.032787)<br>project-12(g0, 0.016129)<br>project-01(g0, 0.015873)<br>study-03(g0, 0.015625)<br>project-03(g0, 0.015385)<br>project-06(g1, 0.015152) | 1.000000 | 0.924338 |
| Gemini Embedding 2 하이브리드 k=10 | project-04(g2, 0.181818)<br>project-12(g0, 0.083333)<br>project-01(g0, 0.076923)<br>study-03(g0, 0.071429)<br>project-03(g0, 0.066667)<br>project-06(g1, 0.062500) | 1.000000 | 0.924338 |

### semantic-calibration-05 · semantic/calibration

상대의 경험을 왜곡하지 않고 듣는 면담 방법

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | media-07(g0, 12.000000)<br>project-03(g2, 12.000000)<br>study-02(g0, 12.000000)<br>study-01(g0, 12.000000)<br>study-09(g0, 8.000000) | 1.000000 | 0.521296 |
| Gemini Embedding 2 의미 검색 | project-03(g2, 0.690286)<br>media-11(g0, 0.614501)<br>media-02(g0, 0.602905)<br>study-07(g0, 0.602057)<br>media-04(g0, 0.596282)<br>project-09(g1, 0.596274) | 1.000000 | 0.924338 |
| Gemini Embedding 2 하이브리드 k=60 | project-03(g2, 0.032522)<br>study-09(g0, 0.030310)<br>media-07(g0, 0.016393)<br>media-11(g0, 0.016129)<br>media-02(g0, 0.015873)<br>study-02(g0, 0.015873) | 1.000000 | 0.826235 |
| Gemini Embedding 2 하이브리드 k=10 | project-03(g2, 0.174242)<br>study-09(g0, 0.125490)<br>media-07(g0, 0.090909)<br>media-11(g0, 0.083333)<br>media-02(g0, 0.076923)<br>study-02(g0, 0.076923) | 1.000000 | 0.826235 |

### semantic-calibration-06 · semantic/calibration

학술 자료를 전부 정독하기 전에 채택 여부 가늠하기

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | account-12(g0, 12.000000)<br>account-03(g0, 12.000000)<br>media-05(g0, 12.000000)<br>travel-11(g0, 12.000000)<br>travel-02(g0, 12.000000)<br>project-09(g0, 8.000000) | 0.000000 | 0.000000 |
| Gemini Embedding 2 의미 검색 | study-03(g2, 0.733165)<br>study-04(g1, 0.655972)<br>media-09(g0, 0.637383)<br>media-02(g0, 0.636663)<br>media-11(g0, 0.630512)<br>media-05(g0, 0.623836) | 1.000000 | 1.000000 |
| Gemini Embedding 2 하이브리드 k=60 | media-05(g0, 0.031025)<br>travel-11(g0, 0.027820)<br>travel-02(g0, 0.027730)<br>account-12(g0, 0.016393)<br>study-03(g2, 0.016393)<br>account-03(g0, 0.016129) | 1.000000 | 0.319631 |
| Gemini Embedding 2 하이브리드 k=10 | media-05(g0, 0.139423)<br>travel-11(g0, 0.102679)<br>travel-02(g0, 0.098925)<br>account-12(g0, 0.090909)<br>study-03(g2, 0.090909)<br>account-03(g0, 0.083333) | 1.000000 | 0.319631 |

### semantic-calibration-07 · semantic/calibration

정답을 가린 채 머릿속에서 배운 것을 꺼내는 연습

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | project-07(g0, 8.000000)<br>study-07(g0, 8.000000) | 0.000000 | 0.000000 |
| Gemini Embedding 2 의미 검색 | study-02(g2, 0.764821)<br>study-09(g0, 0.685934)<br>study-01(g1, 0.676684)<br>study-11(g0, 0.663386)<br>study-08(g0, 0.661965)<br>study-12(g0, 0.658672) | 1.000000 | 0.963940 |
| Gemini Embedding 2 하이브리드 k=60 | study-07(g0, 0.030835)<br>project-07(g0, 0.030478)<br>study-02(g2, 0.016393)<br>study-09(g0, 0.016129)<br>study-01(g1, 0.015873)<br>study-11(g0, 0.015625) | 1.000000 | 0.519661 |
| Gemini Embedding 2 하이브리드 k=10 | study-07(g0, 0.138889)<br>project-07(g0, 0.138528)<br>study-02(g2, 0.090909)<br>study-09(g0, 0.083333)<br>study-01(g1, 0.076923)<br>study-11(g0, 0.071429) | 1.000000 | 0.519661 |

### semantic-calibration-08 · semantic/calibration

연결편 사이에 국경 수속까지 포함한 최소 여유

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | travel-08(g0, 12.000000)<br>travel-03(g2, 8.000000) | 1.000000 | 0.521296 |
| Gemini Embedding 2 의미 검색 | travel-03(g2, 0.725712)<br>travel-06(g0, 0.641087)<br>travel-02(g1, 0.623966)<br>travel-05(g0, 0.600586)<br>travel-08(g0, 0.600497)<br>travel-04(g0, 0.588800) | 1.000000 | 0.963940 |
| Gemini Embedding 2 하이브리드 k=60 | travel-03(g2, 0.032522)<br>travel-08(g0, 0.031778)<br>travel-06(g0, 0.016129)<br>travel-02(g1, 0.015873)<br>travel-05(g0, 0.015625)<br>travel-04(g0, 0.015152) | 1.000000 | 0.944848 |
| Gemini Embedding 2 하이브리드 k=10 | travel-03(g2, 0.174242)<br>travel-08(g0, 0.157576)<br>travel-06(g0, 0.083333)<br>travel-02(g1, 0.076923)<br>travel-05(g0, 0.071429)<br>travel-04(g0, 0.062500) | 1.000000 | 0.944848 |

### semantic-calibration-09 · semantic/calibration

우천 시 걷는 구간을 줄인 제주도 하루 일정

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | project-06(g0, 12.000000)<br>travel-04(g0, 9.000000)<br>media-10(g0, 8.000000)<br>media-03(g0, 8.000000)<br>travel-07(g1, 8.000000)<br>travel-05(g0, 8.000000) | 1.000000 | 0.106544 |
| Gemini Embedding 2 의미 검색 | travel-01(g2, 0.763235)<br>travel-11(g0, 0.630195)<br>travel-07(g1, 0.617872)<br>travel-09(g0, 0.601036) | 1.000000 | 0.963940 |
| Gemini Embedding 2 하이브리드 k=60 | travel-07(g1, 0.031258)<br>travel-09(g0, 0.029710)<br>travel-01(g2, 0.029380)<br>project-06(g0, 0.016393)<br>travel-04(g0, 0.016129)<br>travel-11(g0, 0.016129) | 1.000000 | 0.688529 |
| Gemini Embedding 2 하이브리드 k=10 | travel-07(g1, 0.143590)<br>travel-01(g2, 0.127946)<br>travel-09(g0, 0.119048)<br>project-06(g0, 0.090909)<br>travel-04(g0, 0.083333)<br>travel-11(g0, 0.083333) | 1.000000 | 0.796708 |

### semantic-calibration-10 · semantic/calibration

말 한마디 단서로 재생 지점을 찾아가기

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | project-09(g0, 12.000000) | 0.000000 | 0.000000 |
| Gemini Embedding 2 의미 검색 | media-04(g1, 0.702459)<br>media-08(g2, 0.696319)<br>media-10(g0, 0.642659)<br>media-02(g0, 0.627578)<br>media-07(g0, 0.623241)<br>project-07(g0, 0.618893) | 1.000000 | 0.796708 |
| Gemini Embedding 2 하이브리드 k=60 | project-09(g0, 0.028442)<br>media-04(g1, 0.016393)<br>media-08(g2, 0.016129)<br>media-10(g0, 0.015873)<br>media-02(g0, 0.015625)<br>media-07(g0, 0.015385) | 1.000000 | 0.586883 |
| Gemini Embedding 2 하이브리드 k=10 | project-09(g0, 0.121212)<br>media-04(g1, 0.090909)<br>media-08(g2, 0.083333)<br>media-10(g0, 0.076923)<br>media-02(g0, 0.071429)<br>media-07(g0, 0.066667) | 1.000000 | 0.586883 |

### semantic-check-01 · semantic/check

각자 다른 화폐로 낸 돈을 공평하게 나누는 방법

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | media-05(g0, 12.000000)<br>travel-10(g2, 12.000000)<br>study-09(g0, 8.000000) | 1.000000 | 0.630930 |
| Gemini Embedding 2 의미 검색 | travel-10(g2, 0.736724)<br>study-11(g0, 0.588163) | 1.000000 | 1.000000 |
| Gemini Embedding 2 하이브리드 k=60 | travel-10(g2, 0.032522)<br>media-05(g0, 0.016393)<br>study-11(g0, 0.016129)<br>study-09(g0, 0.015873) | 1.000000 | 1.000000 |
| Gemini Embedding 2 하이브리드 k=10 | travel-10(g2, 0.174242)<br>media-05(g0, 0.090909)<br>study-11(g0, 0.083333)<br>study-09(g0, 0.076923) | 1.000000 | 1.000000 |

### semantic-check-02 · semantic/check

한산한 골목을 자연광 좋은 시간에 촬영하기

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | media-06(g0, 12.000000) | 0.000000 | 0.000000 |
| Gemini Embedding 2 의미 검색 | travel-09(g2, 0.721401) | 1.000000 | 0.826235 |
| Gemini Embedding 2 하이브리드 k=60 | media-06(g0, 0.016393)<br>travel-09(g2, 0.016393) | 1.000000 | 0.521296 |
| Gemini Embedding 2 하이브리드 k=10 | media-06(g0, 0.090909)<br>travel-09(g2, 0.090909) | 1.000000 | 0.521296 |

### semantic-check-03 · semantic/check

새 장비로 바꾸기 전 저장한 웹 주소들을 옮길 파일 만들기

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | account-06(g0, 35.000000)<br>account-03(g2, 16.000000)<br>travel-12(g0, 12.000000)<br>project-04(g0, 12.000000)<br>study-04(g0, 12.000000)<br>account-01(g0, 10.000000) | 1.000000 | 0.521296 |
| Gemini Embedding 2 의미 검색 | account-03(g2, 0.783557)<br>account-06(g0, 0.685746)<br>media-09(g0, 0.644051)<br>dev-06(g0, 0.641906)<br>account-08(g0, 0.639852)<br>account-10(g1, 0.635538) | 1.000000 | 0.924338 |
| Gemini Embedding 2 하이브리드 k=60 | account-03(g2, 0.032522)<br>account-06(g0, 0.032522)<br>media-06(g0, 0.029851)<br>account-10(g1, 0.029644)<br>account-01(g0, 0.029040)<br>travel-02(g0, 0.027588) | 1.000000 | 0.944848 |
| Gemini Embedding 2 하이브리드 k=10 | account-03(g2, 0.174242)<br>account-06(g0, 0.174242)<br>media-06(g0, 0.117647)<br>account-10(g1, 0.115132)<br>account-01(g0, 0.107955)<br>travel-02(g0, 0.088933) | 1.000000 | 0.944848 |

### semantic-check-04 · semantic/check

모임 뒤 책임질 사람과 마감 시점을 적어 두기

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | account-08(g0, 12.000000)<br>project-04(g0, 12.000000)<br>study-12(g0, 12.000000)<br>study-02(g0, 12.000000)<br>dev-05(g0, 12.000000) | 0.000000 | 0.000000 |
| Gemini Embedding 2 의미 검색 | project-10(g2, 0.712699)<br>project-05(g1, 0.700998)<br>project-06(g0, 0.666553)<br>project-04(g0, 0.641042)<br>media-04(g0, 0.639423)<br>project-02(g0, 0.635658) | 1.000000 | 1.000000 |
| Gemini Embedding 2 하이브리드 k=60 | project-04(g0, 0.031754)<br>study-12(g0, 0.030366)<br>account-08(g0, 0.029907)<br>study-02(g0, 0.025429)<br>project-10(g2, 0.016393)<br>project-05(g1, 0.016129) | 1.000000 | 0.417735 |
| Gemini Embedding 2 하이브리드 k=10 | project-04(g0, 0.154762)<br>account-08(g0, 0.132576)<br>study-12(g0, 0.129555)<br>project-10(g2, 0.090909)<br>study-02(g0, 0.090659)<br>project-05(g1, 0.083333) | 1.000000 | 0.453943 |

### semantic-check-05 · semantic/check

읽은 내용을 근거와 반대 의견으로 짧게 압축하기

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | account-04(g0, 12.000000)<br>media-01(g2, 12.000000)<br>travel-01(g0, 12.000000)<br>study-02(g0, 12.000000)<br>dev-06(g0, 12.000000) | 1.000000 | 0.521296 |
| Gemini Embedding 2 의미 검색 | media-01(g2, 0.755892)<br>study-03(g0, 0.636908)<br>study-12(g1, 0.624662)<br>media-09(g0, 0.623888)<br>media-05(g0, 0.620417)<br>media-06(g0, 0.618644) | 1.000000 | 0.963940 |
| Gemini Embedding 2 하이브리드 k=60 | media-01(g2, 0.032522)<br>study-02(g0, 0.029911)<br>account-04(g0, 0.016393)<br>study-03(g0, 0.016129)<br>study-12(g1, 0.015873)<br>travel-01(g0, 0.015873) | 1.000000 | 0.932778 |
| Gemini Embedding 2 하이브리드 k=10 | media-01(g2, 0.174242)<br>study-02(g0, 0.121429)<br>account-04(g0, 0.090909)<br>study-03(g0, 0.083333)<br>study-12(g1, 0.076923)<br>travel-01(g0, 0.076923) | 1.000000 | 0.932778 |
