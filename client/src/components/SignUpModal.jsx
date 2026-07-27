import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../api/supabaseClient';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// 전북대 이메일 도메인 검증 정규식
const isSchoolEmail = (email) => {
  return /^[^\s@]+@jbnu\.ac\.kr$/i.test(email);
};

// 아이디 형식 검증 (2~20자 영문, 숫자, 밑줄)
const isValidUsername = (username) => {
  return /^[a-zA-Z0-9_]{2,20}$/.test(username);
};

// 회원가입 모달 컴포넌트
const SignUpModal = ({ isOpen, onClose, onSwitchToLogin }) => {
  const { signup } = useAuth();

  // 입력 상태
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [verifiedUserId, setVerifiedUserId] = useState(null);

  // 검증 상태
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [usernameChecked, setUsernameChecked] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(false);

  // 타이머 상태
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef(null);

  // UI 상태
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);


  // 타이머 로직
  useEffect(() => {
    if (timerSeconds > 0) {
      timerRef.current = setTimeout(() => setTimerSeconds(timerSeconds - 1), 1000);
    } else if (timerSeconds === 0 && otpSent && !emailVerified) {
      setOtpError('인증 시간이 초과되었습니다. 다시 발송해 주세요.');
    }
    return () => clearTimeout(timerRef.current);
  }, [timerSeconds, otpSent, emailVerified]);

  // 타이머 포맷
  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // 폼 초기화
  const resetForm = () => {
    setEmail('');
    setOtpCode('');
    setUsername('');
    setPassword('');
    setPasswordConfirm('');
    setVerifiedUserId(null);
    setEmailVerified(false);
    setOtpSent(false);
    setUsernameChecked(false);
    setUsernameAvailable(false);
    setTimerSeconds(0);
    setError('');
    setEmailError('');
    setOtpError('');
    setUsernameError('');
    setPasswordError('');
    setIsSubmitting(false);
    setIsSendingOtp(false);
    clearTimeout(timerRef.current);
  };

  // ① 학교 메일 OTP 발송
  const handleSendOtp = async () => {
    setEmailError('');
    setOtpError('');

    if (!email.trim()) {
      setEmailError('이메일을 입력해 주세요');
      return;
    }

    if (!isSchoolEmail(email)) {
      setEmailError('전북대학교 이메일(@jbnu.ac.kr)만 사용 가능합니다');
      return;
    }

    setIsSendingOtp(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) {
        if (error.message.includes('rate') || error.message.includes('limit')) {
          setEmailError('잠시 후 다시 시도해 주세요');
        } else {
          setEmailError(error.message);
        }
        return;
      }
      setOtpSent(true);
      setTimerSeconds(180); // 3분
      setOtpError('');
    } catch (e) {
      setEmailError('서버 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // ② OTP 인증번호 확인
  const handleVerifyOtp = async () => {
    setOtpError('');

    if (otpCode.length !== 8) {
      setOtpError('발송된 8자리 인증번호를 정확히 입력해 주세요');
      return;
    }

    try {
      let verifyResult = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'signup' // 처음 가입하는 유저용 토큰 (Confirm signup 템플릿)
      });

      // 만약 signup 타입으로 실패하면, 이미 가계정이 있는 유저(Magic Link 템플릿)일 수 있으므로 재시도
      if (verifyResult.error) {
        verifyResult = await supabase.auth.verifyOtp({
          email,
          token: otpCode,
          type: 'magiclink'
        });
      }

      if (verifyResult.error) {
        setOtpError('인증번호가 일치하지 않습니다. 다시 확인해 주세요.');
        return;
      }

      const { data } = verifyResult;

      setVerifiedUserId(data.user.id);
      setEmailVerified(true);
      setTimerSeconds(0);
      clearTimeout(timerRef.current);

      // OTP 인증 후 Supabase 세션이 생기면 로그아웃 (가입 전이므로)
      await supabase.auth.signOut();
    } catch (e) {
      setOtpError('서버 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  // ③ 아이디 중복확인
  const handleCheckUsername = async () => {
    setUsernameError('');
    setUsernameChecked(false);
    setUsernameAvailable(false);

    if (!isValidUsername(username)) {
      setUsernameError('2~20자 영문, 숫자, 밑줄(_)만 사용 가능합니다');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/auth/check-username?username=${encodeURIComponent(username)}`);
      const data = await res.json();

      if (data.available) {
        setUsernameChecked(true);
        setUsernameAvailable(true);
        setUsernameError('');
      } else {
        setUsernameChecked(true);
        setUsernameAvailable(false);
        setUsernameError('이미 사용 중인 아이디입니다');
      }
    } catch (e) {
      setUsernameError('서버 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  // 아이디 변경 시 중복확인 리셋
  const handleUsernameChange = (val) => {
    setUsername(val);
    setUsernameChecked(false);
    setUsernameAvailable(false);
    setUsernameError('');
  };

  // 비밀번호 실시간 검증
  const getPasswordMatchMessage = () => {
    if (!passwordConfirm) return null;
    if (password === passwordConfirm) return { text: '✅ 비밀번호가 일치합니다', color: '#16A34A' };
    return { text: '비밀번호가 일치하지 않습니다', color: '#DC2626' };
  };

  // 전체 폼 유효성 (모든 단계 통과 여부)
  const isFormValid =
    emailVerified &&
    usernameChecked && usernameAvailable &&
    password.length >= 8 &&
    password === passwordConfirm;

  // 회원가입 제출
  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setPasswordError('');

    if (password.length < 8) {
      setPasswordError('비밀번호는 8자 이상이어야 합니다');
      return;
    }
    if (password !== passwordConfirm) {
      setPasswordError('비밀번호가 일치하지 않습니다');
      return;
    }

    setIsSubmitting(true);
    try {
      await signup(email, password, username, verifiedUserId);
      resetForm();
      onClose();
    } catch (err) {
      if (err.message.includes('이미 가입된')) {
        setError('이미 가입된 이메일입니다. 로그인해 주세요.');
      } else {
        setError(err.message || '회원가입에 실패했습니다');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 모달 닫기
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // 로그인으로 전환
  const handleSwitchToLogin = () => {
    resetForm();
    onSwitchToLogin();
  };

  const passwordMatch = getPasswordMatchMessage();

  if (!isOpen) return null;

  // 인라인 스타일 공통
  const inputStyle = {
    flex: 1, padding: '12px 14px', fontSize: '14px',
    border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-sm)',
    outline: 'none', transition: 'border-color 0.2s'
  };
  const labelStyle = {
    fontSize: '13px', fontWeight: '600', color: 'var(--color-text-secondary)',
    display: 'block', marginBottom: '6px'
  };
  const actionBtnStyle = (enabled) => ({
    padding: '12px 16px', fontSize: '13px', fontWeight: 'bold',
    color: '#fff', whiteSpace: 'nowrap',
    backgroundColor: enabled ? 'var(--color-primary-cta)' : '#ccc',
    border: 'none', borderRadius: 'var(--radius-sm)',
    cursor: enabled ? 'pointer' : 'not-allowed',
    transition: 'background-color 0.2s'
  });
  const errorStyle = {
    fontSize: '12px', marginTop: '4px'
  };
  const successStyle = {
    fontSize: '12px', color: '#16A34A', marginTop: '4px', fontWeight: '600'
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '460px', width: '90%', padding: '32px',
          borderRadius: 'var(--radius-lg)', background: '#fff',
          position: 'relative', maxHeight: '90vh', overflowY: 'auto'
        }}
      >
        {/* 닫기 버튼 */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'none', border: 'none', fontSize: '20px',
            cursor: 'pointer', color: 'var(--color-text-tertiary)'
          }}
        >✕</button>

        {/* 제목 */}
        <h2 style={{
          fontSize: '22px', fontWeight: 'bold', textAlign: 'center',
          marginBottom: '28px', color: 'var(--color-text-primary)'
        }}>
          <span style={{ color: 'var(--color-primary-orange)' }}>meetry</span> 회원가입
        </h2>

        <form onSubmit={handleSignUp}>

          {/* ① 학교 이메일 */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>학교 이메일</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(''); setEmailVerified(false); setOtpSent(false); }}
                placeholder="example@jbnu.ac.kr"
                disabled={emailVerified}
                style={{ ...inputStyle, backgroundColor: emailVerified ? '#F0FDF4' : '#fff' }}
                onFocus={(e) => e.target.style.borderColor = 'var(--color-primary-orange)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--color-divider)'}
              />
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={emailVerified || isSendingOtp || !email.trim()}
                style={actionBtnStyle(!emailVerified && !isSendingOtp && email.trim().length > 0)}
              >
                {isSendingOtp ? '발송중...' : otpSent ? '재발송' : '인증번호 발송'}
              </button>
            </div>
            {emailError && <div style={{ ...errorStyle, color: '#DC2626' }}>{emailError}</div>}
            {emailVerified && <div style={successStyle}>✅ 학교 인증 완료</div>}
          </div>

          {/* ② 인증번호 입력 (OTP 발송 후 표시) */}
          {otpSent && !emailVerified && (
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>
                인증번호 입력
                {timerSeconds > 0 && (
                  <span style={{ marginLeft: '8px', color: 'var(--color-primary-orange)', fontWeight: 'bold' }}>
                    ⏱️ {formatTimer(timerSeconds)}
                  </span>
                )}
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => { setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8)); setOtpError(''); }}
                  placeholder="인증번호 입력"
                  maxLength={8}
                  style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = 'var(--color-primary-orange)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--color-divider)'}
                />
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={otpCode.length !== 8 || timerSeconds === 0}
                  style={actionBtnStyle(otpCode.length === 8 && timerSeconds > 0)}
                >
                  인증확인
                </button>
              </div>
              {otpError && <div style={{ ...errorStyle, color: '#DC2626' }}>{otpError}</div>}
            </div>
          )}

          {/* ③ 아이디 */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>아이디</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="2~20자 영문, 숫자, 밑줄"
                maxLength={20}
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = 'var(--color-primary-orange)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--color-divider)'}
              />
              <button
                type="button"
                onClick={handleCheckUsername}
                disabled={!isValidUsername(username)}
                style={actionBtnStyle(isValidUsername(username))}
              >
                중복확인
              </button>
            </div>
            {usernameError && <div style={{ ...errorStyle, color: '#DC2626' }}>{usernameError}</div>}
            {usernameChecked && usernameAvailable && <div style={successStyle}>✅ 사용 가능한 아이디</div>}
          </div>

          {/* ④ 비밀번호 */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
              placeholder="8자 이상"
              autoComplete="new-password"
              style={{ ...inputStyle, width: '100%' }}
              onFocus={(e) => e.target.style.borderColor = 'var(--color-primary-orange)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--color-divider)'}
            />
            {password.length > 0 && password.length < 8 && (
              <div style={{ ...errorStyle, color: '#DC2626' }}>비밀번호는 8자 이상이어야 합니다</div>
            )}
          </div>

          {/* ⑤ 비밀번호 확인 */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>비밀번호 확인</label>
            <input
              type="password"
              value={passwordConfirm}
              onChange={(e) => { setPasswordConfirm(e.target.value); setPasswordError(''); }}
              placeholder="비밀번호를 다시 입력하세요"
              autoComplete="new-password"
              style={{ ...inputStyle, width: '100%' }}
              onFocus={(e) => e.target.style.borderColor = 'var(--color-primary-orange)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--color-divider)'}
            />
            {passwordMatch && <div style={{ ...errorStyle, color: passwordMatch.color }}>{passwordMatch.text}</div>}
            {passwordError && <div style={{ ...errorStyle, color: '#DC2626' }}>{passwordError}</div>}
          </div>

          {/* 전체 에러 메시지 */}
          {error && (
            <div style={{
              padding: '10px 14px', marginBottom: '16px',
              background: '#FEF2F2', border: '1px solid #FECACA',
              borderRadius: 'var(--radius-sm)', color: '#DC2626',
              fontSize: '13px', textAlign: 'center'
            }}>
              {error}
              {error.includes('로그인') && (
                <button
                  type="button"
                  onClick={handleSwitchToLogin}
                  style={{
                    marginLeft: '8px', background: 'none', border: 'none',
                    cursor: 'pointer', color: 'var(--color-primary-orange)',
                    fontWeight: 'bold', fontSize: '13px', textDecoration: 'underline'
                  }}
                >
                  로그인하기
                </button>
              )}
            </div>
          )}

          {/* 가입하기 버튼 */}
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            style={{
              width: '100%', padding: '14px', fontSize: '15px', fontWeight: 'bold',
              color: '#fff',
              backgroundColor: isFormValid && !isSubmitting ? 'var(--color-primary-cta)' : '#ccc',
              border: 'none', borderRadius: 'var(--radius-sm)',
              cursor: isFormValid && !isSubmitting ? 'pointer' : 'not-allowed',
              transition: 'background-color 0.2s'
            }}
          >
            {isSubmitting ? '가입 처리 중...' : '🎓 가입하기'}
          </button>
        </form>

        {/* 로그인 안내 */}
        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          이미 계정이 있으신가요?{' '}
          <button
            onClick={handleSwitchToLogin}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-primary-orange)', fontWeight: 'bold',
              fontSize: '13px', textDecoration: 'underline'
            }}
          >
            로그인
          </button>
        </p>
      </div>
    </div>
  );
};

export default SignUpModal;
