import os
import json
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings

class Retriever:
    def __init__(self):
        # 허깅페이스 504 타임아웃 방지를 위해 완전 오프라인 모드 강제 적용
        os.environ["HF_HUB_OFFLINE"] = "1"
        os.environ["TRANSFORMERS_OFFLINE"] = "1"
        os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
        
        print("\n[INIT] 🧠 의미 기반(Semantic) 임베딩 모델 및 벡터 DB 로딩 시작...")
        
        try:
            # 인덱서와 완벽하게 동일한 딥러닝 임베딩 모델 사용 (오프라인 캐시 로드)
            self.embeddings = HuggingFaceEmbeddings(
                model_name="jhgan/ko-sroberta-multitask",
                model_kwargs={"device": "cpu"},
                encode_kwargs={"normalize_embeddings": True}
            )
        except Exception as e:
            print(f"❌ 임베딩 모델 로드 실패: {e}")
            self.embeddings = None
            
        self._load_dbs()

    def _load_dbs(self):
        try:
            if os.path.exists("faiss_law_index") and self.embeddings:
                self.law_db = FAISS.load_local("faiss_law_index", self.embeddings, allow_dangerous_deserialization=True)
                print("✅ 법령 DB 로드 완료 (의미 검색 활성화)")
            else:
                self.law_db = None
                print("⚠️ 법령 DB 파일이 없거나 임베딩이 로드되지 않았습니다.")
        except Exception as e:
            print(f"⚠️ 법령 DB 로드 실패: {e}")
            self.law_db = None

        try:
            if os.path.exists("faiss_prec_index") and self.embeddings:
                self.prec_db = FAISS.load_local("faiss_prec_index", self.embeddings, allow_dangerous_deserialization=True)
                print("✅ 판례 DB 로드 완료 (의미 검색 활성화)")
            else:
                self.prec_db = None
                print("⚠️ 판례 DB 파일이 없거나 임베딩이 로드되지 않았습니다.")
        except Exception as e:
            print(f"⚠️ 판례 DB 로드 실패: {e}")
            self.prec_db = None

    def _load_feedback_weights(self):
        """🚀 [추가] 저장된 사용자 피드백 가중치를 불러옵니다."""
        weights_file = "logs/feedback_weights.json"
        if os.path.exists(weights_file):
            try:
                with open(weights_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"⚠️ 가중치 파일 로드 실패: {e}")
                return {}
        return {}

    def _get_smart_summary(self, content, query):
        # 딥러닝 임베딩 제거 -> 초고속 키워드 매칭 방식으로 변경
        sentences = [s.strip() for s in content.replace('\n', ' ').split('.') if len(s.strip()) > 5]
        if not sentences:
            return content[:100]
        
        query_tokens = set(query.split())
        best_sentence = sentences[0]
        max_matches = -1

        for sent in sentences:
            # 쿼리의 단어가 문장에 얼마나 많이 포함되어 있는지 계산
            matches = sum(1 for token in query_tokens if token in sent)
            if matches > max_matches:
                max_matches = matches
                best_sentence = sent
                
        # 너무 긴 요약 방지
        return best_sentence[:100] + ("..." if len(best_sentence) > 100 else "")

    def search(self, query):
        # [프론트엔드 UI 연동] 검색 요청 로그 출력 (타임아웃 방지를 위해 오프라인 모드 상태임을 명시)
        print(f"\n🔍 [오프라인 하이브리드 검색 요청] 쿼리: '{query}'")
        
        if not self.embeddings:
            print("⚠️ 임베딩 모델이 로드되지 않아 검색을 수행할 수 없습니다.")
            return []

        # 법령과 판례를 따로 담을 리스트 생성 (UI 가독성을 위해)
        law_results = []
        prec_results = []

        # [개선 포인트 1] 가중치를 부여할 핵심 법률 키워드 세트 정의
        boost_keywords_law = ["대여", "빌려", "차용", "소비대차", "반환", "변제", "갚아"]
        boost_keywords_prec = ["대여금", "차용금", "변제", "반환", "청구", "인용"]

        # 🚀 [추가] 검색할 때마다 실시간으로 사용자들이 누적한 가중치 파일을 읽어옴
        feedback_weights = self._load_feedback_weights()

        # 1. 법령 검색 (self.law_db)
        if self.law_db:
            # k값을 넉넉하게 가져옵니다 (k=10).
            docs_and_scores = self.law_db.similarity_search_with_score(query, k=10)
            boosted_laws = []

            for doc, score in docs_and_scores:
                # 기본 L2 거리 점수를 퍼센트로 변환 (원본 점수)
                base_similarity = max(0, min(100, int((1 - (score / 2.0)) * 100)))
                boost_score = 0
                content = doc.page_content.replace('\n', ' ') # 줄바꿈 제거하여 분석

                # (1) 조문 내용에 핵심 키워드 포함 시 가중치 부여 (매칭당 5점, 최대 15점)
                matches = 0
                for kw in boost_keywords_law:
                    if kw in content:
                        matches += 1
                boost_score += min(15, matches * 5)

                # (2) 민법 + 소비대차 강력 가중치 (특정 법령 우대)
                law_name = doc.metadata.get('law_name', '')
                if any(kw in law_name for kw in ["민법"]) and any(kw in content for kw in ["소비대차"]):
                     boost_score += 20 

                # 🚀 [최종 병기: 골든 룰 라우팅] 
                # 프론트에서 전달된 사건 유형(query)에 따라 필수 핵심 조문에 압도적 가중치(+50점) 부여
                article_no = str(doc.metadata.get('article_no', ''))
                
                # 1. 대여금 사건인 경우
                if any(kw in query for kw in ["대여금", "빌려", "돈 안"]):
                    if law_name == "민법" and article_no in ["598", "390", "393"]:
                        boost_score += 50  # 제598조(소비대차), 제390조(채무불이행) 무조건 최상단 노출
                
                # 2. 보증금 / 임대차 사건인 경우
                elif any(kw in query for kw in ["보증금", "임대차", "전세", "방 빼"]):
                    if law_name == "주택임대차보호법" and article_no in ["3", "3의2", "4"]:
                        boost_score += 50
                    elif law_name == "민법" and article_no in ["618", "623"]:
                        boost_score += 50
                        
                # 3. 명도 / 월세 미납 사건인 경우
                elif any(kw in query for kw in ["월세", "차임", "명도", "나가라"]):
                    if law_name == "민법" and article_no in ["640"]:
                        boost_score += 50  # 제640조(차임연체와 해지) 
                
                # 4. 손해배상 (폭행, 명예훼손 등 일반 불법행위)
                elif any(kw in query for kw in ["손해배상", "욕", "다쳤", "사고"]):
                    if law_name == "민법" and article_no in ["750", "751"]:
                        boost_score += 50  # 제750조(불법행위 내용)

                # 🚀 [추가] 피드백 시스템에서 받은 동적 가산점(Dynamic Boost) 적용!
                law_title = f"⚖️ [법령] {doc.metadata.get('law_name', '법령')} 제{doc.metadata.get('article_no', '')}조"
                dynamic_boost = feedback_weights.get(law_title, 0)
                boost_score += dynamic_boost

                # 최종 점수 계산 (최대 100점 제한)
                final_similarity = min(100, base_similarity + boost_score)
                
                # 결과 임시 저장
                boosted_laws.append({
                    "title": law_title,
                    "content": f"▶ 핵심 요약: {self._get_smart_summary(doc.page_content, query)}...",
                    "full_content": doc.page_content,
                    "similarity": final_similarity, # 최종 가중 점수
                    "base_sim_debug": base_similarity # 디버깅용 원본 점수
                })

            # 최종 가중 점수 기준으로 정렬 후 상위 k=3개만 최종 리스트에 담음
            boosted_laws = sorted(boosted_laws, key=lambda x: x["similarity"], reverse=True)
            law_results = boosted_laws[:3] # 상위 3개 절삭

            # 디버깅 출력 (백엔드 터미널에서 확인 가능)
            if law_results:
                print(f"DEBUG: 법령 최고점 -> 최종: {law_results[0]['similarity']}% (원본: {law_results[0]['base_sim_debug']}%) / 피드백 가중치 반영 완료")


        # 2. 판례 검색 (self.prec_db)
        if self.prec_db:
            docs_and_scores = self.prec_db.similarity_search_with_score(query, k=10)
            
            boosted_precs = []

            for doc, score in docs_and_scores:
                base_similarity = max(0, min(100, int((1 - (score / 2.0)) * 100)))
                boost_score = 0
                content = doc.page_content.replace('\n', ' ')

                # (1) 판결요지에 핵심 키워드 포함 시 가중치 부여 (매칭당 5점, 최대 20점)
                matches = 0
                for kw in boost_keywords_prec:
                    if kw in content:
                        matches += 1
                boost_score += min(20, matches * 5)

                # (2) 사건명(Metadata)에 '대여금'이 있다면 강력 가중치 (+15점)
                case_name = doc.metadata.get('case_name', '')
                if any(kw in case_name for kw in ["대여금"]):
                    boost_score += 15

                # 🚀 [추가] 판례 피드백 동적 가산점(Dynamic Boost) 적용!
                prec_title = f"📂 [판례] {doc.metadata.get('case_name', '사건')} ({doc.metadata.get('case_no', '')})"
                dynamic_boost = feedback_weights.get(prec_title, 0)
                boost_score += dynamic_boost

                # 최종 점수 계산 (최대 100점 제한)
                final_similarity = min(100, base_similarity + boost_score)

                boosted_precs.append({
                    "title": prec_title,
                    "content": f"▶ 판결 요지: {self._get_smart_summary(doc.page_content, query)}...",
                    "full_content": doc.page_content,
                    "similarity": final_similarity,
                    "base_sim_debug": base_similarity
                })

            # 가중 점수 기준으로 정렬 후 상위 k=3개 절삭
            boosted_precs = sorted(boosted_precs, key=lambda x: x["similarity"], reverse=True)
            prec_results = boosted_precs[:3]

            if prec_results:
                print(f"DEBUG: 판례 최고점 -> 최종: {prec_results[0]['similarity']}% (원본: {prec_results[0]['base_sim_debug']}%) / 피드백 가중치 반영 완료")


        # 3. 최종 정렬 및 병합
        law_results = sorted(law_results, key=lambda x: x["similarity"], reverse=True)
        prec_results = sorted(prec_results, key=lambda x: x["similarity"], reverse=True)
        
        # 법령을 먼저 배치하고, 그 아래에 판례 리스트를 이어 붙임 (그룹화)
        combined_results = law_results + prec_results
        
        print(f"✨ 검색 완료: 총 {len(combined_results)}건 반환 (법령 {len(law_results)}건, 판례 {len(prec_results)}건)")
        return combined_results