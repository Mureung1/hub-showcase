import re
from typing import Dict, List
import json
import os

# shared/taxonomy.json 로드
TAXONOMY_PATH = os.path.join(os.path.dirname(__file__), "../../shared/taxonomy.json")
with open(TAXONOMY_PATH, "r", encoding="utf-8") as f:
    TAXONOMY_DATA = json.load(f)

MAJOR_MAPPING = TAXONOMY_DATA["major_mapping"]
REGION_MAPPING = TAXONOMY_DATA["region_mapping"]
CANONICAL_MAJORS = TAXONOMY_DATA["canonical_majors"]
CANONICAL_REGIONS = TAXONOMY_DATA["canonical_regions"]


def parse_eligibility(raw_text: str, wevity_fields: Dict = None) -> Dict:
    """
    원문 텍스트 + 위비티 구조화 필드로부터 자격요건 파싱

    반환값:
    {
        "majors": ["IT", "SCIENCE"],           # canonical 전공값
        "regions": ["SEOUL", "GYEONGGI"],     # canonical 지역값
        "grades": [1, 2, 3, 4],                # 학년
        "enrollment_statuses": ["재학"],       # 재학/휴학/졸업예정
        "age_min": 19,
        "age_max": null,
        "raw_eligibility_text": "원문 그대로" # 원문 보존
    }
    """
    if not wevity_fields:
        wevity_fields = {"fields": [], "targets": []}

    eligibility = {
        "majors": [],
        "regions": [],
        "grades": [],
        "enrollment_statuses": [],
        "age_min": None,
        "age_max": None,
        "raw_eligibility_text": raw_text[:1000],  # 원문 첫 1000자 보존
    }

    # 1단계: 위비티 분야 태그 → canonical majors 변환
    for field in wevity_fields.get("fields", []):
        majors_list = MAJOR_MAPPING.get(field, [])
        for major in majors_list:
            if major not in eligibility["majors"]:
                eligibility["majors"].append(major)

    # 2단계: 위비티 응모대상 태그로 enrollment_status 추측
    targets = wevity_fields.get("targets", [])
    if "대학생" in targets:
        # 재학/휴학 구분 필요 — 원문에서 명시 없으면 빈 배열
        pass

    # 3단계: 원문 정규식 파싱 (지역, 학년, 나이)
    majors_from_text = extract_majors_from_text(raw_text)
    for major in majors_from_text:
        if major not in eligibility["majors"]:
            eligibility["majors"].append(major)

    regions_from_text = extract_regions_from_text(raw_text)
    eligibility["regions"].extend(regions_from_text)

    grades_from_text = extract_grades_from_text(raw_text)
    eligibility["grades"].extend(grades_from_text)

    enrollment_from_text = extract_enrollment_from_text(raw_text)
    eligibility["enrollment_statuses"].extend(enrollment_from_text)

    age_min, age_max = extract_age_from_text(raw_text)
    eligibility["age_min"] = age_min
    eligibility["age_max"] = age_max

    # 중복 제거
    eligibility["majors"] = list(set(eligibility["majors"]))
    eligibility["regions"] = list(set(eligibility["regions"]))
    eligibility["grades"] = sorted(list(set(eligibility["grades"])))
    eligibility["enrollment_statuses"] = list(set(eligibility["enrollment_statuses"]))

    return eligibility


def extract_majors_from_text(text: str) -> List[str]:
    """원문에서 전공 키워드 추출"""
    majors = []
    text_lower = text.lower()

    for keyword, canonical_list in MAJOR_MAPPING.items():
        if keyword.lower() in text:
            majors.extend(canonical_list)

    return list(set(majors))


def extract_regions_from_text(text: str) -> List[str]:
    """원문에서 지역 키워드 추출"""
    regions = []

    for keyword, canonical_list in REGION_MAPPING.items():
        if keyword in text:
            regions.extend(canonical_list)

    return list(set(regions))


def extract_grades_from_text(text: str) -> List[int]:
    """원문에서 학년 추출 (1~4학년)"""
    grades = []

    # 패턴: "1학년", "2학년" 등 또는 "1년" 등
    grade_patterns = [
        r"(\d)[학년년]제?",
    ]

    for pattern in grade_patterns:
        matches = re.findall(pattern, text)
        for match in matches:
            grade = int(match)
            if 1 <= grade <= 4 and grade not in grades:
                grades.append(grade)

    return sorted(grades)


def extract_enrollment_from_text(text: str) -> List[str]:
    """원문에서 재학/휴학/졸업예정 추출"""
    statuses = []
    status_keywords = {
        "재학": "재학",
        "재학생": "재학",
        "휴학": "휴학",
        "휴학생": "휴학",
        "졸업예정": "졸업예정",
    }

    for keyword, status in status_keywords.items():
        if keyword in text and status not in statuses:
            statuses.append(status)

    return statuses


def extract_age_from_text(text: str) -> tuple:
    """원문에서 나이 범위 추출 (age_min, age_max)"""
    age_min = None
    age_max = None

    # 패턴: "만 19세 이상", "19세 이상", "만 25세 이하" 등
    # 이상
    match_min = re.search(r"(만\s*)?(\d{2,3})세?\s*이상", text)
    if match_min:
        age_min = int(match_min.group(2))

    # 이하
    match_max = re.search(r"(만\s*)?(\d{2,3})세?\s*이하", text)
    if match_max:
        age_max = int(match_max.group(2))

    return age_min, age_max


def determine_parse_status(eligibility: Dict) -> str:
    """
    파싱 결과의 신뢰도 판단
    CURATED: 완벽하게 파싱됨
    NEEDS_REVIEW: 일부 필드가 비어있거나 불확실함
    """
    # 필수 필드 확인
    has_content = any([
        eligibility.get("majors"),
        eligibility.get("regions"),
        eligibility.get("grades"),
        eligibility.get("enrollment_statuses"),
        eligibility.get("age_min") is not None,
        eligibility.get("age_max") is not None,
    ])

    if not has_content:
        # 모든 조건이 비어있으면 = 조건 무관 (안전함)
        return "CURATED"

    # 만약 조건이 일부만 추출되었다면 검증 필요
    filled_fields = sum([
        bool(eligibility.get("majors")),
        bool(eligibility.get("regions")),
        bool(eligibility.get("grades")),
        bool(eligibility.get("enrollment_statuses")),
        eligibility.get("age_min") is not None,
    ])

    if filled_fields >= 2:  # 2개 이상 필드 추출되었으면 안전
        return "CURATED"
    else:
        return "NEEDS_REVIEW"
