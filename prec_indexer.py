import json
import os
from pydantic import BaseModel, Field
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

# 1. 판례 데이터 구조에 맞춘 Pydantic 스키마 설계
class PrecedentSchema(BaseModel):
    case_name: str = Field(description="사건명")
    case_no: str = Field(description="사건번호")
    content: str = Field(description="판결요지 및 이유")
    result: str = Field(description="판결 결과 (인용/기각 등)")

def load_and_validate_prec_data(file_path: str):
    """정제된 판례 JSON을 읽어 Pydantic 스키마로 검증하고 LangChain Document 객체로 변환"""
    print(f"정제 데이터 로드 및 무결성 검증 시작: {file_path}")
    
    with open(file_path, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    documents = []
    skip_count = 0

    for item in raw_data:
        try:
            # 스키마 검증
            valid_prec = PrecedentSchema(**item)
            searchable_text = valid_prec.content

            # 루프 안에서 생성된 valid_prec 객체를 사용
            metadata = {
                "case_name": valid_prec.case_name,
                "case_no": valid_prec.case_no,
                "result": valid_prec.result,
                "doc_type": "precedent"
            }

            doc = Document(page_content=searchable_text, metadata=metadata)
            documents.append(doc)
            
        except Exception as e:
            skip_count += 1
            continue

    print(f"✓ 검증 완료: 총 {len(documents)}개의 유효 판례 로드 성공 (실패/스킵: {skip_count}개)")
    return documents

def build_prec_vector_store(documents):
    if not documents:
        print("오류: 벡터화할 판례 데이터가 존재하지 않습니다.")
        return

    print("\n[Phase 1] BGE-M3 임베딩 모델 로드 중...")
    embeddings = HuggingFaceEmbeddings(
        model_name="BAAI/bge-m3",
        model_kwargs={'device': 'cpu'}, 
        encode_kwargs={'normalize_embeddings': True}
    )

    print("[Phase 2] 고순도 판례 데이터 벡터화 및 Faiss 인덱싱 구축 중...")
    
    vectorstore = FAISS.from_documents(documents, embeddings)
    
    save_dir = "faiss_prec_index"
    vectorstore.save_local(save_dir)
    print(f"\n✨ 성공! 판례 벡터 저장소가 '{save_dir}' 폴더에 빌드되었습니다.")

if __name__ == "__main__":
    DATA_PATH = "data/precedents_chunked.json"
    
    if not os.path.exists(DATA_PATH):
        print(f"오류: {DATA_PATH} 파일이 없습니다. 수집기를 먼저 실행하세요.")
    else:
        docs = load_and_validate_prec_data(DATA_PATH)
        build_prec_vector_store(docs)