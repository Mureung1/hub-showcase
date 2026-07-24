import os
import json
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings

class Retriever:
    def __init__(self):
        os.environ["HF_HUB_OFFLINE"] = "1"
        os.environ["TRANSFORMERS_OFFLINE"] = "1"
        os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
        
        print("\n[INIT] 🧠 의미 기반(Semantic) 임베딩 모델 및 벡터 DB 로딩 시작...")
        
        try:
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
        sentences = [s.strip() for s in content.replace('\n', ' ').split('.') if len(s.strip()) > 5]
        if not sentences:
            return content[:100]
        
        query_tokens = set(query.split())
        best_sentence = sentences[0]
        max_matches = -1

        for sent in sentences:
            matches = sum(1 for token in query_tokens if token in sent)
            if matches > max_matches:
                max_matches = matches
                best_sentence = sent
                
        return best_sentence[:100] + ("..." if len(best_sentence) > 100 else "")

    def search(self, query):
        print(f"\n🔍 [오프라인 하이브리드 검색 요청] 쿼리: '{query}'")
        
        if not self.embeddings:
            print("⚠️ 임베딩 모델이 로드되지 않아 검색을 수행할 수 없습니다.")
            return []

        law_results = []
        prec_results = []

        boost_keywords_law = ["대여", "빌려", "차용", "소비대차", "반환", "변제", "갚아"]
        boost_keywords_prec = ["대여금", "차용금", "변제", "반환", "청구", "인용"]

        # 🚀 [수정] 전체 JSON에서 references 안의 가중치만 추출
        feedback_data = self._load_feedback_weights()
        ref_weights = feedback_data.get("references", {})

        if self.law_db:
            docs_and_scores = self.law_db.similarity_search_with_score(query, k=10)
            boosted_laws = []

            for doc, score in docs_and_scores:
                base_similarity = max(0, min(100, int((1 - (score / 2.0)) * 100)))
                boost_score = 0
                content = doc.page_content.replace('\n', ' ') 

                matches = sum(1 for kw in boost_keywords_law if kw in content)
                boost_score += min(15, matches * 5)

                law_name = doc.metadata.get('law_name', '')
                if any(kw in law_name for kw in ["민법"]) and any(kw in content for kw in ["소비대차"]):
                     boost_score += 20 

                article_no = str(doc.metadata.get('article_no', ''))
                
                if any(kw in query for kw in ["대여금", "빌려", "돈 안"]):
                    if law_name == "민법" and article_no in ["598", "390", "393"]: boost_score += 50 
                elif any(kw in query for kw in ["보증금", "임대차", "전세", "방 빼"]):
                    if law_name == "주택임대차보호법" and article_no in ["3", "3의2", "4"]: boost_score += 50
                    elif law_name == "민법" and article_no in ["618", "623"]: boost_score += 50
                elif any(kw in query for kw in ["월세", "차임", "명도", "나가라"]):
                    if law_name == "민법" and article_no in ["640"]: boost_score += 50 
                elif any(kw in query for kw in ["손해배상", "욕", "다쳤", "사고"]):
                    if law_name == "민법" and article_no in ["750", "751"]: boost_score += 50 

                # 🚀 [수정] 추출한 ref_weights에서 direct_score 획득
                law_title = f"⚖️ [법령] {doc.metadata.get('law_name', '법령')} 제{doc.metadata.get('article_no', '')}조"
                dynamic_boost = ref_weights.get(law_title, {}).get("direct_score", 0)
                boost_score += dynamic_boost

                final_similarity = min(100, base_similarity + boost_score)
                
                boosted_laws.append({
                    "title": law_title,
                    "content": f"▶ 핵심 요약: {self._get_smart_summary(doc.page_content, query)}...",
                    "full_content": doc.page_content,
                    "similarity": final_similarity, 
                    "base_sim_debug": base_similarity 
                })

            boosted_laws = sorted(boosted_laws, key=lambda x: x["similarity"], reverse=True)
            law_results = boosted_laws[:3] 

        if self.prec_db:
            docs_and_scores = self.prec_db.similarity_search_with_score(query, k=10)
            boosted_precs = []

            for doc, score in docs_and_scores:
                base_similarity = max(0, min(100, int((1 - (score / 2.0)) * 100)))
                boost_score = 0
                content = doc.page_content.replace('\n', ' ')

                matches = sum(1 for kw in boost_keywords_prec if kw in content)
                boost_score += min(20, matches * 5)

                case_name = doc.metadata.get('case_name', '')
                if any(kw in case_name for kw in ["대여금"]):
                    boost_score += 15

                # 🚀 [수정] 추출한 ref_weights에서 direct_score 획득
                prec_title = f"📂 [판례] {doc.metadata.get('case_name', '사건')} ({doc.metadata.get('case_no', '')})"
                dynamic_boost = ref_weights.get(prec_title, {}).get("direct_score", 0)
                boost_score += dynamic_boost

                final_similarity = min(100, base_similarity + boost_score)

                boosted_precs.append({
                    "title": prec_title,
                    "content": f"▶ 판결 요지: {self._get_smart_summary(doc.page_content, query)}...",
                    "full_content": doc.page_content,
                    "similarity": final_similarity,
                    "base_sim_debug": base_similarity
                })

            boosted_precs = sorted(boosted_precs, key=lambda x: x["similarity"], reverse=True)
            prec_results = boosted_precs[:3]

        combined_results = law_results + prec_results
        
        print(f"✨ 검색 완료: 총 {len(combined_results)}건 반환 (법령 {len(law_results)}건, 판례 {len(prec_results)}건)")
        return combined_results