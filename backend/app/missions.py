"""서버가 관리하는 미션 타입과 고정 문구.

`GET /api/articles/{articleId}`와 `POST /api/mission-records`가 같은 정의를 공유한다.
"""

from typing import Literal

MissionType = Literal["question", "rebuttal", "connection", "expression"]

MISSION_PROMPTS: dict[MissionType, str] = {
    "question": "이 글의 핵심 주장은 뭐지?",
    "rebuttal": "이 주장에 반대한다면?",
    "connection": "내 상황이나 프로젝트와 연결해보면?",
    "expression": "이 글이 놓친 관점은 뭐지?",
}

RECOMMENDED_MISSION_TYPE: MissionType = "connection"
