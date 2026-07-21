import os

from openai import OpenAI

# 온도 구간별 문체 지시문 (0~30 / 31~79 / 80~100)
TONE_INSTRUCTIONS = {
    "cold": "차분하고 담백한 문체로 써줘. 감정을 절제해서 표현하고, 짧은 문장 위주로. 이모지는 최소화하고 은유적인 표현을 써줘.",
    "mid": "친근하고 유머러스한 톤으로 써줘. 적당히 이모지도 쓰고, 공감 가는 일상어 표현을 섞어줘.",
    "hot": "과장되고 유쾌한 톤으로 써줘. ㅋㅋㅋ, 밈 같은 인터넷 말투를 적극 활용하고, 감탄사와 이모지를 많이 써줘.",
}

# 플랫폼별 글자수/스타일 스펙
PLATFORM_SPEC = {
    "instagram": {"label": "인스타그램 게시물", "guide": "150자 내외로, 이모지 자연스럽게 섞어서 작성해줘."},
    "thread": {"label": "스레드/X 게시물", "guide": "150자 내외로, 짧고 위트있게 작성해줘."},
    "blog": {"label": "네이버 블로그 게시물", "guide": "700자 내외로, 좀 더 자세한 서술형으로 작성해줘."},
}

# 손님 비난 방지 가드레일 — 풍자의 대상이 손님 개인이 아니라 상황이 되도록 강제
GUARDRAIL = """[중요] 아래 규칙을 반드시 지켜:
- 손님 개인을 비난하거나 조롱하는 표현은 절대 쓰지 마. ("진상", "무개념" 등 손님을 직접 저격하는 단어 금지)
- 유머의 대상은 '손님'이 아니라 '상황' 또는 '내 반응'이어야 해.
- 손님을 특정할 수 있는 정보(외모, 말투 흉내, 행동 디테일 등)는 포함하지 마.
- 풍자와 유머는 괜찮지만, 대상은 '자영업의 고단함'이지 '특정 손님'이 아니야."""


def _tone_for_temperature(temperature: int) -> str:
    if temperature <= 30:
        return TONE_INSTRUCTIONS["cold"]
    if temperature >= 80:
        return TONE_INSTRUCTIONS["hot"]
    return TONE_INSTRUCTIONS["mid"]


def build_prompt(
    complaint,
    temperature,
    platform,
    weather=None,
    holiday=None,
    business_name=None,
    business_type=None,
    business_description=None,
):
    tone = _tone_for_temperature(temperature)
    platform_guide = PLATFORM_SPEC.get(platform, PLATFORM_SPEC["instagram"])

    business_block = ""
    if business_name or business_type or business_description:
        business_block = f"""
[업장 정보]
업종: {business_type or "미입력"}
업장 이름: {business_name or "미입력"}
소개: {business_description or "미입력"}
"""

    context_block = ""
    if weather or holiday:
        context_block = f"\n오늘 맥락: {weather or ''} {holiday or ''}".strip()

    return f"""아래 하소연을 {platform_guide['label']}로 재구성해줘.
{platform_guide['guide']}
{tone}

{GUARDRAIL}
{business_block}{context_block}

하소연: {complaint}"""


def generate_content(
    complaint,
    temperature,
    platform,
    weather=None,
    holiday=None,
    business_name=None,
    business_type=None,
    business_description=None,
):
    """GPT-4o를 호출해서 하소연을 SNS 콘텐츠로 재구성."""
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    prompt = build_prompt(
        complaint, temperature, platform, weather, holiday,
        business_name, business_type, business_description,
    )

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=500,
    )
    return response.choices[0].message.content
