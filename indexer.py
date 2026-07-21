import json
import os
import torch
from tqdm import tqdm  
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
    encode_kwargs = {"batch_size": 64, "normalize_embeddings": True}
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
    for item in tqdm(raw_data, desc="데이터 검증 중"):
        try:
            valid = LawArticleSchema(**item)
            
            # [핵심 수정] 텍스트만 넣지 않고, 법령명과 조항을 본문에 합쳐서 임베딩 특성 강화!
            enhanced_content = f"법령명: {valid.law_name} | 조항: 제{valid.article_no}조 | 내용: {valid.content}"
            
            documents.append(Document(
                page_content=enhanced_content, 
                metadata={"law_name": valid.law_name, "article_no": valid.article_no, "original_content": valid.content}
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
    
    # [최적화] 메모리 폭발(OOM) 방지를 위한 배치 처리
    vectorstore = None
    batch_size = 500  
    
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