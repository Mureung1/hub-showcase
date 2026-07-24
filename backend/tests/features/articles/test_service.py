from app.features.articles.service import choose_reason_tag, recommendation_reason


def test_choose_reason_tag_prefers_highest_confidence_selected_interest() -> None:
    tags = [
        {"id": "interest-1", "name": "AI", "display_order": 2, "confidence": 0.7},
        {"id": "interest-2", "name": "개발", "display_order": 1, "confidence": 0.9},
        {"id": "interest-3", "name": "디자인", "display_order": 0, "confidence": 1.0},
    ]

    selected = choose_reason_tag(tags, {"interest-1", "interest-2"})

    assert selected == tags[1]
    assert recommendation_reason(selected) == "개발 관심사와 맞는 글이에요."
