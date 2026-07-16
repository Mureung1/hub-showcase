from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import os

class Retriever:
    def __init__(self):
        print("\n[INIT] 로컬 임베딩 모델 및 벡터 DB 로딩 시작...")
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
        
        # 1. 법령 검색 (유사도 점수 포함)
        if self.law_db:
            # similarity_search 대신 similarity_search_with_score 사용
            docs = self.law_db.similarity_search_with_score(query, k=3)
            print(f"   - 법령 검색: 3건 강제 추출 완료")
            
            for doc, score in docs:
                # [수정] FAISS L2 거리를 백분율(%)로 변환하는 공식 (0~2 사이 값을 0~100%로 스케일링)
                similarity_percent = max(0, min(100, int((1 - (score / 2.0)) * 100)))
                
                combined_results.append({
                    "title": f"⚖️ [법령] {doc.metadata.get('law_name', '법령')} 제{doc.metadata.get('article_no', '')}조",
                    "content": f"▶ 핵심 요약: {self._get_smart_summary(doc.page_content, query)}...",
                    "full_content": doc.page_content,
                    "similarity": similarity_percent
                })

        # 2. 판례 검색 (유사도 점수 포함)
        if self.prec_db:
            docs = self.prec_db.similarity_search_with_score(query, k=3)
            print(f"   - 판례 검색: 3건 강제 추출 완료")
            
            for doc, score in docs:
                similarity_percent = max(0, min(100, int((1 - (score / 2.0)) * 100)))
                
                combined_results.append({
                    "title": f"📂 [판례] {doc.metadata.get('case_name', '사건')} ({doc.metadata.get('case_no', '')})",
                    "content": f"▶ 판결 요지: {self._get_smart_summary(doc.page_content, query)}...",
                    "full_content": doc.page_content,
                    "similarity": similarity_percent
                })
        
        # [선택사항] 연관성이 높은(similarity가 큰) 순서대로 정렬
        combined_results = sorted(combined_results, key=lambda x: x["similarity"], reverse=True)
        
        print(f"✨ 검색 완료: 총 {len(combined_results)}건 반환")
        return combined_results