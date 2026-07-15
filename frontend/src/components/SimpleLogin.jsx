import React, { useState } from 'react';

/**
 * [손코딩 학습용 간소화 컴포넌트: SimpleLogin]
 * 이 컴포넌트는 React의 useState를 이용한 상태 관리와 조건부 렌더링의 핵심을 보여줍니다.
 * 직접 한 줄씩 타이핑하며 화면이 상태(state)에 따라 어떻게 변화하는지 이해해 보세요.
 */
function SimpleLogin({ onLogin }) {
  // 1. 회원가입 모드인지 로그인 모드인지 제어하는 상태 (기본값: false = 로그인 모드)
  const [isSignUp, setIsSignUp] = useState(false);

  // 2. 사용자가 입력하는 폼 필드 상태 정의
  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [studentType, setStudentType] = useState('transfer'); // 기본값: 편입생
  const [password, setPassword] = useState('');

  // 3. 에러 메시지 상태 정의
  const [error, setError] = useState('');

  // 4. 폼 전송(로그인/회원가입) 이벤트 핸들러
  const handleSubmit = (e) => {
    e.preventDefault(); // 페이지가 새로고침되는 기본 브라우저 동작을 방지합니다.
    setError('');       // 에러 상태 초기화

    // 간단한 폼 유효성 검사 (Validation)
    if (!studentId || !password) {
      setError('학번과 비밀번호를 입력해주세요.');
      return;
    }

    if (isSignUp && !name) {
      setError('이름을 입력해주세요.');
      return;
    }

    // 로그인 정보 구성 (가짜 Mock 데이터)
    const userData = {
      studentId,
      name: isSignUp ? name : (studentType === 'transfer' ? '김경상' : '박경상'),
      studentType,
    };

    // 부모 컴포넌트(App.jsx)에서 전달된 로그인 처리 함수 호출
    onLogin(userData);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '50px auto', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>{isSignUp ? '신규 학생 가입' : '포털 로그인'}</h2>
      
      {/* 에러 상태가 있을 때만 에러 메시지 렌더링 */}
      {error && <p style={{ color: 'red', fontWeight: 'bold' }}>⚠️ {error}</p>}

      <form onSubmit={handleSubmit}>
        {/* 학번 입력창 (로그인/회원가입 공통) */}
        <div style={{ marginBottom: '10px' }}>
          <label>학번: </label>
          <input 
            type="text" 
            placeholder="2021012345" 
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)} // 상태 업데이트
          />
        </div>

        {/* 회원가입 모드(isSignUp === true)일 때만 추가적으로 이름과 학적 구분 렌더링 */}
        {isSignUp && (
          <>
            <div style={{ marginBottom: '10px' }}>
              <label>이름: </label>
              <input 
                type="text" 
                placeholder="홍길동" 
                value={name}
                onChange={(e) => setName(e.target.value)} // 상태 업데이트
              />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label>학적 구분: </label>
              <select value={studentType} onChange={(e) => setStudentType(e.target.value)}>
                <option value="transfer">편입생</option>
                <option value="general">일반재학생</option>
                <option value="double-major">다전공자</option>
              </select>
            </div>
          </>
        )}

        {/* 비밀번호 입력창 (로그인/회원가입 공통) */}
        <div style={{ marginBottom: '15px' }}>
          <label>비밀번호: </label>
          <input 
            type="password" 
            placeholder="••••••••" 
            value={password}
            onChange={(e) => setPassword(e.target.value)} // 상태 업데이트
          />
        </div>

        {/* 제출 버튼 */}
        <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#4F46E5', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          {isSignUp ? '가입 완료' : '로그인'}
        </button>
      </form>

      {/* 가입 모드 / 로그인 모드 전환 버튼 */}
      <p style={{ marginTop: '15px', textAlign: 'center', fontSize: '14px' }}>
        <button 
          type="button" 
          onClick={() => {
            setIsSignUp(!isSignUp); // true <-> false 전환
            setError('');           // 에러 메시지 초기화
          }}
          style={{ background: 'none', border: 'none', color: '#4F46E5', textDecoration: 'underline', cursor: 'pointer' }}
        >
          {isSignUp ? '이미 계정이 있으신가요? 로그인하기' : '처음이신가요? 신규 회원가입'}
        </button>
      </p>
    </div>
  );
}

export default SimpleLogin;
