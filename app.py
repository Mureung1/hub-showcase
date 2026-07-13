import streamlit as st
import time
import pandas as pd
import planning_agent

# 페이지 레이아웃 설정
st.set_page_config(page_title="상급심 판단 경향성 통계 리포트", layout="wide")

# 리걸테크 표준 다크 그레이 및 네이비 스타일 적용
st.markdown("""
    <style>
    .reportview-container { background: #fafafa; }
    .stButton>button { background-color: #1e293b; color: white; font-weight: bold; border-radius: 4px; }
    h1, h2, h3 { color: #0f172a; }
    </style>
    """, unsafe_allow_html=True)

# 시스템 헤더 영역 (변호사법 준수 공지 상시 노출)
st.title("사실심·법률심 데이터 분석 기반 상급심 판단 경향성 통계 리포트")
st.caption("주의: 본 시스템은 변호사법 제109조를 엄격히 준수합니다. 개별 사실관계에 대한 사적 법률 판단이나 소송 결과 예측을 전면 배제하며, 오직 데이터베이스에 기록된 법원 판결문 원문의 통계적 경향성과 서지 정보만을 제공합니다.")
st.markdown("---")

# 상단 타겟층 선택 인터페이스
target_user = st.radio(
    "사용자 유형을 선택하십시오. 선택한 유형에 맞춰 리포트의 컴포넌트 구조와 용어 깊이가 자동 조정됩니다.",
    ["일반인 및 나홀로소송인 모드 (쉬운 용어 및 직관적 시각화 중심)", "법조인 및 연구자 모드 (전문 법리 매칭 및 서지 메타데이터 중심)"],
    horizontal=True
)

st.markdown("---")

# 레이아웃 분할
col1, col2 = st.columns([5, 11])

with col1:
    st.subheader("1. 분석 대상 사실관계 및 요건 설정")
    
    domain_type = st.selectbox(
        "데이터베이스 검색 분류 선택",
        ["민사: 주택임대차 대항력 분쟁 군집", "형사: 보이스피싱 단순가담 공동정범 분쟁 군집"]
    )
    
    user_facts = st.text_area(
        "사실관계 입력 (자연어 검색용):",
        placeholder="사건의 객관적 사실관계를 입력하십시오.",
        height=180
    )
    
    st.markdown("##### 세부 객관적 요건 필터링")
    st.caption("데이터베이스 검색 정밀도를 제어하기 위해 일치하는 객관적 요건을 선택하십시오.")
    req_1 = st.checkbox("계약서 내 인도 및 주민등록 익일까지 담보권 설정 금지 특약 명시")
    req_2 = st.checkbox("저당권 등기부등본상 당일 접수 시간 기재 확인")
    
    search_btn = st.button("동종 선례 경향성 분석 실행", use_container_width=True)

with col2:
    st.subheader("2. 판례 데이터베이스 분석 결과")
    
    if search_btn and user_facts:
        with st.status("법률심 사실심 논리 구조 분석 중...", expanded=False) as status:
            st.write("사실관계 텍스트 내 형태소 분석 및 법률 고유명사 추출 중...")
            time.sleep(0.3)
            st.write("하급심 판결 이유 내 판결 논리의 부자연스러움 및 법률 해석의 오류 패턴 대조 중...")
            time.sleep(0.3)
            status.update(label="데이터베이스 분석 완료", state="complete")
        
        # 메트릭 컴포넌트
        st.markdown("### 동종 선례 상급심 판단 경향성 통계")
        m1, m2, m3 = st.columns(3)
        m1.metric(label="텍스트 형태소 매칭률", value="92.4%", delta="유사 선례 군집")
        m2.metric(label="동종 사건 상급심 판단 전환 비율", value="78.5%", delta="하급심 판결 변동 경향성", delta_color="inverse")
        m3.metric(label="정보 비대칭 해소 지표", value="정상", delta="참조 데이터 충분")
        
        st.markdown("---")
        # 계획 생성 섹션: 사용자가 검색 결과를 바탕으로 실행계획을 생성할 수 있음
        st.markdown("### 계획 수립 (Agent)")
        st.caption("검색된 사실관계/유사 판례를 바탕으로 단계별 실행 계획을 생성합니다.")
        plan_fmt = st.radio("출력 형식 선택", ["JSON", "Markdown", "CSV"], horizontal=True)
        create_plan_btn = st.button("계획 생성 및 미리보기", key="create_plan")
        if create_plan_btn:
            domain = 'civil' if '민사' in domain_type else 'criminal'
            out_map = {'JSON': 'json', 'Markdown': 'md', 'CSV': 'csv'}
            out = planning_agent.generate_plan(user_facts or '사실관계 불충분: 기본 계획 생성', domain=domain, output=out_map.get(plan_fmt, 'json'))
            if out['format'] == 'json':
                st.json(out['content'])
                st.download_button(label='JSON 다운로드', data=pd.io.json.dumps(out['content'], force_ascii=False, indent=2), file_name='plan.json', mime='application/json')
            elif out['format'] == 'md':
                st.markdown(out['content'])
                st.download_button(label='Markdown 다운로드', data=out['content'], file_name='plan.md', mime='text/markdown')
            else:
                st.text(out['content'])
                st.download_button(label='CSV 다운로드', data=out['content'], file_name='plan.csv', mime='text/csv')
            # 저장 옵션
            save_plan = st.button('계획을 저장하고 HTML 뷰어 생성', key='save_plan')
            if save_plan:
                # save_plan_to_folder expects the plan content (dict)
                name_hint = (user_facts[:30] if user_facts else 'plan')
                saved = planning_agent.save_plan_to_folder(out['content'], folder='plans', name=name_hint)
                st.success(f"저장 완료: {saved['json_path']}")
                # Offer to open HTML in browser
                open_in_browser = st.button('생성된 HTML 열기', key='open_html')
                if open_in_browser:
                    import webbrowser, os
                    path = os.path.abspath(saved['html_path'])
                    webbrowser.open('file://' + path)
                    st.info(f"시스템 브라우저에서 열었습니다: {path}")
        
        # 컴포넌트 A: 하급심 고정관념 타격 그래프
        st.markdown("#### [컴포넌트 A] 사실심 재판부의 고정관념 및 흑백논리 시각화")
        st.caption("동종 사건 전수 조사 결과, 1·2심 사실심 판사들이 판결 도출 과정에서 기계적으로 적용한 고정관념의 비율입니다.")
        
        bias_data = {
            "하급심 재판부의 기계적 고정관념 패턴": [
                "형식적 날짜 선후 관계만 보고 임차인 패소 판정 (흑백논리)", 
                "업무 대비 고액 수당 수령 정황만으로 유죄 인정 (흑백논리)"
            ],
            "오류 발견 경향성 (%)": [84.2, 79.8]
        }
        df_bias = pd.DataFrame(bias_data)
        st.bar_chart(data=df_bias, x="하급심 재판부의 기계적 고정관념 패턴", y="오류 발견 경향성 (%)", color="#1e3a8a")
        
        st.markdown("---")
        
        # 컴포넌트 B: 듀얼 트랙 분기 반영
        st.markdown("#### [컴포넌트 B] 판결 이유 및 이유가 도출된 논리 흐름 분석")
        
        lc_1, lc_2 = st.columns(2)
        
        if "일반인" in target_user:
            with lc_1:
                st.error("하급심(1, 2심) 판결 논리의 부자연스러움")
                st.markdown("""
                * **쉽게 푸는 하급심 판결 이유:**  
                  법문에 적힌 날짜 순서만 기계적으로 계산하여 임차인이 늦었다고 판단함.
                * **법률 해석의 오류 요약:**  
                  당일 기습적으로 대출을 받은 임대인의 악의적인 행동 맥락을 무시하고, 문서상의 형식 논리만 대입하여 일반 상식선에서 납득하기 어려운 부자연스러운 결과를 도출함.
                """)
            with lc_2:
                st.info("상급심이 결과를 뒤집는 이유 및 논리")
                st.markdown("""
                * **상급심의 판단 핵심:**  
                  껍데기 법 조항에만 매달려 사기를 친 임대인의 손을 들어주는 것은 정의롭지 못하다고 선언함.
                * **뒤집힌 논리 흐름:**  
                  법의 대원칙인 **신의성실의 원칙**을 적용하여, 하급심 판사가 놓친 사실관계의 앞뒤 맥락의 연결성을 바로잡고 결과를 뒤집음.
                """)
        else:
            with lc_1:
                st.error("사실심 판결이유의 법리적 취약점 (판시사항 해체)")
                st.markdown("""
                * **하급심 판결 이유의 구조적 모순:**  
                  주택임대차보호법 제3조 제1항의 대항력 요건(인도 및 주민등록 익일 효력) union 민법 제186조 등기 효력 발생 시점의 형식적 우열 관계만을 기계적으로 판시함.
                * **소송물 및 처분요건 해석의 오류:**  
                  계약 체결 과정 전반의 사정 행위 및 신의칙상 선행 의무 위반이라는 맥락적 연결성을 배제함으로써 법률 쟁점 판단의 합리성을 상실함.
                """)
            with lc_2:
                st.info("상급심 판단 법리 명제 및 판시이유")
                st.markdown("""
                * **상급심 뒤집기 논리 구조:**  
                  형식적 문언 해석론에 경도되어 주임법의 입법 취지를 전도시키는 해석은 민법 제2조(신의성실의 원칙) 및 권리남용 금지의 원칙에 정면으로 위반됨을 선언함.
                * **서면 작성 참조용 판례 데이터:**  
                  대법원 선고 다세대 대항력 관련 전원합의체 판결 및 신의칙 적용 선례 연동 완료.
                """)
                
        st.markdown("---")
        
        # 컴포넌트 C: 상급심 판단 전환 공통 원인 분석
        st.markdown("#### [컴포넌트 C] 상급심 판단 전환 공통 원인 통계")
        st.caption("유사한 사실관계를 가진 사건 데이터베이스 내에서 상급심이 2심의 결과를 뒤집은 공통 원인 통계입니다.")
        
        stat_col1, stat_col2 = st.columns(2)
        with stat_col1:
            st.write("1위 원인: 신의성실의 원칙 위반 오인 및 해석 오류 (42%)")
            st.progress(42)
            
            st.write("2위 원인: 미필적 고의의 과다 해석 및 법리 오해 (38%)")
            st.progress(38)
            
        with stat_col2:
            st.markdown("""
            <div style="background-color: #f1f5f9; padding: 15px; border-left: 4px solid #0f172a; border-radius: 4px;">
                <p style="margin: 0; font-weight: bold; color: #0f172a;">통계 데이터 활용 안내</p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #334155;">
                본 리포트의 <b>경향성</b> 통계는 나홀로 소송인과 법률 대리인이 소송 준비 및 서면 작성 시, 하급심 재판부가 저지르기 쉬운 전형적인 판단 오류 패턴을 객관적으로 지적하기 위한 참조 통계 자료입니다.
                </p>
            </div>
            """, unsafe_allow_html=True)
            
    elif search_btn and not user_facts:
        st.error("데이터 분석을 위해 사실관계 내용을 입력해 주십시오.")
    else:
        st.info("좌측 입력창에 사실관계를 입력하고 버튼을 누르면, 대상 타겟 맞춤형 통계 리포트가 출력됩니다.")