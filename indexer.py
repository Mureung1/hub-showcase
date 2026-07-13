import json
import os
from pydantic import BaseModel, Field
from typing import Optional
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

# 1. 새롭게 변경된 조문 데이터 구조에 맞춘 Pydantic 스키마 설계
class LawArticleSchema(BaseModel):
    law_name: str = Field(description="법령명 (예: 민법)")
    article_no: str = Field(description="조문 번호 (예: 1)")
    content: str = Field(description="구조화된 조문 내용 전체")

def load_and_validate_data(file_path: str):
    """정제된 조문 JSON을 읽어 Pydantic 스키마로 검증하고 LangChain Document 객체로 변환"""
    print(f"정제 데이터 로드 및 무결성 검증 시작: {file_path}")
    
    with open(file_path, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    documents = []
    skip_count = 0

    for item in raw_data:
        try:
            # 수정된 스키마로 새 데이터 구조 검증
            valid_article = LawArticleSchema(**item)
            
            # 이미 article_collector.py에서 자연어로 완벽하게 포맷팅해 둔 content를 그대로 검색 텍스트로 활용
            searchable_text = valid_article.content

            # 메타데이터 보존 (추후 에이전트가 답변 출처로 조항 번호를 명시할 때 사용)
            metadata = {
                "law_name": valid_article.law_name,
                "article_no": valid_article.article_no
            }

            # LangChain Document 객체 생성
            doc = Document(page_content=searchable_text, metadata=metadata)
            documents.append(doc)
            
        except Exception as e:
            skip_count += 1
            continue

    print(f"✓ 검증 완료: 총 {len(documents)}개의 유효 조문 로드 성공 (실패/스킵: {skip_count}개)")
    return documents

def build_vector_store(documents):
    """BGE-M3 모델을 활용하여 조문 본문 기반 Faiss 벡터 DB 구축"""
    if not documents:
        print("오류: 벡터화할 문서 데이터가 존재하지 않습니다. 파이프라인을 중단합니다.")
        return

    print("\n[Phase 1] BGE-M3 임베딩 모델 로드 중...")
    
    # 로드맵 지정: 고성능 한국어 검색을 위한 BGE-M3 임베딩 세팅
    embeddings = HuggingFaceEmbeddings(
        model_name="BAAI/bge-m3",
        model_kwargs={'device': 'cpu'}, # GPU 환경이라면 'cuda'로 변경 가능
        encode_kwargs={'normalize_embeddings': True}
    )

    print("[Phase 2] 고순도 조문 데이터 벡터화 및 Faiss 인덱싱 구축 중...")
    print("           (1,975개 조문의 시맨틱 임베딩 연산으로 인해 수 분 소요될 수 있습니다)")
    
    # 정제된 문서들을 벡터 저장소에 주입
    vectorstore = FAISS.from_documents(documents, embeddings)
    
    # 로컬 디렉토리에 에이전트 지식 인덱스 영구 저장
    save_dir = "faiss_law_index"
    vectorstore.save_local(save_dir)
    print(f"\n✨ 성공! 조문 본문 벡터 저장소가 '{save_dir}' 폴더에 완벽하게 빌드되었습니다.")

if __name__ == "__main__":
    # 데이터 소스 경로 지정 (정제된 조문 본문 파일)
    DATA_PATH = "data/law_articles_chunked.json"
    
    if not os.path.exists(DATA_PATH):
        print(f"오류: {DATA_PATH} 파일이 존재하지 않습니다. article_collector.py를 먼저 실행하세요.")
    else:
        # 데이터 정제 및 임베딩 파이프라인 가동
        docs = load_and_validate_data(DATA_PATH)
        build_vector_store(docs)