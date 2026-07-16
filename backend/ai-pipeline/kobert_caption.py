#!/usr/bin/env python3
"""
KoBERT 기반 자막 생성 & 트렌드 매칭
입력: 트렌드 해시태그, 상품명, 카테고리
출력: 최적화된 자막, 해시태그, 유사도 점수
"""

import sys
import json
import os

# 환경 변수로 트랜스포머 캐시 설정
os.environ['HF_HOME'] = '/tmp/huggingface_cache'

try:
    from transformers import AutoTokenizer, AutoModel
    import torch
    from sklearn.metrics.pairwise import cosine_similarity
    import numpy as np
except ImportError as e:
    print(json.dumps({
        "status": "error",
        "message": f"Missing dependency: {e}"
    }))
    sys.exit(1)


def get_embeddings(texts):
    """텍스트 임베딩 생성"""
    try:
        tokenizer = AutoTokenizer.from_pretrained('skt/kobert-base-v1')
        model = AutoModel.from_pretrained('skt/kobert-base-v1', output_hidden_states=True)

        model.eval()
        embeddings = []

        for text in texts:
            input_ids = torch.tensor(tokenizer.encode(text)).unsqueeze(0)
            with torch.no_grad():
                outputs = model(input_ids)
                # CLS 토큰의 임베딩 사용
                embedding = outputs.hidden_states[-1][:, 0, :].numpy()
                embeddings.append(embedding[0])

        return np.array(embeddings)
    except Exception as e:
        print(f"Error in get_embeddings: {e}", file=sys.stderr)
        raise


def generate_captions(trend_hashtag, product_label, store_category):
    """
    트렌드와 상품 정보를 바탕으로 자막 후보 생성
    """

    caption_templates = {
        "카페": [
            f"☕ 이 맛이 바로 {product_label}! #{trend_hashtag}",
            f"✨ {trend_hashtag}로 핫한 {product_label} 맛보기",
            f"🎉 {product_label}의 매력에 빠져요 {trend_hashtag}",
            f"😍 요즘 핫한 {trend_hashtag}는 이게 아니면 NO {product_label}",
            f"🔥 {trend_hashtag} 트렌드 따라잡기 {product_label}"
        ],
        "음식점": [
            f"🍽️ {product_label}로 시작하는 {trend_hashtag}",
            f"😋 {trend_hashtag}는 {product_label}로 먹어야 제맛",
            f"🤤 {product_label}의 진짜 맛 {trend_hashtag}",
            f"💥 {trend_hashtag} 핫플레이스 {product_label}",
            f"✨ {product_label} 한 입에 {trend_hashtag}가 느껴져요"
        ],
        "베이커리": [
            f"🥐 {product_label}로 {trend_hashtag} 완성",
            f"✨ {trend_hashtag}엔 역시 {product_label}",
            f"🍰 {product_label}의 부드러움 {trend_hashtag}",
            f"😍 {trend_hashtag}는 {product_label}로 시작",
            f"🎉 {product_label}이 쏜다 {trend_hashtag}"
        ],
        "기본": [
            f"🔥 {product_label}로 {trend_hashtag} 시작",
            f"✨ {trend_hashtag}와 {product_label}의 조화",
            f"😍 {product_label} 한 입에 빠진다 {trend_hashtag}",
            f"💫 {trend_hashtag} 트렌드 {product_label}",
            f"🎯 {product_label}로 {trend_hashtag} 공략"
        ]
    }

    templates = caption_templates.get(store_category, caption_templates["기본"])
    return templates


def calculate_similarity(trend_hashtag, caption):
    """트렌드와 자막 간의 유사도 계산"""
    try:
        texts = [trend_hashtag, caption]
        embeddings = get_embeddings(texts)

        similarity = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]
        return float(similarity)
    except Exception as e:
        print(f"Error calculating similarity: {e}", file=sys.stderr)
        # 실패 시 기본값
        return 0.7


def generate_hashtags(trend_hashtag, product_label, store_category):
    """추가 해시태그 생성"""
    base_hashtags = [trend_hashtag]

    category_hashtags = {
        "카페": ["#카페", "#커피", "#라떼", "#디저트"],
        "음식점": ["#맛집", "#음식", "#한식", "#신메뉴"],
        "베이커리": ["#빵", "#베이커리", "#카페", "#디저트"],
    }

    category_tags = category_hashtags.get(store_category, ["#맛집", "#신메뉴"])

    hashtags = base_hashtags + category_tags[:3]
    return hashtags


def generate_caption(trend_hashtag, product_label, store_category):
    """최적화된 자막 생성"""
    try:
        # 자막 후보 생성
        caption_candidates = generate_captions(
            trend_hashtag,
            product_label,
            store_category
        )

        # 각 후보의 유사도 계산
        similarities = []
        for caption in caption_candidates:
            sim = calculate_similarity(trend_hashtag, caption)
            similarities.append((caption, sim))

        # 가장 유사도 높은 자막 선택
        best_caption, best_similarity = max(similarities, key=lambda x: x[1])

        # 추가 해시태그 생성
        hashtags = generate_hashtags(trend_hashtag, product_label, store_category)

        result = {
            "status": "success",
            "caption": best_caption,
            "hashtags": hashtags,
            "similarity_score": round(best_similarity, 3),
            "all_candidates": [
                {"caption": c, "similarity": round(s, 3)}
                for c, s in similarities
            ]
        }

        print(json.dumps(result, ensure_ascii=False))
        return 0

    except Exception as e:
        error_result = {
            "status": "error",
            "message": str(e)
        }
        print(json.dumps(error_result, ensure_ascii=False), file=sys.stderr)
        print(json.dumps(error_result, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print(json.dumps({
            "status": "error",
            "message": "Usage: python kobert_caption.py <trend_hashtag> <product_label> <store_category>"
        }))
        sys.exit(1)

    trend_hashtag = sys.argv[1]
    product_label = sys.argv[2]
    store_category = sys.argv[3]

    sys.exit(generate_caption(trend_hashtag, product_label, store_category))
