import os

from openai import OpenAI

# 최근 생성에 쓰인 온도 이력. DB 없이 메모리에만 저장하는 최소 기능 버전이라
# 서버를 재시작하면 초기화됨 (지금 스코프에선 이 정도로 충분).
_recent_temperatures = []
MAX_HISTORY = 5

CATEGORY_TEMPS = {"cold": 20, "mid": 50, "hot": 90}


def _category(temp: int) -> str:
    if temp <= 30:
        return "cold"
    if temp >= 80:
        return "hot"
    return "mid"


def _pick_category_avoiding_repeat(base_category: str) -> tuple[str, bool]:
    """최근 2건이 전부 base_category와 같은 톤이었으면 다른 톤으로 바꿔서 반환.

    반환값: (최종 카테고리, 실제로 조정됐는지 여부)
    GPT 호출 없이 순수 로직이라 별도로 테스트하기 쉽게 분리해둠.
    """
    if len(_recent_temperatures) >= 2:
        recent_categories = [_category(t) for t in _recent_temperatures[-2:]]
        if all(c == base_category for c in recent_categories):
            alternatives = [c for c in ("cold", "mid", "hot") if c != base_category]
            return alternatives[0], True
    return base_category, False


def _classify_complaint(complaint: str) -> str:
    """GPT한테 하소연 내용을 보여주고 어울리는 톤 카테고리 하나를 받아옴."""
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    prompt = f"""아래 하소연을 읽고, 어떤 톤으로 표현하는 게 가장 잘 어울릴지 판단해줘.
반드시 아래 세 단어 중 하나로만 답해:
- cold (담백하고 감성적인 톤이 어울림, 예: 서글프거나 씁쓸한 내용)
- mid (친근하고 균형잡힌 유머가 어울림)
- hot (과장되고 유쾌한 풍자가 어울림, 예: 황당하거나 어이없는 내용)

하소연: {complaint}

답변(단어 하나만):"""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=10,
    )
    category = response.choices[0].message.content.strip().lower()
    if category not in CATEGORY_TEMPS:
        category = "mid"  # 예상 밖 응답이면 안전한 기본값
    return category


def suggest_temperature(complaint: str) -> dict:
    """하소연 내용을 분석해 어울리는 온도를 1차 제안하고,
    최근 생성 이력과 비교해 반복되면 다른 톤을 우선 추천함."""
    base_category = _classify_complaint(complaint)
    final_category, adjusted = _pick_category_avoiding_repeat(base_category)

    reason = f"하소연 내용을 분석해 '{final_category}' 톤을 제안했어요."
    if adjusted:
        reason = f"내용상으로는 '{base_category}' 톤이 어울리지만, 최근 비슷한 톤이 반복되어 '{final_category}' 톤을 대신 제안해요."

    return {
        "suggested_temperature": CATEGORY_TEMPS[final_category],
        "category": final_category,
        "reason": reason,
    }


def record_temperature(temperature: int):
    """실제로 콘텐츠 생성에 쓰인 온도를 이력에 기록 (반복 회피 판단용)."""
    _recent_temperatures.append(temperature)
    if len(_recent_temperatures) > MAX_HISTORY:
        _recent_temperatures.pop(0)
