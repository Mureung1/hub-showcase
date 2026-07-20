# LocalTwin Vision·On-device ML Systems 포트폴리오 방향

## 1. 문서 목적과 상태

이 문서는 LocalTwin을 어떤 기술 포트폴리오로 발전시킬지 정한 장기 방향을 보존한다.
특정 대화나 세션이 없어도 이 문서만으로 결정 이유와 후속 구현 순서를 이해할 수 있어야 한다.

이 문서의 항목은 모두 구현 완료를 뜻하지 않는다. 현재 구현 여부는
[개발 백로그](../development/tasks.md)와 각 Task Packet·Run Report를 기준으로 판단한다.

## 2. 대표 메시지

LocalTwin의 제품 중심은 공공데이터 기반 상권 분석 서비스다. 사용자는 상권과 점포를 검색하고
경쟁, 수요, 매출, 인구, 입지 점수와 근거를 확인한다.

3D와 Vision은 이 제품을 대체하지 않는다. 한 점포 또는 10~20m 거리의 현장 맥락을 보조하는
제한된 기능으로 둔다. 도시 전체 3D 복원은 목표가 아니다.

포트폴리오의 대표 직무는 `Vision / On-device ML Systems Engineer`로 둔다. AI Platform 역량은
모델 평가, release gate, 관측성, 실패 탐지와 rollback을 증명하는 보조 근거로 사용한다.

```text
대표 메시지:
모델을 학습하는 데서 끝내지 않고,
실제 기기에서 어떻게 실행·측정·실패·복구되는지까지 설계했다.
```

## 3. 선택한 좁은 Vision vertical slice

여러 Vision 모델을 동시에 만들지 않는다. 실제 스마트폰 한 대에서 다음 흐름 하나를 끝까지
검증하는 것을 우선한다.

```text
스마트폰 촬영
→ 기기 내 얼굴·차량번호 탐지와 익명화
→ 흔들림·노출·프레임 품질 검사
→ 기준을 통과한 frame만 업로드
→ 서버에서 제한된 3DGS 처리
→ privacy gate와 관리자 검수
→ 승인된 asset만 사용자 viewer에 공개
```

이 흐름을 먼저 선택하는 이유:

- 기존 Scene upload/job/viewer와 직접 연결된다.
- 개인정보를 서버에 보내기 전에 줄여야 하는 On-device의 필요성이 명확하다.
- recall, False Negative, latency, memory와 화질 손실의 trade-off를 실제 제품 위험으로 설명할 수 있다.
- 정렬된 과거·현재 데이터가 많이 필요한 외관 변화 탐지보다 작은 범위에서 검증 가능하다.

점포 외관 변화 탐지는 위 흐름이 끝난 뒤의 별도 실험으로 둔다.

## 4. 반드시 남길 측정과 증거

정확도 하나만 보고 모델을 승인하지 않는다. 실제 접근 가능한 기기와 runtime에서만 다음을
측정한다.

- task에 맞는 accuracy·precision·recall과 False Positive·False Negative
- cold start와 warm inference latency
- peak memory
- model·runtime artifact 크기
- 입력 해상도별 품질과 속도 변화
- 지원되지 않는 operator와 fallback
- 익명화 후 3D 처리 품질 영향
- 실패 증상, 원인, 탐지, 사용자 영향, 복구와 재발 방지

측정하지 않은 CPU·GPU·NPU나 보유하지 않은 기기의 성능을 구조도와 결과에 넣지 않는다.
실제 운영 트래픽이 없을 때 임의의 `99.5% SLO`를 주장하지 않는다. 먼저 측정 가능한
performance budget과 release criterion으로 기록한다.

## 5. 최소 모델 release 구조

처음부터 거대한 model registry나 MLOps platform을 만들지 않는다. 다음 네 가지로 시작한다.

1. model manifest: 모델·runtime·입력·출력·version
2. benchmark report: 정확도·latency·memory·size·실패 사례
3. release criteria: 반드시 통과해야 하는 privacy·성능·호환성 기준
4. last-known-good artifact: 새 후보가 실패했을 때 유지할 이전 정상 버전

새 모델은 필수 privacy recall, runtime 호환성, performance budget과 API integration test를
통과한 경우에만 공개 후보가 된다. 실패한 후보와 거절 이유도 포트폴리오 증거로 보존한다.

## 6. 데이터 신뢰성 구조

Vision pipeline과 같은 원칙을 공공데이터에도 적용한다.

```text
공식 raw snapshot
→ schema·결측·중복·좌표·기간 검사
→ canonical SQLite
→ PostgreSQL migration·seed
→ source/target count와 대표 query 비교
→ 검증 통과 시에만 운영 환경 승격
```

canonical SQLite는 서비스 runtime DB가 아니라 수집·정제·회귀 검증의 기준이다. 실제 서비스
runtime DB는 PostgreSQL이다. 검증이 실패하면 운영 반영을 중단하고 last-known-good data를
유지한다.

## 7. 사용자 화면과 내부 운영의 경계

일반 사용자에게는 이해 가능한 상태와 안전한 오류만 표시한다.

- 촬영 준비 중·처리 중·완료·실패
- 다시 시도 안내와 민감하지 않은 요청 ID
- 승인된 익명화 결과와 데이터 근거

stack trace, 내부 경로, DB 연결 정보, GPU 명령, 익명화 전 원본과 다른 사용자의 job은 공개하지
않는다. 관리자 기능은 별도 인증·인가와 audit log를 전제로 하며, Frontend의 `/admin` route를
숨기는 것만으로 보안 경계를 만들지 않는다. 인증·privacy gate가 완성되기 전에는 Scene API를
제품 환경에서 기본 비활성화한다.

## 8. 구현 순서

1. 상권 검색·분석·근거·오류 상태와 공개 배포를 안정화한다.
2. raw snapshot부터 PostgreSQL 승격까지 데이터 검증 gate를 완성한다.
3. 실제 기기 하나와 runtime 하나를 확정한다.
4. 얼굴·차량번호 익명화와 촬영 품질 baseline을 만든다.
5. ONNX 또는 선택한 mobile runtime으로 변환하고 실제 기기에서 측정한다.
6. release criteria와 last-known-good rollback을 검증한다.
7. 승인된 frame만 기존 3DGS pipeline과 viewer에 연결한다.
8. 실패·거절·복구 결과를 Run Report와 포트폴리오 문서에 남긴다.

## 9. 하지 않을 것

- 도시 전체 또는 서울 전체 3D 복원
- 여러 AI 모델을 한꺼번에 추가
- 실제 데이터가 아닌 임의 수치로 기능을 포장
- 이유 없는 Kubernetes·microservice·대형 model registry 도입
- 측정하지 않은 hardware 성능 주장
- 모델 정확도나 클라우드 배포 사실만 강조
- privacy·authz·quota 없이 Scene API 공개

## 10. 모든 구현 후 설명 규칙

구현을 마친 뒤에는 기술 검증 결과와 함께 다음 내용을 한국어로 설명한다.

설명 수준은 고등학생 또는 개발 입문자(약 16~18세)를 기준으로 한다. 비유만으로 설명하지 않고
실제 코드와 데이터 흐름을 이해할 수 있게 다음 순서를 사용한다.

1. 무엇이 바뀌었는가
2. 왜 필요한가와 이전 문제
3. 입력 → 처리 → 저장 → 응답 → 화면의 실제 흐름
4. 관련 파일·component·function·API·DB table
5. 핵심 기술 용어와 선택 이유
6. 사용자가 직접 확인하는 명령과 화면 동작
7. test 결과와 아직 구현하거나 검증하지 않은 부분
8. 이해가 어려운 지점에만 짧은 비유

### 10.1 코드 수준 설명 규칙

구현된 기능을 설명할 때는 화면 동작만 설명하지 않고 실제 코드가 실행되는 순서를 함께 다룬다.
전체 파일을 그대로 붙이지 말고, 기능을 이해하는 데 필요한 핵심 코드만 다음 단계로 설명한다.

1. 사용자 행동과 최초 진입 component 또는 API endpoint
2. request·response와 핵심 type/interface
3. state가 생성·변경·초기화되는 위치
4. service·repository·pipeline function의 호출 순서
5. DB table 또는 파일에 저장되는 값
6. 성공·empty·error·retry 분기
7. 해당 동작을 검증하는 test와 assertion

각 단계에는 실제 파일 링크와 symbol 이름을 포함하고, 중요한 조건문과 값의 변화는 짧은 코드
조각으로 보여준다. 코드 조각을 제시한 뒤에는 각 줄의 역할, 다른 module과 연결되는 이유,
수정할 때 발생할 수 있는 영향을 설명한다.

예를 들어 SceneJob 기능은 다음 연결을 따라 설명한다.

```text
SceneWorkspace.submit()
→ POST /api/v1/scenes/jobs
→ create_scene_job()
→ SceneJobStore.create()
→ save_uploads()
→ BackgroundTasks.add_task(run_scene_job)
→ preprocess / train / export
→ job.json과 scene.ply
→ GET /api/v1/scenes/jobs/{job_id} polling
→ React job state와 화면 갱신
```

코드 수준 설명에서도 확인한 구현과 앞으로 만들 target architecture를 섞지 않는다. 현재 코드,
제한사항, 후속 개선안을 별도 구역으로 구분한다.

### 10.2 실제 코드 탐색 안내

모든 구현 설명에는 사용자가 IDE에서 전체 흐름을 직접 따라갈 수 있도록 다음 탐색 정보를
포함한다.

- 클릭 가능한 절대 파일 경로와 시작 line
- 확인할 class·function·component·hook·test symbol
- 처음 읽을 entry point부터 결과와 test까지의 권장 읽기 순서
- 여러 파일의 호출 관계를 나타내는 전체 코드 흐름도
- 각 파일의 책임과 앞뒤 파일로 이동할 때 찾을 검색어
- 구현 파일과 regression test의 연결

line 번호는 설명 시점의 현재 checkout을 확인한 뒤 제공한다. 이후 코드 변경으로 line이 달라질
수 있으므로 symbol 이름도 반드시 함께 적는다. 전체 흐름도는 실제 확인한 호출만 실선으로
표시하고, 계획 중인 연결은 `후속 설계`로 분리한다.

쉬운 설명은 기술 용어를 없애는 것이 아니다. 먼저 구체적인 동작 흐름을 설명하고,
`Alembic`, `ONNX Runtime`, `privacy gate` 같은 정확한 이름과 실제 검증 근거를 제시한다.
비유는 기술 설명을 대신하지 않고 보충할 때만 사용한다.

예시:

> Alembic은 여러 사람이 쓰는 공책의 칸을 언제 어떻게 바꿨는지 적는 변경 기록표와 같다.
> 실제로는 PostgreSQL schema 변경을 revision 파일 순서대로 재현하는 도구이며, migration과
> rollback 검증 결과를 함께 확인해야 한다.
