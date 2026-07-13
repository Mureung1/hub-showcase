from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

def test_retriever(query):
    # 1. 모델 로드
    embeddings = HuggingFaceEmbeddings(model_name="BAAI/bge-m3")
    vectorstore = FAISS.load_local("faiss_law_index", embeddings, allow_dangerous_deserialization=True)

    # 2. 유사도 검색 수행
    print(f"\n[에이전트 질문]: {query}")
    results = vectorstore.similarity_search_with_score(query, k=2)
    
    for doc, score in results:
        print(f"\n--- 유사도 점수: {score:.4f} ---")
        print(f"출처: {doc.metadata['law_name']} {doc.metadata['article_no']}조")
        print(f"본문: {doc.page_content}")

if __name__ == "__main__":
    # 법률적 상황을 던져보세요
    test_retriever("미성년자가 허락받은 재산을 임의로 처분할 수 있어?")