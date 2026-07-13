import os
from jinja2 import Environment, FileSystemLoader
from datetime import datetime

class DocumentGenerator:
    def __init__(self, template_dir="templates"):
        print("문서 생성(Action) 엔진을 초기화합니다...")
        # 1. 템플릿 폴더 경로 설정 및 환경 초기화
        self.env = Environment(loader=FileSystemLoader(template_dir))
        
        # 저장할 폴더 생성
        self.output_dir = "generated_docs"
        os.makedirs(self.output_dir, exist_ok=True)

    def generate_content_proof(self, data: dict):
        """
        LLM이 추출한 JSON 데이터를 받아 내용증명 템플릿에 바인딩합니다.
        """
        try:
            # 2. 템플릿 파일 로드
            template = self.env.get_template("cert_of_contents.txt")
            
            # 3. 데이터 바인딩 (현재 날짜 자동 추가)
            data['date'] = datetime.now().strftime("%Y년 %m월 %d일")
            rendered_document = template.render(data)
            
            # 4. 결과물을 파일로 저장
            filename = f"내용증명_{data['receiver_name']}_{datetime.now().strftime('%Y%m%d%H%M')}.txt"
            filepath = os.path.join(self.output_dir, filename)
            
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(rendered_document)
                
            print(f"\n✨ [Action 성공] 법률 문서가 생성되었습니다: {filepath}")
            return rendered_document
            
        except Exception as e:
            import traceback
            traceback.print_exc() # 에러가 어디서 났는지 상세히 출력해줍니다.
            return None

if __name__ == "__main__":
    # 나중에 LLM(GPT-4)이 사용자 대화를 분석해서 이 형태의 JSON(Dictionary)을 던져주게 됩니다.
    # 지금은 테스트를 위해 더미 데이터를 사용합니다.
    sample_llm_output = {
        "sender_name": "홍길동",
        "sender_address": "대구광역시 북구 대학로 80",
        "sender_phone": "010-1234-5678",
        "receiver_name": "김악덕",
        "receiver_address": "서울특별시 강남구 테헤란로 123",
        "title": "임대차계약 종료에 따른 임대차보증금 반환 촉구",
        "facts": "- 발신인은 수신인과 2024년 5월 1일 전세 계약을 체결했습니다.\n- 계약 만료 2개월 전인 2026년 3월에 갱신 거절 통보를 하였습니다.\n- 그러나 만료일이 지났음에도 보증금 1억 원을 반환하지 않고 있습니다.",
        "legal_basis": "주택임대차보호법 제3조의2(보증금의 회수)",
        "demands": "본 서면 수령 후 즉시 보증금 1억 원을 발신인의 계좌(국민은행 111-222-3333)로 반환해 주시기 바랍니다.",
        "deadline": "2026년 7월 20일"
    }
    
    # 생성기 실행
    doc_gen = DocumentGenerator()
    final_doc = doc_gen.generate_content_proof(sample_llm_output)
    
    print("\n--- [생성된 문서 미리보기] ---\n")
    print(final_doc)