import os
import json
import torch
from tqdm import tqdm
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

DATA_FILE = "data/precedents_chunked.json"
INDEX_DIR = "faiss_prec_index"

# [최적화 1] 하드웨어 가속 자동 선택
if torch.cuda.is_available():
    model_kwargs = {"device": "cuda"}
    encode_kwargs = {"batch_size": 32, "normalize_embeddings": True}
    print("🚀 Nvidia GPU(CUDA) 가속을 활성화합니다.")
else:
    num_cores = os.cpu_count() or 4
    torch.set_num_threads(num_cores)
    model_kwargs = {"device": "cpu"}
    encode_kwargs = {"batch_size": 16, "normalize_embeddings": True}
    print(f"💻 CPU 멀티스레딩 연산을 활성화합니다. (활성 코어 수: {num_cores}개)")

def build_prec_vector_store():
    if not os.path.exists(DATA_FILE):
        print(f"❌ 데이터 파일이 없습니다: {DATA_FILE}")
        return

    with open(DATA_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    if not data:
        print("❌ JSON 파일이 비어 있습니다.")
        return

    print(f"\n총 {len(data)}개의 판례 데이터를 포맷팅 중...")
    
    documents = []
    # tqdm을 사용하여 전처리 단계를 시각화합니다.
    for item in tqdm(data, desc="문서 변환 중"):
        
        # [핵심 수정] 판례 데이터도 명찰을 확실하게 붙여주어 임베딩 특성을 강화합니다.
        enhanced_content = f"[판례] {item['case_name']} ({item['case_no']})\n{item['content']}"
        
        doc = Document(
            page_content=enhanced_content,
            metadata={
                "case_name": item["case_name"],
                "case_no": item["case_no"],
                "result": item["result"]
            }
        )
        documents.append(doc)

    print("\n임베딩 모델을 로드하고 벡터화를 시작합니다...")
    model_name = "jhgan/ko-sroberta-multitask" 
    
    embeddings = HuggingFaceEmbeddings(
        model_name=model_name,
        model_kwargs=model_kwargs,
        encode_kwargs=encode_kwargs
    )
    
    # [최적화 2] 판례 데이터가 많아질 경우를 대비한 배치(Batch) 처리 추가
    print("▶ FAISS 인덱스 빌드 진행 중 (배치 처리)...")
    vectorstore = None
    batch_size = 500  
    
    for i in tqdm(range(0, len(documents), batch_size), desc="벡터 인덱싱 중"):
        batch = documents[i : i + batch_size]
        if vectorstore is None:
            vectorstore = FAISS.from_documents(batch, embeddings)
        else:
            vectorstore.add_documents(batch)
    
    # 로컬 저장
    vectorstore.save_local(INDEX_DIR)
    print(f"\n✅ 성공적으로 총 {len(documents)}개의 판례 벡터 DB가 '{INDEX_DIR}'에 저장되었습니다!")

if __name__ == "__main__":
    build_prec_vector_store()