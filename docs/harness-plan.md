# 하네스 구조 (3주차부터 발전시킬 예정)

AI 협업 중 실패가 생겼을 때, 막연히 고치지 않고 "5개 방어 계층"(task specification, context provision, execution environment, verification feedback, state management) 중 어디서 문제가 생겼는지 분류한 뒤 그 계층만 고쳐서, 같은 실패가 반복되지 않게 만드는 구조다. learn-harness-engineering 강의에서 배운 내용을 참고한다.

2주차(기반 설정/Brain Dump)는 아직 실패 사례 자체가 쌓이지 않아서 레이어 구조를 채울 근거가 없다고 판단했다. 3주차(Agent 루프 시작, 실패 사례가 실제로 나오기 시작하는 시점)부터 이 구조를 적용해본다.
