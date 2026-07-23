# 꺼내보기 로컬 E5 합성 탐색 결과

> **해석 제한: 이 합성 평가는 통계적 우월성을 증명하지 않음.**
> 작은 고정 corpus에서 실패 유형을 찾고 실제 개인 데이터 파일럿 후보를 고르기 위한 탐색 결과다.

## 실행 계약

| 항목 | 값 |
| --- | --- |
| manifest SHA-256 | `4d08ca6eaee0e678460d902cc77076e2d0348e385eeb7e75453f4aa1642b12b5` |
| corpus 버전 | `exploratory-corpus-v1` |
| corpus SHA-256 | `91eb31bf622438b4a8319c7dd389761edaf006928c7ccca8c0da03f74c958c41` |
| query 버전 | `exploratory-queries-v1` |
| query SHA-256 | `3384643d0d6eef83330720be5c76dcc2a7f29378b6f7afc4207ee956a2bbd183` |
| 공급자 | `transformers-js@4.2.0:cpu:q8` |
| 모델 | `Xenova/multilingual-e5-small` |
| 모델 리비전 | `761b726dd34fb83930e26aab4e9ac3899aa1fa78` |

## Semantic threshold calibration

외부 기본값을 가져오지 않고 negative calibration 상위 점수의 50·90·100 분위만 비교했다.
선택값은 가장 높은 negative calibration 점수이며, 실제 반환은 이 값을 **엄격히 초과**한 결과만 허용한다.

| threshold | positive Recall@5 | positive nDCG@6 | negative 평균 반환 수 | 상태 |
| ---: | ---: | ---: | ---: | --- |
| 0.801309 | 0.900000 | 0.791543 | 1.900000 |  |
| 0.818834 | 0.900000 | 0.785613 | 0.600000 |  |
| 0.827695 | 0.800000 | 0.711793 | 0.000000 | 선택 |

선택 threshold: `0.827695`

## Slice·phase 집계

| slice | phase | 후보 | Recall@5 | MRR@6 | nDCG@6 | 평균 반환 수 |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| lexical | calibration | 현행 어휘 검색 | 1.000000 | 1.000000 | 0.949537 | 2.800000 |
| lexical | calibration | 로컬 E5 의미 검색 | 1.000000 | 1.000000 | 0.941971 | 4.300000 |
| lexical | calibration | 로컬 E5 하이브리드 k=60 | 1.000000 | 1.000000 | 0.949537 | 4.900000 |
| lexical | calibration | 로컬 E5 하이브리드 k=10 | 1.000000 | 1.000000 | 0.949537 | 4.900000 |
| lexical | check | 현행 어휘 검색 | 1.000000 | 1.000000 | 1.000000 | 3.800000 |
| lexical | check | 로컬 E5 의미 검색 | 1.000000 | 1.000000 | 1.000000 | 2.600000 |
| lexical | check | 로컬 E5 하이브리드 k=60 | 1.000000 | 1.000000 | 1.000000 | 4.400000 |
| lexical | check | 로컬 E5 하이브리드 k=10 | 1.000000 | 1.000000 | 1.000000 | 4.400000 |
| semantic | calibration | 현행 어휘 검색 | 0.500000 | 0.270000 | 0.214914 | 4.100000 |
| semantic | calibration | 로컬 E5 의미 검색 | 0.600000 | 0.550000 | 0.481616 | 3.200000 |
| semantic | calibration | 로컬 E5 하이브리드 k=60 | 0.900000 | 0.520000 | 0.462195 | 5.600000 |
| semantic | calibration | 로컬 E5 하이브리드 k=10 | 0.900000 | 0.520000 | 0.462195 | 5.600000 |
| semantic | check | 현행 어휘 검색 | 0.600000 | 0.300000 | 0.334704 | 4.000000 |
| semantic | check | 로컬 E5 의미 검색 | 0.600000 | 0.600000 | 0.511144 | 3.400000 |
| semantic | check | 로컬 E5 하이브리드 k=60 | 0.800000 | 0.566667 | 0.555389 | 4.400000 |
| semantic | check | 로컬 E5 하이브리드 k=10 | 0.800000 | 0.566667 | 0.555389 | 4.400000 |
| negative | calibration | 현행 어휘 검색 | 0.000000 | 0.000000 | 0.000000 | 1.500000 |
| negative | calibration | 로컬 E5 의미 검색 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| negative | calibration | 로컬 E5 하이브리드 k=60 | 0.000000 | 0.000000 | 0.000000 | 1.500000 |
| negative | calibration | 로컬 E5 하이브리드 k=10 | 0.000000 | 0.000000 | 0.000000 | 1.500000 |
| negative | check | 현행 어휘 검색 | 0.000000 | 0.000000 | 0.000000 | 0.200000 |
| negative | check | 로컬 E5 의미 검색 | 0.000000 | 0.000000 | 0.000000 | 0.000000 |
| negative | check | 로컬 E5 하이브리드 k=60 | 0.000000 | 0.000000 | 0.000000 | 0.200000 |
| negative | check | 로컬 E5 하이브리드 k=10 | 0.000000 | 0.000000 | 0.000000 | 0.200000 |

## 현행 대비 query별 nDCG@6

| 후보 | wins | ties | losses |
| --- | ---: | ---: | ---: |
| 로컬 E5 의미 검색 | 10 | 14 | 6 |
| 로컬 E5 하이브리드 k=60 | 9 | 18 | 3 |
| 로컬 E5 하이브리드 k=10 | 9 | 18 | 3 |

## RRF 민감도

- k=60: 9승 18무 3패
- k=10: 9승 18무 3패
- 결론 방향 뒤집힘: 아니요

## critical miss

- semantic-calibration-08 · 로컬 E5 의미 검색 · travel-03
- semantic-check-01 · 로컬 E5 의미 검색 · travel-10

## Negative query 반환 수

| query | phase | 후보 | 반환 수 |
| --- | --- | --- | ---: |
| negative-calibration-01 | calibration | 현행 어휘 검색 | 2 |
| negative-calibration-01 | calibration | 로컬 E5 의미 검색 | 0 |
| negative-calibration-01 | calibration | 로컬 E5 하이브리드 k=60 | 2 |
| negative-calibration-01 | calibration | 로컬 E5 하이브리드 k=10 | 2 |
| negative-calibration-02 | calibration | 현행 어휘 검색 | 0 |
| negative-calibration-02 | calibration | 로컬 E5 의미 검색 | 0 |
| negative-calibration-02 | calibration | 로컬 E5 하이브리드 k=60 | 0 |
| negative-calibration-02 | calibration | 로컬 E5 하이브리드 k=10 | 0 |
| negative-calibration-03 | calibration | 현행 어휘 검색 | 0 |
| negative-calibration-03 | calibration | 로컬 E5 의미 검색 | 0 |
| negative-calibration-03 | calibration | 로컬 E5 하이브리드 k=60 | 0 |
| negative-calibration-03 | calibration | 로컬 E5 하이브리드 k=10 | 0 |
| negative-calibration-04 | calibration | 현행 어휘 검색 | 2 |
| negative-calibration-04 | calibration | 로컬 E5 의미 검색 | 0 |
| negative-calibration-04 | calibration | 로컬 E5 하이브리드 k=60 | 2 |
| negative-calibration-04 | calibration | 로컬 E5 하이브리드 k=10 | 2 |
| negative-calibration-05 | calibration | 현행 어휘 검색 | 0 |
| negative-calibration-05 | calibration | 로컬 E5 의미 검색 | 0 |
| negative-calibration-05 | calibration | 로컬 E5 하이브리드 k=60 | 0 |
| negative-calibration-05 | calibration | 로컬 E5 하이브리드 k=10 | 0 |
| negative-calibration-06 | calibration | 현행 어휘 검색 | 3 |
| negative-calibration-06 | calibration | 로컬 E5 의미 검색 | 0 |
| negative-calibration-06 | calibration | 로컬 E5 하이브리드 k=60 | 3 |
| negative-calibration-06 | calibration | 로컬 E5 하이브리드 k=10 | 3 |
| negative-calibration-07 | calibration | 현행 어휘 검색 | 1 |
| negative-calibration-07 | calibration | 로컬 E5 의미 검색 | 0 |
| negative-calibration-07 | calibration | 로컬 E5 하이브리드 k=60 | 1 |
| negative-calibration-07 | calibration | 로컬 E5 하이브리드 k=10 | 1 |
| negative-calibration-08 | calibration | 현행 어휘 검색 | 1 |
| negative-calibration-08 | calibration | 로컬 E5 의미 검색 | 0 |
| negative-calibration-08 | calibration | 로컬 E5 하이브리드 k=60 | 1 |
| negative-calibration-08 | calibration | 로컬 E5 하이브리드 k=10 | 1 |
| negative-calibration-09 | calibration | 현행 어휘 검색 | 0 |
| negative-calibration-09 | calibration | 로컬 E5 의미 검색 | 0 |
| negative-calibration-09 | calibration | 로컬 E5 하이브리드 k=60 | 0 |
| negative-calibration-09 | calibration | 로컬 E5 하이브리드 k=10 | 0 |
| negative-calibration-10 | calibration | 현행 어휘 검색 | 6 |
| negative-calibration-10 | calibration | 로컬 E5 의미 검색 | 0 |
| negative-calibration-10 | calibration | 로컬 E5 하이브리드 k=60 | 6 |
| negative-calibration-10 | calibration | 로컬 E5 하이브리드 k=10 | 6 |
| negative-check-01 | check | 현행 어휘 검색 | 0 |
| negative-check-01 | check | 로컬 E5 의미 검색 | 0 |
| negative-check-01 | check | 로컬 E5 하이브리드 k=60 | 0 |
| negative-check-01 | check | 로컬 E5 하이브리드 k=10 | 0 |
| negative-check-02 | check | 현행 어휘 검색 | 0 |
| negative-check-02 | check | 로컬 E5 의미 검색 | 0 |
| negative-check-02 | check | 로컬 E5 하이브리드 k=60 | 0 |
| negative-check-02 | check | 로컬 E5 하이브리드 k=10 | 0 |
| negative-check-03 | check | 현행 어휘 검색 | 0 |
| negative-check-03 | check | 로컬 E5 의미 검색 | 0 |
| negative-check-03 | check | 로컬 E5 하이브리드 k=60 | 0 |
| negative-check-03 | check | 로컬 E5 하이브리드 k=10 | 0 |
| negative-check-04 | check | 현행 어휘 검색 | 1 |
| negative-check-04 | check | 로컬 E5 의미 검색 | 0 |
| negative-check-04 | check | 로컬 E5 하이브리드 k=60 | 1 |
| negative-check-04 | check | 로컬 E5 하이브리드 k=10 | 1 |
| negative-check-05 | check | 현행 어휘 검색 | 0 |
| negative-check-05 | check | 로컬 E5 의미 검색 | 0 |
| negative-check-05 | check | 로컬 E5 하이브리드 k=60 | 0 |
| negative-check-05 | check | 로컬 E5 하이브리드 k=10 | 0 |

## Query별 결과와 오류 사례



### lexical-calibration-01 · lexical/calibration

React 폼 검증

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | dev-01(g2, 31.500000)<br>dev-03(g1, 12.000000)<br>media-11(g0, 9.000000)<br>project-04(g0, 8.000000) | 1.000000 | 0.878962 |
| 로컬 E5 의미 검색 | dev-01(g2, 0.919912)<br>dev-03(g1, 0.863486)<br>media-11(g0, 0.862286)<br>project-04(g0, 0.858872)<br>dev-09(g0, 0.856002)<br>project-09(g0, 0.854820) | 1.000000 | 0.878962 |
| 로컬 E5 하이브리드 k=60 | dev-01(g2, 0.032787)<br>dev-03(g1, 0.032258)<br>media-11(g0, 0.031746)<br>project-04(g0, 0.031250)<br>dev-09(g0, 0.015385)<br>project-09(g0, 0.015152) | 1.000000 | 0.878962 |
| 로컬 E5 하이브리드 k=10 | dev-01(g2, 0.181818)<br>dev-03(g1, 0.166667)<br>media-11(g0, 0.153846)<br>project-04(g0, 0.142857)<br>dev-09(g0, 0.066667)<br>project-09(g0, 0.062500) | 1.000000 | 0.878962 |

### lexical-calibration-02 · lexical/calibration

캐시 무효화

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | dev-05(g2, 18.000000) | 1.000000 | 1.000000 |
| 로컬 E5 의미 검색 | dev-05(g2, 0.842728) | 1.000000 | 1.000000 |
| 로컬 E5 하이브리드 k=60 | dev-05(g2, 0.032787) | 1.000000 | 1.000000 |
| 로컬 E5 하이브리드 k=10 | dev-05(g2, 0.181818) | 1.000000 | 1.000000 |

### lexical-calibration-03 · lexical/calibration

출처 인용 체크리스트

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | study-04(g2, 27.000000)<br>media-05(g1, 9.000000)<br>media-04(g0, 9.000000)<br>media-11(g0, 8.000000) | 1.000000 | 1.000000 |
| 로컬 E5 의미 검색 | study-04(g2, 0.887120)<br>travel-02(g0, 0.840005)<br>media-11(g0, 0.836281)<br>media-07(g0, 0.836239)<br>project-03(g0, 0.836198)<br>dev-03(g0, 0.835314) | 1.000000 | 0.826235 |
| 로컬 E5 하이브리드 k=60 | study-04(g2, 0.032787)<br>media-11(g0, 0.031498)<br>media-05(g1, 0.030835)<br>travel-02(g0, 0.016129)<br>media-04(g0, 0.015873)<br>media-07(g0, 0.015625) | 1.000000 | 0.963940 |
| 로컬 E5 하이브리드 k=10 | study-04(g2, 0.181818)<br>media-11(g0, 0.148352)<br>media-05(g1, 0.138889)<br>travel-02(g0, 0.083333)<br>media-04(g0, 0.076923)<br>media-07(g0, 0.071429) | 1.000000 | 0.963940 |

### lexical-calibration-04 · lexical/calibration

공모전 문제 정의

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | project-01(g2, 27.000000)<br>project-08(g0, 12.000000)<br>study-11(g0, 8.000000)<br>study-06(g0, 8.000000) | 1.000000 | 0.826235 |
| 로컬 E5 의미 검색 | project-01(g2, 0.897670)<br>study-06(g0, 0.837171)<br>study-11(g0, 0.835891)<br>project-11(g0, 0.831123)<br>project-04(g0, 0.829484)<br>project-02(g1, 0.828240) | 1.000000 | 0.924338 |
| 로컬 E5 하이브리드 k=60 | project-01(g2, 0.032787)<br>study-06(g0, 0.031754)<br>study-11(g0, 0.031746)<br>project-08(g0, 0.016129)<br>project-11(g0, 0.015625)<br>project-04(g0, 0.015385) | 1.000000 | 0.826235 |
| 로컬 E5 하이브리드 k=10 | project-01(g2, 0.181818)<br>study-06(g0, 0.154762)<br>study-11(g0, 0.153846)<br>project-08(g0, 0.083333)<br>project-11(g0, 0.071429)<br>project-04(g0, 0.066667) | 1.000000 | 0.826235 |

### lexical-calibration-05 · lexical/calibration

제주 비 오는 날

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | travel-01(g2, 36.000000)<br>project-11(g0, 14.000000)<br>account-01(g0, 8.000000)<br>dev-04(g0, 8.000000)<br>travel-08(g0, 7.000000)<br>account-06(g0, 6.000000) | 1.000000 | 1.000000 |
| 로컬 E5 의미 검색 | travel-01(g2, 0.859764) | 1.000000 | 1.000000 |
| 로컬 E5 하이브리드 k=60 | travel-01(g2, 0.032787)<br>project-11(g0, 0.016129)<br>account-01(g0, 0.015873)<br>dev-04(g0, 0.015625)<br>travel-08(g0, 0.015385)<br>account-06(g0, 0.015152) | 1.000000 | 1.000000 |
| 로컬 E5 하이브리드 k=10 | travel-01(g2, 0.181818)<br>project-11(g0, 0.083333)<br>account-01(g0, 0.076923)<br>dev-04(g0, 0.071429)<br>travel-08(g0, 0.066667)<br>account-06(g0, 0.062500) | 1.000000 | 1.000000 |

### lexical-calibration-06 · lexical/calibration

기내 반입 보조배터리

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | travel-02(g2, 26.000000) | 1.000000 | 1.000000 |
| 로컬 E5 의미 검색 | travel-02(g2, 0.864039) | 1.000000 | 1.000000 |
| 로컬 E5 하이브리드 k=60 | travel-02(g2, 0.032787) | 1.000000 | 1.000000 |
| 로컬 E5 하이브리드 k=10 | travel-02(g2, 0.181818) | 1.000000 | 1.000000 |

### lexical-calibration-07 · lexical/calibration

팟캐스트 타임스탬프

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | media-04(g2, 18.000000) | 1.000000 | 0.826235 |
| 로컬 E5 의미 검색 | media-04(g2, 0.893770)<br>travel-03(g0, 0.841710)<br>travel-05(g0, 0.836615)<br>travel-09(g0, 0.835225)<br>dev-05(g0, 0.833686)<br>media-10(g0, 0.831747) | 1.000000 | 0.826235 |
| 로컬 E5 하이브리드 k=60 | media-04(g2, 0.032787)<br>travel-03(g0, 0.016129)<br>travel-05(g0, 0.015873)<br>travel-09(g0, 0.015625)<br>dev-05(g0, 0.015385)<br>media-10(g0, 0.015152) | 1.000000 | 0.826235 |
| 로컬 E5 하이브리드 k=10 | media-04(g2, 0.181818)<br>travel-03(g0, 0.083333)<br>travel-05(g0, 0.076923)<br>travel-09(g0, 0.071429)<br>dev-05(g0, 0.066667)<br>media-10(g0, 0.062500) | 1.000000 | 0.826235 |

### lexical-calibration-08 · lexical/calibration

브라우저 북마크 내보내기

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | account-03(g2, 27.000000)<br>dev-07(g0, 12.000000) | 1.000000 | 1.000000 |
| 로컬 E5 의미 검색 | account-03(g2, 0.905677)<br>account-05(g0, 0.847102)<br>travel-11(g0, 0.831410)<br>travel-10(g0, 0.830481) | 1.000000 | 1.000000 |
| 로컬 E5 하이브리드 k=60 | account-03(g2, 0.032787)<br>account-05(g0, 0.016129)<br>dev-07(g0, 0.016129)<br>travel-11(g0, 0.015873)<br>travel-10(g0, 0.015625) | 1.000000 | 1.000000 |
| 로컬 E5 하이브리드 k=10 | account-03(g2, 0.181818)<br>account-05(g0, 0.083333)<br>dev-07(g0, 0.083333)<br>travel-11(g0, 0.076923)<br>travel-10(g0, 0.071429) | 1.000000 | 1.000000 |

### lexical-calibration-09 · lexical/calibration

복구 코드 2단계 인증

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | account-02(g2, 42.000000)<br>account-01(g1, 8.000000) | 1.000000 | 1.000000 |
| 로컬 E5 의미 검색 | account-02(g2, 0.908369)<br>account-01(g1, 0.844287)<br>dev-12(g0, 0.838879)<br>dev-02(g0, 0.838266)<br>dev-01(g0, 0.836720)<br>account-05(g0, 0.836225) | 1.000000 | 1.000000 |
| 로컬 E5 하이브리드 k=60 | account-02(g2, 0.032787)<br>account-01(g1, 0.032258)<br>dev-12(g0, 0.015873)<br>dev-02(g0, 0.015625)<br>dev-01(g0, 0.015385)<br>account-05(g0, 0.015152) | 1.000000 | 1.000000 |
| 로컬 E5 하이브리드 k=10 | account-02(g2, 0.181818)<br>account-01(g1, 0.166667)<br>dev-12(g0, 0.076923)<br>dev-02(g0, 0.071429)<br>dev-01(g0, 0.066667)<br>account-05(g0, 0.062500) | 1.000000 | 1.000000 |

### lexical-calibration-10 · lexical/calibration

비밀번호 관리자 이전

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | account-06(g2, 27.000000)<br>account-05(g0, 12.000000)<br>account-01(g1, 12.000000) | 1.000000 | 0.963940 |
| 로컬 E5 의미 검색 | account-06(g2, 0.889913)<br>account-08(g0, 0.844545)<br>account-01(g1, 0.841934)<br>account-11(g0, 0.840920)<br>account-03(g0, 0.837851)<br>account-07(g0, 0.836871) | 1.000000 | 0.963940 |
| 로컬 E5 하이브리드 k=60 | account-06(g2, 0.032787)<br>account-01(g1, 0.031746)<br>account-05(g0, 0.030835)<br>account-08(g0, 0.016129)<br>account-11(g0, 0.015625)<br>account-03(g0, 0.015385) | 1.000000 | 1.000000 |
| 로컬 E5 하이브리드 k=10 | account-06(g2, 0.181818)<br>account-01(g1, 0.153846)<br>account-05(g0, 0.138889)<br>account-08(g0, 0.083333)<br>account-11(g0, 0.071429)<br>account-03(g0, 0.066667) | 1.000000 | 1.000000 |

### lexical-check-01 · lexical/check

Supabase RLS

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | dev-08(g2, 22.500000) | 1.000000 | 1.000000 |
| 로컬 E5 의미 검색 | dev-08(g2, 0.874392) | 1.000000 | 1.000000 |
| 로컬 E5 하이브리드 k=60 | dev-08(g2, 0.032787) | 1.000000 | 1.000000 |
| 로컬 E5 하이브리드 k=10 | dev-08(g2, 0.181818) | 1.000000 | 1.000000 |

### lexical-check-02 · lexical/check

오답 노트

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | study-11(g2, 18.000000)<br>media-11(g0, 9.000000)<br>study-12(g0, 9.000000) | 1.000000 | 1.000000 |
| 로컬 E5 의미 검색 | study-11(g2, 0.873840)<br>study-12(g0, 0.832873)<br>project-03(g0, 0.832184) | 1.000000 | 1.000000 |
| 로컬 E5 하이브리드 k=60 | study-11(g2, 0.032787)<br>study-12(g0, 0.032002)<br>media-11(g0, 0.016129)<br>project-03(g0, 0.015873) | 1.000000 | 1.000000 |
| 로컬 E5 하이브리드 k=10 | study-11(g2, 0.181818)<br>study-12(g0, 0.160256)<br>media-11(g0, 0.083333)<br>project-03(g0, 0.076923) | 1.000000 | 1.000000 |

### lexical-check-03 · lexical/check

사용자 테스트 관찰

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | project-09(g2, 24.000000)<br>project-01(g0, 12.000000)<br>dev-10(g0, 9.000000)<br>dev-08(g0, 8.000000)<br>dev-03(g0, 8.000000) | 1.000000 | 1.000000 |
| 로컬 E5 의미 검색 | project-09(g2, 0.899961)<br>dev-10(g0, 0.846858)<br>project-03(g0, 0.844982)<br>account-11(g0, 0.834563) | 1.000000 | 1.000000 |
| 로컬 E5 하이브리드 k=60 | project-09(g2, 0.032787)<br>dev-10(g0, 0.032002)<br>project-01(g0, 0.016129)<br>project-03(g0, 0.015873)<br>account-11(g0, 0.015625)<br>dev-08(g0, 0.015625) | 1.000000 | 1.000000 |
| 로컬 E5 하이브리드 k=10 | project-09(g2, 0.181818)<br>dev-10(g0, 0.160256)<br>project-01(g0, 0.083333)<br>project-03(g0, 0.076923)<br>account-11(g0, 0.071429)<br>dev-08(g0, 0.071429) | 1.000000 | 1.000000 |

### lexical-check-04 · lexical/check

여행 경비 정산

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | travel-10(g2, 33.000000)<br>travel-08(g0, 15.000000)<br>travel-12(g0, 6.000000)<br>travel-11(g0, 6.000000)<br>travel-09(g0, 6.000000)<br>travel-07(g0, 6.000000) | 1.000000 | 1.000000 |
| 로컬 E5 의미 검색 | travel-10(g2, 0.866235)<br>travel-11(g0, 0.834403) | 1.000000 | 1.000000 |
| 로컬 E5 하이브리드 k=60 | travel-10(g2, 0.032787)<br>travel-11(g0, 0.031754)<br>travel-08(g0, 0.016129)<br>travel-12(g0, 0.015873)<br>travel-09(g0, 0.015385)<br>travel-07(g0, 0.015152) | 1.000000 | 1.000000 |
| 로컬 E5 하이브리드 k=10 | travel-10(g2, 0.181818)<br>travel-11(g0, 0.154762)<br>travel-08(g0, 0.083333)<br>travel-12(g0, 0.076923)<br>travel-09(g0, 0.066667)<br>travel-07(g0, 0.062500) | 1.000000 | 1.000000 |

### lexical-check-05 · lexical/check

의심스러운 로그인

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | account-07(g2, 18.000000)<br>dev-07(g0, 12.000000)<br>dev-01(g0, 12.000000)<br>account-01(g0, 9.000000) | 1.000000 | 1.000000 |
| 로컬 E5 의미 검색 | account-07(g2, 0.884930)<br>account-08(g0, 0.838429)<br>account-01(g0, 0.837330) | 1.000000 | 1.000000 |
| 로컬 E5 하이브리드 k=60 | account-07(g2, 0.032787)<br>account-01(g0, 0.031498)<br>account-08(g0, 0.016129)<br>dev-07(g0, 0.016129)<br>dev-01(g0, 0.015873) | 1.000000 | 1.000000 |
| 로컬 E5 하이브리드 k=10 | account-07(g2, 0.181818)<br>account-01(g0, 0.148352)<br>account-08(g0, 0.083333)<br>dev-07(g0, 0.083333)<br>dev-01(g0, 0.076923) | 1.000000 | 1.000000 |

### negative-calibration-01 · negative/calibration

고양이 예방접종 일정

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | project-06(g0, 12.000000)<br>travel-07(g0, 8.000000) | 0.000000 | 0.000000 |
| 로컬 E5 의미 검색 | - | 0.000000 | 0.000000 |
| 로컬 E5 하이브리드 k=60 | project-06(g0, 0.016393)<br>travel-07(g0, 0.016129) | 0.000000 | 0.000000 |
| 로컬 E5 하이브리드 k=10 | project-06(g0, 0.090909)<br>travel-07(g0, 0.083333) | 0.000000 | 0.000000 |

### negative-calibration-02 · negative/calibration

주식 양도소득세 신고

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | - | 0.000000 | 0.000000 |
| 로컬 E5 의미 검색 | - | 0.000000 | 0.000000 |
| 로컬 E5 하이브리드 k=60 | - | 0.000000 | 0.000000 |
| 로컬 E5 하이브리드 k=10 | - | 0.000000 | 0.000000 |

### negative-calibration-03 · negative/calibration

집에서 천연 발효빵 굽기

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | - | 0.000000 | 0.000000 |
| 로컬 E5 의미 검색 | - | 0.000000 | 0.000000 |
| 로컬 E5 하이브리드 k=60 | - | 0.000000 | 0.000000 |
| 로컬 E5 하이브리드 k=10 | - | 0.000000 | 0.000000 |

### negative-calibration-04 · negative/calibration

자동차 엔진오일 교체 주기

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | account-03(g0, 12.000000)<br>study-01(g0, 8.000000) | 0.000000 | 0.000000 |
| 로컬 E5 의미 검색 | - | 0.000000 | 0.000000 |
| 로컬 E5 하이브리드 k=60 | account-03(g0, 0.016393)<br>study-01(g0, 0.016129) | 0.000000 | 0.000000 |
| 로컬 E5 하이브리드 k=10 | account-03(g0, 0.090909)<br>study-01(g0, 0.083333) | 0.000000 | 0.000000 |

### negative-calibration-05 · negative/calibration

이력서 연봉 협상 문구

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | - | 0.000000 | 0.000000 |
| 로컬 E5 의미 검색 | - | 0.000000 | 0.000000 |
| 로컬 E5 하이브리드 k=60 | - | 0.000000 | 0.000000 |
| 로컬 E5 하이브리드 k=10 | - | 0.000000 | 0.000000 |

### negative-calibration-06 · negative/calibration

아기 이유식 알레르기 순서

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | travel-06(g0, 9.000000)<br>project-08(g0, 9.000000)<br>study-03(g0, 8.000000) | 0.000000 | 0.000000 |
| 로컬 E5 의미 검색 | - | 0.000000 | 0.000000 |
| 로컬 E5 하이브리드 k=60 | travel-06(g0, 0.016393)<br>project-08(g0, 0.016129)<br>study-03(g0, 0.015873) | 0.000000 | 0.000000 |
| 로컬 E5 하이브리드 k=10 | travel-06(g0, 0.090909)<br>project-08(g0, 0.083333)<br>study-03(g0, 0.076923) | 0.000000 | 0.000000 |

### negative-calibration-07 · negative/calibration

실내 화분 진딧물 제거

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | travel-01(g0, 12.000000) | 0.000000 | 0.000000 |
| 로컬 E5 의미 검색 | - | 0.000000 | 0.000000 |
| 로컬 E5 하이브리드 k=60 | travel-01(g0, 0.016393) | 0.000000 | 0.000000 |
| 로컬 E5 하이브리드 k=10 | travel-01(g0, 0.090909) | 0.000000 | 0.000000 |

### negative-calibration-08 · negative/calibration

웨딩 촬영 드레스 예약

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | media-03(g0, 9.000000) | 0.000000 | 0.000000 |
| 로컬 E5 의미 검색 | - | 0.000000 | 0.000000 |
| 로컬 E5 하이브리드 k=60 | media-03(g0, 0.016393) | 0.000000 | 0.000000 |
| 로컬 E5 하이브리드 k=10 | media-03(g0, 0.090909) | 0.000000 | 0.000000 |

### negative-calibration-09 · negative/calibration

중고 자전거 체인 수리

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | - | 0.000000 | 0.000000 |
| 로컬 E5 의미 검색 | - | 0.000000 | 0.000000 |
| 로컬 E5 하이브리드 k=60 | - | 0.000000 | 0.000000 |
| 로컬 E5 하이브리드 k=10 | - | 0.000000 | 0.000000 |

### negative-calibration-10 · negative/calibration

전세 계약 등기부 확인

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | media-05(g0, 9.000000)<br>account-07(g0, 8.000000)<br>media-11(g0, 8.000000)<br>travel-12(g0, 8.000000)<br>travel-04(g0, 8.000000)<br>travel-02(g0, 8.000000) | 0.000000 | 0.000000 |
| 로컬 E5 의미 검색 | - | 0.000000 | 0.000000 |
| 로컬 E5 하이브리드 k=60 | media-05(g0, 0.016393)<br>account-07(g0, 0.016129)<br>media-11(g0, 0.015873)<br>travel-12(g0, 0.015625)<br>travel-04(g0, 0.015385)<br>travel-02(g0, 0.015152) | 0.000000 | 0.000000 |
| 로컬 E5 하이브리드 k=10 | media-05(g0, 0.090909)<br>account-07(g0, 0.083333)<br>media-11(g0, 0.076923)<br>travel-12(g0, 0.071429)<br>travel-04(g0, 0.066667)<br>travel-02(g0, 0.062500) | 0.000000 | 0.000000 |

### negative-check-01 · negative/check

강아지 사료 급여량

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | - | 0.000000 | 0.000000 |
| 로컬 E5 의미 검색 | - | 0.000000 | 0.000000 |
| 로컬 E5 하이브리드 k=60 | - | 0.000000 | 0.000000 |
| 로컬 E5 하이브리드 k=10 | - | 0.000000 | 0.000000 |

### negative-check-02 · negative/check

부가가치세 세금계산서

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | - | 0.000000 | 0.000000 |
| 로컬 E5 의미 검색 | - | 0.000000 | 0.000000 |
| 로컬 E5 하이브리드 k=60 | - | 0.000000 | 0.000000 |
| 로컬 E5 하이브리드 k=10 | - | 0.000000 | 0.000000 |

### negative-check-03 · negative/check

김치 냉장고 냄새 청소

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | - | 0.000000 | 0.000000 |
| 로컬 E5 의미 검색 | - | 0.000000 | 0.000000 |
| 로컬 E5 하이브리드 k=60 | - | 0.000000 | 0.000000 |
| 로컬 E5 하이브리드 k=10 | - | 0.000000 | 0.000000 |

### negative-check-04 · negative/check

마라톤 무릎 통증 훈련

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | travel-08(g0, 8.000000) | 0.000000 | 0.000000 |
| 로컬 E5 의미 검색 | - | 0.000000 | 0.000000 |
| 로컬 E5 하이브리드 k=60 | travel-08(g0, 0.016393) | 0.000000 | 0.000000 |
| 로컬 E5 하이브리드 k=10 | travel-08(g0, 0.090909) | 0.000000 | 0.000000 |

### negative-check-05 · negative/check

부모님 건강검진 예약

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | - | 0.000000 | 0.000000 |
| 로컬 E5 의미 검색 | - | 0.000000 | 0.000000 |
| 로컬 E5 하이브리드 k=60 | - | 0.000000 | 0.000000 |
| 로컬 E5 하이브리드 k=10 | - | 0.000000 | 0.000000 |

### semantic-calibration-01 · semantic/calibration

통신이 끊긴 동안 작성하던 것을 연결 뒤 자동으로 보내기

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | account-08(g0, 12.000000)<br>travel-06(g0, 12.000000)<br>study-12(g0, 12.000000)<br>study-07(g0, 12.000000)<br>study-02(g0, 12.000000)<br>dev-05(g0, 12.000000) | 0.000000 | 0.000000 |
| 로컬 E5 의미 검색 | dev-06(g2, 0.849961)<br>travel-06(g0, 0.841669)<br>account-02(g0, 0.836671)<br>account-08(g0, 0.831086) | 1.000000 | 0.826235 |
| 로컬 E5 하이브리드 k=60 | travel-06(g0, 0.032258)<br>account-08(g0, 0.032018)<br>dev-06(g2, 0.016393)<br>account-02(g0, 0.015873)<br>study-12(g0, 0.015873)<br>study-07(g0, 0.015625) | 1.000000 | 0.413117 |
| 로컬 E5 하이브리드 k=10 | travel-06(g0, 0.166667)<br>account-08(g0, 0.162338)<br>dev-06(g2, 0.090909)<br>account-02(g0, 0.076923)<br>study-12(g0, 0.076923)<br>study-07(g0, 0.071429) | 1.000000 | 0.413117 |

### semantic-calibration-02 · semantic/calibration

암호를 치지 않고 얼굴이나 지문으로 서비스 들어가기

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | media-07(g0, 12.000000)<br>project-03(g0, 12.000000)<br>study-02(g0, 12.000000)<br>study-01(g0, 12.000000)<br>project-11(g0, 9.000000)<br>account-09(g0, 8.000000) | 0.000000 | 0.000000 |
| 로컬 E5 의미 검색 | account-11(g0, 0.844632)<br>account-07(g0, 0.840582)<br>account-08(g0, 0.835948)<br>account-09(g0, 0.835422)<br>account-03(g0, 0.832260)<br>account-06(g1, 0.831247) | 0.000000 | 0.098104 |
| 로컬 E5 하이브리드 k=60 | account-09(g0, 0.030777)<br>project-03(g0, 0.030415)<br>project-11(g0, 0.030090)<br>account-11(g0, 0.016393)<br>media-07(g0, 0.016393)<br>account-07(g0, 0.016129) | 0.000000 | 0.000000 |
| 로컬 E5 하이브리드 k=10 | account-09(g0, 0.133929)<br>project-03(g0, 0.133333)<br>project-11(g0, 0.122222)<br>account-11(g0, 0.090909)<br>media-07(g0, 0.090909)<br>account-07(g0, 0.083333) | 0.000000 | 0.000000 |

### semantic-calibration-03 · semantic/calibration

두 번째 확인 수단을 못 쓰는 때를 위한 일회용 열쇠

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | media-05(g0, 9.000000)<br>account-07(g1, 8.000000)<br>media-11(g0, 8.000000)<br>travel-12(g0, 8.000000)<br>travel-04(g0, 8.000000)<br>travel-02(g0, 8.000000) | 1.000000 | 0.173765 |
| 로컬 E5 의미 검색 | project-12(g0, 0.828641) | 0.000000 | 0.000000 |
| 로컬 E5 하이브리드 k=60 | media-05(g0, 0.016393)<br>project-12(g0, 0.016393)<br>account-07(g1, 0.016129)<br>media-11(g0, 0.015873)<br>travel-12(g0, 0.015625)<br>travel-04(g0, 0.015385) | 1.000000 | 0.137706 |
| 로컬 E5 하이브리드 k=10 | media-05(g0, 0.090909)<br>project-12(g0, 0.090909)<br>account-07(g1, 0.083333)<br>media-11(g0, 0.076923)<br>travel-12(g0, 0.071429)<br>travel-04(g0, 0.066667) | 1.000000 | 0.137706 |

### semantic-calibration-04 · semantic/calibration

시간이 부족한데 제품에서 제일 위험한 가정 하나만 확인하기

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | project-04(g2, 12.000000) | 1.000000 | 0.826235 |
| 로컬 E5 의미 검색 | project-03(g0, 0.860751)<br>project-12(g0, 0.860221)<br>project-04(g2, 0.855285)<br>dev-01(g0, 0.853143)<br>account-07(g0, 0.851526)<br>project-09(g0, 0.851438) | 1.000000 | 0.413117 |
| 로컬 E5 하이브리드 k=60 | project-04(g2, 0.032266)<br>project-03(g0, 0.016393)<br>project-12(g0, 0.016129)<br>dev-01(g0, 0.015625)<br>account-07(g0, 0.015385)<br>project-09(g0, 0.015152) | 1.000000 | 0.826235 |
| 로컬 E5 하이브리드 k=10 | project-04(g2, 0.167832)<br>project-03(g0, 0.090909)<br>project-12(g0, 0.083333)<br>dev-01(g0, 0.071429)<br>account-07(g0, 0.066667)<br>project-09(g0, 0.062500) | 1.000000 | 0.826235 |

### semantic-calibration-05 · semantic/calibration

상대의 경험을 왜곡하지 않고 듣는 면담 방법

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | media-07(g0, 12.000000)<br>project-03(g2, 12.000000)<br>study-02(g0, 12.000000)<br>study-01(g0, 12.000000)<br>study-09(g0, 8.000000) | 1.000000 | 0.521296 |
| 로컬 E5 의미 검색 | project-03(g2, 0.836005) | 1.000000 | 0.826235 |
| 로컬 E5 하이브리드 k=60 | project-03(g2, 0.032522)<br>media-07(g0, 0.016393)<br>study-02(g0, 0.015873)<br>study-01(g0, 0.015625)<br>study-09(g0, 0.015385) | 1.000000 | 0.826235 |
| 로컬 E5 하이브리드 k=10 | project-03(g2, 0.174242)<br>media-07(g0, 0.090909)<br>study-02(g0, 0.076923)<br>study-01(g0, 0.071429)<br>study-09(g0, 0.066667) | 1.000000 | 0.826235 |

### semantic-calibration-06 · semantic/calibration

학술 자료를 전부 정독하기 전에 채택 여부 가늠하기

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | account-12(g0, 12.000000)<br>account-03(g0, 12.000000)<br>media-05(g0, 12.000000)<br>travel-11(g0, 12.000000)<br>travel-02(g0, 12.000000)<br>project-09(g0, 8.000000) | 0.000000 | 0.000000 |
| 로컬 E5 의미 검색 | study-03(g2, 0.838884)<br>study-04(g1, 0.836613)<br>media-11(g0, 0.836158)<br>account-08(g0, 0.829409) | 1.000000 | 1.000000 |
| 로컬 E5 하이브리드 k=60 | account-12(g0, 0.016393)<br>study-03(g2, 0.016393)<br>account-03(g0, 0.016129)<br>study-04(g1, 0.016129)<br>media-05(g0, 0.015873)<br>media-11(g0, 0.015873) | 1.000000 | 0.639909 |
| 로컬 E5 하이브리드 k=10 | account-12(g0, 0.090909)<br>study-03(g2, 0.090909)<br>account-03(g0, 0.083333)<br>study-04(g1, 0.083333)<br>media-05(g0, 0.076923)<br>media-11(g0, 0.076923) | 1.000000 | 0.639909 |

### semantic-calibration-07 · semantic/calibration

정답을 가린 채 머릿속에서 배운 것을 꺼내는 연습

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | project-07(g0, 8.000000)<br>study-07(g0, 8.000000) | 0.000000 | 0.000000 |
| 로컬 E5 의미 검색 | study-02(g2, 0.837335)<br>project-03(g0, 0.831701)<br>study-01(g1, 0.829438) | 1.000000 | 0.963940 |
| 로컬 E5 하이브리드 k=60 | project-07(g0, 0.016393)<br>study-02(g2, 0.016393)<br>project-03(g0, 0.016129)<br>study-07(g0, 0.016129)<br>study-01(g1, 0.015873) | 1.000000 | 0.627840 |
| 로컬 E5 하이브리드 k=10 | project-07(g0, 0.090909)<br>study-02(g2, 0.090909)<br>project-03(g0, 0.083333)<br>study-07(g0, 0.083333)<br>study-01(g1, 0.076923) | 1.000000 | 0.627840 |

### semantic-calibration-08 · semantic/calibration

연결편 사이에 국경 수속까지 포함한 최소 여유

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | travel-08(g0, 12.000000)<br>travel-03(g2, 8.000000) | 1.000000 | 0.521296 |
| 로컬 E5 의미 검색 | travel-06(g0, 0.832351)<br>travel-04(g0, 0.828958)<br>travel-10(g0, 0.827707) | 0.000000 | 0.000000 |
| 로컬 E5 하이브리드 k=60 | travel-06(g0, 0.016393)<br>travel-08(g0, 0.016393)<br>travel-03(g2, 0.016129)<br>travel-04(g0, 0.016129)<br>travel-10(g0, 0.015873) | 1.000000 | 0.413117 |
| 로컬 E5 하이브리드 k=10 | travel-06(g0, 0.090909)<br>travel-08(g0, 0.090909)<br>travel-03(g2, 0.083333)<br>travel-04(g0, 0.083333)<br>travel-10(g0, 0.076923) | 1.000000 | 0.413117 |

### semantic-calibration-09 · semantic/calibration

우천 시 걷는 구간을 줄인 제주도 하루 일정

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | project-06(g0, 12.000000)<br>travel-04(g0, 9.000000)<br>media-10(g0, 8.000000)<br>media-03(g0, 8.000000)<br>travel-07(g1, 8.000000)<br>travel-05(g0, 8.000000) | 1.000000 | 0.106544 |
| 로컬 E5 의미 검색 | - | 0.000000 | 0.000000 |
| 로컬 E5 하이브리드 k=60 | project-06(g0, 0.016393)<br>travel-04(g0, 0.016129)<br>media-10(g0, 0.015873)<br>media-03(g0, 0.015625)<br>travel-07(g1, 0.015385)<br>travel-05(g0, 0.015152) | 1.000000 | 0.106544 |
| 로컬 E5 하이브리드 k=10 | project-06(g0, 0.090909)<br>travel-04(g0, 0.083333)<br>media-10(g0, 0.076923)<br>media-03(g0, 0.071429)<br>travel-07(g1, 0.066667)<br>travel-05(g0, 0.062500) | 1.000000 | 0.106544 |

### semantic-calibration-10 · semantic/calibration

말 한마디 단서로 재생 지점을 찾아가기

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | project-09(g0, 12.000000) | 0.000000 | 0.000000 |
| 로컬 E5 의미 검색 | media-04(g1, 0.840970)<br>media-01(g0, 0.829665)<br>media-08(g2, 0.829024)<br>media-09(g0, 0.828111) | 1.000000 | 0.688529 |
| 로컬 E5 하이브리드 k=60 | media-04(g1, 0.016393)<br>project-09(g0, 0.016393)<br>media-01(g0, 0.016129)<br>media-08(g2, 0.015873)<br>media-09(g0, 0.015625) | 1.000000 | 0.631251 |
| 로컬 E5 하이브리드 k=10 | media-04(g1, 0.090909)<br>project-09(g0, 0.090909)<br>media-01(g0, 0.083333)<br>media-08(g2, 0.076923)<br>media-09(g0, 0.071429) | 1.000000 | 0.631251 |

### semantic-check-01 · semantic/check

각자 다른 화폐로 낸 돈을 공평하게 나누는 방법

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | media-05(g0, 12.000000)<br>travel-10(g2, 12.000000)<br>study-09(g0, 8.000000) | 1.000000 | 0.630930 |
| 로컬 E5 의미 검색 | - | 0.000000 | 0.000000 |
| 로컬 E5 하이브리드 k=60 | media-05(g0, 0.016393)<br>travel-10(g2, 0.016129)<br>study-09(g0, 0.015873) | 1.000000 | 0.630930 |
| 로컬 E5 하이브리드 k=10 | media-05(g0, 0.090909)<br>travel-10(g2, 0.083333)<br>study-09(g0, 0.076923) | 1.000000 | 0.630930 |

### semantic-check-02 · semantic/check

한산한 골목을 자연광 좋은 시간에 촬영하기

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | media-06(g0, 12.000000) | 0.000000 | 0.000000 |
| 로컬 E5 의미 검색 | - | 0.000000 | 0.000000 |
| 로컬 E5 하이브리드 k=60 | media-06(g0, 0.016393) | 0.000000 | 0.000000 |
| 로컬 E5 하이브리드 k=10 | media-06(g0, 0.090909) | 0.000000 | 0.000000 |

### semantic-check-03 · semantic/check

새 장비로 바꾸기 전 저장한 웹 주소들을 옮길 파일 만들기

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | account-06(g0, 35.000000)<br>account-03(g2, 16.000000)<br>travel-12(g0, 12.000000)<br>project-04(g0, 12.000000)<br>study-04(g0, 12.000000)<br>account-01(g0, 10.000000) | 1.000000 | 0.521296 |
| 로컬 E5 의미 검색 | account-03(g2, 0.851938)<br>account-05(g0, 0.839118)<br>account-06(g0, 0.837691)<br>dev-11(g0, 0.835070)<br>dev-05(g0, 0.828392) | 1.000000 | 0.826235 |
| 로컬 E5 하이브리드 k=60 | account-03(g2, 0.032522)<br>account-06(g0, 0.032266)<br>account-05(g0, 0.029116)<br>dev-11(g0, 0.028958)<br>travel-12(g0, 0.015873)<br>project-04(g0, 0.015625) | 1.000000 | 0.826235 |
| 로컬 E5 하이브리드 k=10 | account-03(g2, 0.174242)<br>account-06(g0, 0.167832)<br>account-05(g0, 0.120370)<br>dev-11(g0, 0.111429)<br>travel-12(g0, 0.076923)<br>project-04(g0, 0.071429) | 1.000000 | 0.826235 |

### semantic-check-04 · semantic/check

모임 뒤 책임질 사람과 마감 시점을 적어 두기

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | account-08(g0, 12.000000)<br>project-04(g0, 12.000000)<br>study-12(g0, 12.000000)<br>study-02(g0, 12.000000)<br>dev-05(g0, 12.000000) | 0.000000 | 0.000000 |
| 로컬 E5 의미 검색 | project-05(g1, 0.849948)<br>project-10(g2, 0.841978)<br>travel-11(g0, 0.833988)<br>project-03(g0, 0.833068)<br>project-06(g0, 0.830893)<br>project-04(g0, 0.830338) | 1.000000 | 0.796708 |
| 로컬 E5 하이브리드 k=60 | project-04(g0, 0.031281)<br>account-08(g0, 0.030886)<br>project-05(g1, 0.016393)<br>project-10(g2, 0.016129)<br>study-12(g0, 0.015873)<br>travel-11(g0, 0.015873) | 1.000000 | 0.493546 |
| 로컬 E5 하이브리드 k=10 | project-04(g0, 0.145833)<br>account-08(g0, 0.143541)<br>project-05(g1, 0.090909)<br>project-10(g2, 0.083333)<br>study-12(g0, 0.076923)<br>travel-11(g0, 0.076923) | 1.000000 | 0.493546 |

### semantic-check-05 · semantic/check

읽은 내용을 근거와 반대 의견으로 짧게 압축하기

| 후보 | 상위 결과 | Recall@5 | nDCG@6 |
| --- | --- | ---: | ---: |
| 현행 어휘 검색 | account-04(g0, 12.000000)<br>media-01(g2, 12.000000)<br>travel-01(g0, 12.000000)<br>study-02(g0, 12.000000)<br>dev-06(g0, 12.000000) | 1.000000 | 0.521296 |
| 로컬 E5 의미 검색 | media-01(g2, 0.848110)<br>study-03(g0, 0.846563)<br>media-09(g0, 0.839806)<br>project-03(g0, 0.837752)<br>study-12(g1, 0.831648)<br>study-07(g0, 0.829125) | 1.000000 | 0.932778 |
| 로컬 E5 하이브리드 k=60 | media-01(g2, 0.032522)<br>account-04(g0, 0.016393)<br>study-03(g0, 0.016129)<br>media-09(g0, 0.015873)<br>travel-01(g0, 0.015873)<br>project-03(g0, 0.015625) | 1.000000 | 0.826235 |
| 로컬 E5 하이브리드 k=10 | media-01(g2, 0.174242)<br>account-04(g0, 0.090909)<br>study-03(g0, 0.083333)<br>media-09(g0, 0.076923)<br>travel-01(g0, 0.076923)<br>project-03(g0, 0.071429) | 1.000000 | 0.826235 |
