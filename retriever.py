from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import os

class Retriever:
    def __init__(self):
        print("\n[INIT] 로컬 임베딩 모델 및 벡터 DB 로딩 시작...")
        # [수정] 인덱서와 완벽하게 동일한 한국어 특화 모델 사용!
        self.embeddings = HuggingFaceEmbeddings(model_name="jhgan/ko-sroberta-multitask")
        self._load_dbs()

    def _load_dbs(self):
        try:
            if os.path.exists("faiss_law_index"):
                self.law_db = FAISS.load_local("faiss_law_index", self.embeddings, allow_dangerous_deserialization=True)
                print("✅ 법령 DB 로드 완료")
            else:
                self.law_db = None
                print("⚠️ 법령 DB 파일 없음")
        except Exception as e:
            print(f"⚠️ 법령 DB 로드 실패: {e}")
            self.law_db = None

        try:
            if os.path.exists("faiss_prec_index"):
                self.prec_db = FAISS.load_local("faiss_prec_index", self.embeddings, allow_dangerous_deserialization=True)
                print("✅ 판례 DB 로드 완료")
            else:
                self.prec_db = None
                print("⚠️ 판례 DB 파일 없음")
        except Exception as e:
            print(f"⚠️ 판례 DB 로드 실패: {e}")
            self.prec_db = None

    def _get_smart_summary(self, content, query):
        sentences = [s.strip() for s in content.split('.') if len(s.split()) > 5]
        if not sentences: return content[:100]
        
        query_vec = self.embeddings.embed_query(query)
        sent_vecs = self.embeddings.embed_documents(sentences)
        best_idx = np.argmax(cosine_similarity([query_vec], sent_vecs))
        return sentences[best_idx]

    def search(self, query):
        print(f"\n🔍 [검색 요청] 쿼리: '{query}'")
        combined_results = []
        
        # 1. 법령 검색 (커트라인 없이 무조건 상위 3개 강제 추출)
        if self.law_db:
            docs = self.law_db.similarity_search(query, k=3)
            print(f"   - 법령 검색: 3건 강제 추출 완료")
            
            for doc in docs:
                combined_results.append({
                    "title": f"⚖️ [법령] {doc.metadata.get('law_name', '법령')} 제{doc.metadata.get('article_no', '')}조",
                    "content": f"▶ 핵심 요약: {self._get_smart_summary(doc.page_content, query)}...",
                    "full_content": doc.page_content
                })

        # 2. 판례 검색 (커트라인 없이 무조건 상위 3개 강제 추출)
        if self.prec_db:
            docs = self.prec_db.similarity_search(query, k=3)
            print(f"   - 판례 검색: 3건 강제 추출 완료")
            
            for doc in docs:
                combined_results.append({
                    "title": f"📂 [판례] {doc.metadata.get('case_name', '사건')} ({doc.metadata.get('case_no', '')})",
                    "content": f"▶ 판결 요지: {self._get_smart_summary(doc.page_content, query)}...",
                    "full_content": doc.page_content
                })
        
        print(f"✨ 검색 완료: 총 {len(combined_results)}건 반환")
        return combined_results