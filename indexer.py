import json
import os
import torch
from tqdm import tqdm  # [추가] 처리 속도 시각화
from pydantic import BaseModel, Field
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

class LawArticleSchema(BaseModel):
    law_name: str = Field(description="법령명")
    article_no: str = Field(description="조문 번호")
    content: str = Field(description="조문 내용")

# 하드웨어 가속 최적화
if torch.cuda.is_available():
    model_kwargs = {"device": "cuda"}
    encode_kwargs = {"batch_size": 64, "normalize_embeddings": True} # 배치 사이즈 상향
else:
    num_cores = os.cpu_count() or 4
    torch.set_num_threads(num_cores)
    model_kwargs = {"device": "cpu"}
    encode_kwargs = {"batch_size": 32, "normalize_embeddings": True}

def load_and_validate_data(file_path: str):
    print(f"📄 정제 데이터 로드 중: {file_path}")
    with open(file_path, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    documents = []
    # tqdm을 사용하여 로드 과정을 시각화
    for item in tqdm(raw_data, desc="데이터 검증 중"):
        try:
            valid = LawArticleSchema(**item)
            documents.append(Document(
                page_content=valid.content, 
                metadata={"law_name": valid.law_name, "article_no": valid.article_no}
            ))
        except Exception:
            continue
    return documents

def build_vector_store(documents):
    if not documents:
        print("❌ 오류: 문서 데이터가 없습니다.")
        return

    print("\n[Phase 1] 임베딩 모델 로드 (ko-sroberta-multitask)...")
    embeddings = HuggingFaceEmbeddings(
        model_name="jhgan/ko-sroberta-multitask",
        model_kwargs=model_kwargs,
        encode_kwargs=encode_kwargs
    )

    print("[Phase 2] 벡터화 및 인덱싱 시작...")
    
    # [최적화] from_documents는 메모리를 한 번에 많이 점유합니다. 
    # 데이터가 아주 많다면 아래와 같이 덩어리(chunk) 단위로 추가하는 방식이 훨씬 안정적입니다.
    vectorstore = None
    batch_size = 500  # 한 번에 500개씩 처리
    
    for i in tqdm(range(0, len(documents), batch_size), desc="벡터 인덱싱 중"):
        batch = documents[i : i + batch_size]
        if vectorstore is None:
            vectorstore = FAISS.from_documents(batch, embeddings)
        else:
            vectorstore.add_documents(batch)
            
    save_dir = "faiss_law_index"
    vectorstore.save_local(save_dir)
    print(f"\n✨ 성공! 총 {len(documents)}개 조문이 '{save_dir}'에 인덱싱되었습니다.")

if __name__ == "__main__":
    DATA_PATH = "data/law_articles_chunked.json"
    if os.path.exists(DATA_PATH):
        docs = load_and_validate_data(DATA_PATH)
        build_vector_store(docs)
    else:
        print(f"❌ 오류: {DATA_PATH} 파일이 없습니다.")