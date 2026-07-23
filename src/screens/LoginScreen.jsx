import { useState } from 'react';

function LoginScreen({ onLogin, isLoggingIn, loginError }) {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  function handleSubmit(event) {
    event.preventDefault();

    if (id.trim() === '' || password.trim() === '') {
      setValidationError('아이디와 비밀번호를 모두 입력해주세요.');
      return;
    }

    setValidationError('');
    onLogin(id, password);
  }

  const displayedError = validationError || loginError;

  return (
    <section className="card">
      <p className="eyebrow">LOGIN</p>
      <h1>진로 에이전트 서비스</h1>
      <p className="subtitle">아이디와 비밀번호를 입력해주세요.</p>

      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="loginId">아이디</label>
          <input
            id="loginId"
            type="text"
            className="field-input"
            value={id}
            onChange={(event) => setId(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="loginPassword">비밀번호</label>
          <input
            id="loginPassword"
            type="password"
            className="field-input"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        {displayedError && <p className="error-text">{displayedError}</p>}

        <button type="submit" className="btn-primary btn-block" disabled={isLoggingIn}>
          {isLoggingIn ? '확인하는 중...' : '로그인'}
        </button>
      </form>
    </section>
  );
}

export default LoginScreen;
