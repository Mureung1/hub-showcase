import re

def parse_nutrition_info(ocr_results):
    """
    OCR로 추출된 텍스트 뭉치에서 칼로리, 탄수화물, 단백질, 지방, 나트륨, 당류 숫자를
    오타 대응 및 예외 처리를 적용하여 파싱합니다.

    :param ocr_results: list[str] 또는 str (EasyOCR 인식 결과 텍스트들)
    :return: dict (영양 성분 및 파싱 상태 딕셔너리)
    """
    if isinstance(ocr_results, list):
        full_text = " ".join(ocr_results)
    else:
        full_text = str(ocr_results)

    # 쉼표(,) 제거 (예: 1,860mg -> 1860mg)
    cleaned_text = full_text.replace(',', '')

    # -------------------------------------------------------------
    # 1. 오타 대응 정규식 패턴 정의
    # -------------------------------------------------------------
    # 단위 오타: g -> g, q, (공백 후 9) / mg -> mg, mq, m9
    G_UNIT = r'(?:g|q|(?<=\s)9)'
    MG_UNIT = r'(?:mg|mq|m9)'
    KCAL_UNIT = r'(?:kcal|kcd1|kcaI|kca1|Cal)'

    # -------------------------------------------------------------
    # 3. '100g당' vs '총 내용량당' 수치 구분
    # -------------------------------------------------------------
    # 만약 '총 내용량' 키워드가 있다면 해당 구간 우선 파싱
    target_text = cleaned_text
    if '총 내용량' in cleaned_text or '총내용량' in cleaned_text:
        # '총 내용량' 이후 문맥을 1순위 타겟으로 설정
        sections = re.split(r'100\s*(?:g|ml)\s*당', cleaned_text)
        if len(sections) > 0:
            target_text = sections[0]  # 100g당 분량 이전(총 내용량 부분) 우선 사용

    nutrition_data = {
        "calories": 0,
        "carbs": 0,
        "protein": 0,
        "fat": 0,
        "sodium": 0,
        "sugar": 0,
        "is_complete": True,
        "missing_fields": [],
        "warning_messages": []
    }

    # -------------------------------------------------------------
    # 2. % 오탐 방지 및 정규식 추출 로직 (단위 명확 결합 & (?!\s*%) 사용)
    # -------------------------------------------------------------

    # 1) 칼로리 (열량 / 칼로리 / kcal)
    # 예: "열량 485kcal", "485 kcd1", "485 Cal"
    cal_match = re.search(r'(?:열량|칼로리)\s*[:\-\s]*([0-9.]+)\s*' + KCAL_UNIT + r'?', target_text, re.IGNORECASE)
    if not cal_match:
        cal_match = re.search(r'([0-9.]+)\s*' + KCAL_UNIT, target_text, re.IGNORECASE)
    if cal_match:
        nutrition_data["calories"] = int(float(cal_match.group(1)))

    # 2) 탄수화물 (g) - % 오탐 방지
    carbs_match = re.search(r'탄수화물\s*[:\-\s]*([0-9.]+)\s*' + G_UNIT + r'?(?!\s*%)', target_text)
    if carbs_match:
        nutrition_data["carbs"] = int(float(carbs_match.group(1)))

    # 3) 단백질 (g) - % 오탐 방지 (예: "단백질 8g (15%)" -> 8 추출)
    protein_match = re.search(r'단백질\s*[:\-\s]*([0-9.]+)\s*' + G_UNIT + r'?(?!\s*%)', target_text)
    if protein_match:
        nutrition_data["protein"] = int(float(protein_match.group(1)))

    # 4) 지방 (g) - 포화/트랜스지방 제외 및 % 오탐 방지
    fat_match = re.search(r'(?<!포화)(?<!트랜스)\s*지방\s*[:\-\s]*([0-9.]+)\s*' + G_UNIT + r'?(?!\s*%)', target_text)
    if fat_match:
        nutrition_data["fat"] = int(float(fat_match.group(1)))

    # 5) 나트륨 (mg 또는 g) - % 오탐 방지
    sodium_match = re.search(r'나트륨\s*[:\-\s]*([0-9.]+)\s*(' + MG_UNIT + r'|' + G_UNIT + r')?(?!\s*%)', target_text, re.IGNORECASE)
    if sodium_match:
        value = float(sodium_match.group(1))
        unit = sodium_match.group(2)
        if unit and unit.lower() in ['g', 'q']:
            value *= 1000  # g 단위를 mg 단위로 환산
        nutrition_data["sodium"] = int(value)

    # 6) 당류 (g) - % 오탐 방지
    sugar_match = re.search(r'당류\s*[:\-\s]*([0-9.]+)\s*' + G_UNIT + r'?(?!\s*%)', target_text)
    if sugar_match:
        nutrition_data["sugar"] = int(float(sugar_match.group(1)))

    # -------------------------------------------------------------
    # 4. 파싱 실패 시 예외 처리 (Fallback & missing_fields 체크)
    # -------------------------------------------------------------
    essential_fields = {
        "calories": "열량(칼로리)",
        "protein": "단백질",
        "carbs": "탄수화물",
        "fat": "지방",
        "sodium": "나트륨"
    }

    for field, field_name in essential_fields.items():
        if nutrition_data[field] == 0:
            nutrition_data["missing_fields"].append(field)
            nutrition_data["warning_messages"].append(f"[{field_name}] 수치를 인식하지 못했거나 0입니다.")

    if len(nutrition_data["missing_fields"]) > 0:
        nutrition_data["is_complete"] = False

    return nutrition_data


# --- 단독 테스트 실행 코드 ---
if __name__ == '__main__':
    print("==================================================")
    print("🧪 [1. OCR 오타 및 % 결합 오탐 방지 테스트]")
    print("==================================================")
    test_sample_1 = [
        "총 내용량 120g",
        "열량 485 kcd1",             # kcal -> kcd1 오타
        "나트륨 1,860 mq 93%",        # mg -> mq 오타 및 % 병기
        "탄수화물 69 9 21%",          # g -> 9 오타(띄어쓰기 포함) 및 % 병기
        "당류 4 q 4%",               # g -> q 오타 및 % 병기
        "지방 20 g 37%",
        "트랜스지방 0 g",
        "포화지방 10 g 67%",
        "단백질 8g (15%)"             # 8g (15%) -> %가 아닌 8 파싱 검증
    ]
    res1 = parse_nutrition_info(test_sample_1)
    print(f"🔥 칼로리  : {res1['calories']} kcal")
    print(f"🍞 탄수화물: {res1['carbs']} g")
    print(f"🥩 단백질  : {res1['protein']} g")
    print(f"🧈 지방    : {res1['fat']} g")
    print(f"🧂 나트륨  : {res1['sodium']} mg")
    print(f"🍬 당류    : {res1['sugar']} g")
    print(f"✅ 완전성 여부: {res1['is_complete']}")
    print(f"⚠️ 경고 메시지: {res1['warning_messages']}\n")

    print("==================================================")
    print("🧪 [2. 100g당 vs 총 내용량당 구분 & Fallback 테스트]")
    print("==================================================")
    test_sample_2 = [
        "총 내용량 500g당 열량 750 kcaI 단백질 25g 나트륨 1200mg",
        "100g당 열량 150 kcal 단백질 5g 나트륨 240mg"  # 100g당 수치가 뒤에 동시 존재하는 경우
    ]
    res2 = parse_nutrition_info(test_sample_2)
    print(f"🔥 칼로리  : {res2['calories']} kcal (총 내용량 기준 750 추출 확인)")
    print(f"🥩 단백질  : {res2['protein']} g (총 내용량 기준 25g 추출 확인)")
    print(f"🧂 나트륨  : {res2['sodium']} mg")
    print(f"🍞 탄수화물: {res2['carbs']} g (누락 -> Fallback 0 및 미인식 경고)")
    print(f"✅ 완전성 여부: {res2['is_complete']}")
    print(f"⚠️ 누락 항목  : {res2['missing_fields']}")
    print(f"⚠️ 경고 메시지: {res2['warning_messages']}")
    print("==================================================")
