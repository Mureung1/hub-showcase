import os
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

    def _get_smart_summary(self, content, query):
        sentences = [s.strip() for s in content.split('.') if len(s.split()) > 5]
        if not sentences or not self.embeddings: 
            return content[:100]
        
        try:
            query_vec = self.embeddings.embed_query(query)
            sent_vecs = self.embeddings.embed_documents(sentences)
            best_idx = np.argmax(cosine_similarity([query_vec], sent_vecs))
            return sentences[best_idx]
        except:
            return content[:100]

    def search(self, query):
        print(f"\n🔍 [의미 검색 요청] 쿼리: '{query}'")
        
        if not self.embeddings:
            print("⚠️ 임베딩 모델이 없어 검색을 수행할 수 없습니다.")
            return []

        # [변경점] 법령과 판례를 섞지 않고 따로 담을 리스트 생성
        law_results = []
        prec_results = []

        # 1. 법령 검색
        if self.law_db:
            docs_and_scores = self.law_db.similarity_search_with_score(query, k=3)
            
            for doc, score in docs_and_scores:
                similarity_percent = max(0, min(100, int((1 - (score / 2.0)) * 100)))
                
                law_results.append({
                    "title": f"⚖️ [법령] {doc.metadata.get('law_name', '법령')} 제{doc.metadata.get('article_no', '')}조",
                    "content": f"▶ 핵심 요약: {self._get_smart_summary(doc.page_content, query)}...",
                    "full_content": doc.page_content,
                    "similarity": similarity_percent
                })

        # 2. 판례 검색
        if self.prec_db:
            docs_and_scores = self.prec_db.similarity_search_with_score(query, k=3)
            
            for doc, score in docs_and_scores:
                similarity_percent = max(0, min(100, int((1 - (score / 2.0)) * 100)))
                
                prec_results.append({
                    "title": f"📂 [판례] {doc.metadata.get('case_name', '사건')} ({doc.metadata.get('case_no', '')})",
                    "content": f"▶ 판결 요지: {self._get_smart_summary(doc.page_content, query)}...",
                    "full_content": doc.page_content,
                    "similarity": similarity_percent
                })
        
        # 3. 법령과 판례를 각각 독립적으로 유사도 내림차순 정렬
        law_results = sorted(law_results, key=lambda x: x["similarity"], reverse=True)
        prec_results = sorted(prec_results, key=lambda x: x["similarity"], reverse=True)
        
        # 4. 법령을 먼저 배치하고, 그 아래에 판례 리스트를 이어 붙임 (그룹화)
        combined_results = law_results + prec_results
        
        print(f"✨ 검색 완료: 총 {len(combined_results)}건 반환 (법령 {len(law_results)}건, 판례 {len(prec_results)}건)")
        return combined_results