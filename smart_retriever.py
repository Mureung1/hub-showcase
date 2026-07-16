from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import os
import json

# [NEW] 수집기와 인덱서를 가져옵니다. 
# (파일명이 다르면 맞게 수정해주세요)
# from prec_collector import get_precedents_with_cleaning
# from prec_indexer import load_and_validate_prec_data, build_prec_vector_store

HISTORY_FILE = "data/search_history.json"

class SmartRetriever:
    def __init__(self):
        print("로컬 임베딩 모델 및 벡터 DB 로딩 중...")
        self.embeddings = HuggingFaceEmbeddings(model_name="BAAI/bge-m3")
        self._load_dbs()
        
        # 히스토리 파일 초기화
        if not os.path.exists(HISTORY_FILE):
            os.makedirs(os.path.dirname(HISTORY_FILE), exist_ok=True)
            with open(HISTORY_FILE, "w", encoding="utf-8") as f:
                json.dump([], f)

    def _load_dbs(self):
        """DB를 (재)로드하는 함수"""
        if os.path.exists("faiss_law_index"):
            self.law_db = FAISS.load_local("faiss_law_index", self.embeddings, allow_dangerous_deserialization=True)
        else:
            self.law_db = None
            
        if os.path.exists("faiss_prec_index"):
            self.prec_db = FAISS.load_local("faiss_prec_index", self.embeddings, allow_dangerous_deserialization=True)
        else:
            self.prec_db = None

    def _is_searched_before(self, query):
        """히스토리 파일에 검색어가 있는지 확인"""
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            history = json.load(f)
        return query in history

    def _add_to_history(self, query):
        """새로운 검색어를 히스토리에 추가"""
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            history = json.load(f)
        history.append(query)
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, ensure_ascii=False, indent=2)

    def _get_smart_summary(self, content, query):
        """의미 기반 핵심 문장 추출 (기존과 동일)"""
        sentences = [s.strip() for s in content.split('.') if len(s.split()) > 5]
        if not sentences: return content[:100]
        query_vec = self.embeddings.embed_query(query)
        sent_vecs = self.embeddings.embed_documents(sentences)
        best_idx = np.argmax(cosine_similarity([query_vec], sent_vecs))
        return sentences[best_idx]

    def search(self, query):
        """통합 검색 메인 로직"""
        
        # ---------------------------------------------------------
        # [NEW] 1. 캐시 확인 및 데이터 온디맨드 수집
        # ---------------------------------------------------------
        if not self._is_searched_before(query):
            print(f"[{query}] 처음 검색된 키워드입니다. 실시간 수집을 시작합니다...")
            
            # TODO: 여기에 실제 수집기/인덱서 호출 코드 연결
            # get_precedents_with_cleaning(query)  <-- 수집기 (키워드 1개만 받도록 수정 필요)
            # docs = load_and_validate_prec_data("data/precedents_chunked.json")
            # build_prec_vector_store(docs)
            
            self._add_to_history(query) # 수집 완료 후 히스토리에 기록
            self._load_dbs() # DB가 업데이트되었으니 메모리에 다시 로드
            print("데이터 업데이트 및 DB 리로드 완료!")
        else:
            print(f"[{query}] 이미 수집된 키워드입니다. 캐시된 DB에서 바로 검색합니다.")
        # ---------------------------------------------------------

        # 2. 검색 및 결과 가공 (기존과 동일)
        combined_results = []
        
        if self.law_db:
            law_results = self.law_db.similarity_search_with_score(query, k=2)
            for doc, score in law_results:
                summary = self._get_smart_summary(doc.page_content, query)
                combined_results.append({
                    "title": f"⚖️ [법령] {doc.metadata.get('law_name', '법령')} 제{doc.metadata.get('article_no', '')}조",
                    "content": f"▶ 핵심 요약: {summary}..."
                })
                
        if self.prec_db:
            prec_results = self.prec_db.similarity_search_with_score(query, k=2)
            for doc, score in prec_results:
                summary = self._get_smart_summary(doc.page_content, query)
                combined_results.append({
                    "title": f"📂 [판례] {doc.metadata.get('case_name', '사건')} ({doc.metadata.get('case_no', '')})",
                    "content": f"▶ 판결 요지: {summary}..."
                })
                
        return combined_results