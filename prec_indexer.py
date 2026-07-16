import os
import json
import torch
from tqdm import tqdm
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

DATA_FILE = "data/precedents_chunked.json"
INDEX_DIR = "faiss_prec_index"

# [최적화 1] 사용할 수 있는 가장 최적의 하드웨어(GPU 또는 CPU)를 자동으로 선택합니다.
if torch.cuda.is_available():
    device = "cuda"
    model_kwargs = {"device": "cuda"}
    encode_kwargs = {"batch_size": 32, "normalize_embeddings": True}
    print("🚀 Nvidia GPU(CUDA) 가속을 활성화합니다.")
else:
    device = "cpu"
    # CPU인 경우 물리 코어를 최대한 활용하도록 PyTorch 내부 스레드 제한을 해제합니다.
    num_cores = os.cpu_count() or 4
    torch.set_num_threads(num_cores)
    model_kwargs = {"device": "cpu"}
    # CPU 병목을 줄이기 위해 배치 사이즈를 줄이고 정규화를 설정합니다.
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
        doc = Document(
            page_content=item["content"],
            metadata={
                "case_name": item["case_name"],
                "case_no": item["case_no"],
                "result": item["result"]
            }
        )
        documents.append(doc)

    print("\n임베딩 모델을 로드하고 벡터화를 시작합니다...")
    
    # [최적화 2] CPU에서 무거운 bge-m3 대신, 가볍고 정교한 한국어 전문 모델 'ko-sroberta-multitask' 사용
    # 기존 bge-m3 모델을 고집해야 한다면 model_name="BAAI/bge-m3"로 다시 바꾸셔도 무방합니다. (위 하드웨어 최적화만으로도 빨라집니다)
    model_name = "jhgan/ko-sroberta-multitask" 
    
    embeddings = HuggingFaceEmbeddings(
        model_name=model_name,
        model_kwargs=model_kwargs,
        encode_kwargs=encode_kwargs
    )
    
    # FAISS 빌드 실행
    print("▶ FAISS 인덱스 빌드 진행 중 (잠시만 기다려주세요)...")
    vectorstore = FAISS.from_documents(documents, embeddings)
    
    # 로컬 저장
    vectorstore.save_local(INDEX_DIR)
    print(f"\n✅ 성공적으로 판례 벡터 DB가 '{INDEX_DIR}'에 저장되었습니다!")

if __name__ == "__main__":
    build_prec_vector_store()