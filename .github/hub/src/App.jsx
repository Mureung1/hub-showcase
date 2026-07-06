import "./App.css";

function App() {
  return (
    <div className="container">

      <header className="header">
        <h1>Campus Scheduler</h1>
        <p>조건 기반 대학생 시간표 추천 서비스</p>
      </header>

      <section>
        <h2>📖 프로젝트 개요</h2>
        <p>
          대학생들은 수강신청 기간마다 원하는 시간표를 구성하기 위해
          많은 시간을 소비합니다.
          Campus Scheduler는 사용자가 원하는 조건을 입력하면
          가장 적합한 시간표를 자동으로 추천하는 웹 서비스입니다.
        </p>
      </section>

      <section>
        <h2>🎯 프로젝트 목표</h2>

        <ul>
          <li>시간표 작성 시간 단축</li>
          <li>조건에 맞는 시간표 자동 추천</li>
          <li>강의 정보 비교 기능 제공</li>
          <li>수강신청 의사결정 지원</li>
        </ul>
      </section>

      <section>
        <h2>❗ 해결하고자 하는 문제</h2>

        <ul>
          <li>원하는 공강 만들기 어려움</li>
          <li>시간 충돌을 직접 확인해야 함</li>
          <li>학점을 직접 계산해야 함</li>
          <li>여러 시간표를 비교하기 어려움</li>
          <li>시간표 수정 시 처음부터 다시 작성해야 함</li>
        </ul>
      </section>

      <section>
        <h2>⚙ 주요 기능</h2>

        <h3>회원 기능</h3>
        <ul>
          <li>회원가입</li>
          <li>로그인</li>
          <li>회원정보 수정</li>
        </ul>

        <h3>강의 조회</h3>
        <ul>
          <li>과목명 검색</li>
          <li>교수명 검색</li>
          <li>전공 검색</li>
          <li>학점 검색</li>
        </ul>

        <h3>강의 상세 정보</h3>
        <ul>
          <li>과목명</li>
          <li>교수명</li>
          <li>학점</li>
          <li>강의시간</li>
          <li>강의실</li>
        </ul>

        <h3>시간표 작성</h3>
        <ul>
          <li>드래그 앤 드롭</li>
          <li>시간 충돌 확인</li>
          <li>학점 자동 계산</li>
        </ul>

        <h3>조건 기반 시간표 추천</h3>
        <ul>
          <li>최대 학점 설정</li>
          <li>공강 지정</li>
          <li>오전 수업 제외</li>
          <li>전공 우선 선택</li>
          <li>요일별 수업 최소화</li>
        </ul>

        <h3>시간표 비교</h3>
        <ul>
          <li>총 학점</li>
          <li>공강 수</li>
          <li>오전 수업 수</li>
          <li>전공 학점</li>
          <li>교양 학점</li>
        </ul>

        <h3>즐겨찾기</h3>
        <ul>
          <li>저장</li>
          <li>수정</li>
          <li>삭제</li>
        </ul>

      </section>

      <section>
        <h2>🖥 시스템 구성</h2>

        <pre>
사용자
   │
React (Front-End)
   │
Node.js + Express
   │
MySQL
        </pre>
      </section>

      <section>
        <h2>🗄 데이터베이스</h2>

        <h3>User</h3>
        <ul>
          <li>id</li>
          <li>email</li>
          <li>password</li>
          <li>name</li>
        </ul>

        <h3>Lecture</h3>
        <ul>
          <li>id</li>
          <li>subject</li>
          <li>professor</li>
          <li>major</li>
          <li>credit</li>
          <li>classroom</li>
          <li>day</li>
          <li>start_time</li>
          <li>end_time</li>
        </ul>

        <h3>Timetable</h3>
        <ul>
          <li>id</li>
          <li>user_id</li>
          <li>title</li>
        </ul>

        <h3>TimetableLecture</h3>
        <ul>
          <li>timetable_id</li>
          <li>lecture_id</li>
        </ul>

      </section>

      <section>
        <h2>🤖 추천 알고리즘</h2>

        <ol>
          <li>사용자 조건 입력</li>
          <li>강의 목록 조회</li>
          <li>시간 충돌 제거</li>
          <li>학점 계산</li>
          <li>조건 만족 여부 확인</li>
          <li>최적의 시간표 추천</li>
        </ol>
      </section>

      <section>
        <h2>🛠 사용 기술</h2>

        <ul>
          <li>React</li>
          <li>JavaScript</li>
          <li>HTML</li>
          <li>CSS</li>
          <li>Node.js</li>
          <li>Express</li>
          <li>MySQL</li>
          <li>Git / GitHub</li>
          <li>VS Code</li>
        </ul>
      </section>

      <section>
        <h2>✨ 기대 효과</h2>

        <ul>
          <li>시간표 작성 시간 단축</li>
          <li>조건에 맞는 시간표 추천</li>
          <li>시간표 비교 기능 제공</li>
          <li>효율적인 학기 계획 지원</li>
        </ul>
      </section>

      <section>
        <h2>🚀 향후 확장 기능</h2>

        <ul>
          <li>강의 후기</li>
          <li>교수 평가</li>
          <li>졸업 요건 분석</li>
          <li>친구와 시간표 공유</li>
          <li>모바일 지원</li>
          <li>학교별 데이터 추가</li>
          <li>캘린더 연동</li>
        </ul>
      </section>

    </div>
  );
}

export default App;