import { useEffect, useState } from 'react';
import { BREAD_CATEGORIES } from '../data/breadCategories.js';
import { useAppStore } from '../store/useAppStore.js';
import * as authApi from '../api/auth.js';
import Modal from '../components/Modal.jsx';
import Mascot from '../components/Mascot.jsx';

function CheckGroup({ options, values, onToggle }) {
  return (
    <div className="checkgroup">
      {options.map((opt) => (
        <label key={opt}>
          <input type="checkbox" checked={values.includes(opt)} onChange={() => onToggle(opt)} />
          <span>{opt}</span>
        </label>
      ))}
    </div>
  );
}

// "가본 곳"/"가고 싶은 곳"은 회원가입 시점이 아니라 지도/리스트에서 하트·체크 눌러서 쌓는 방식으로 바뀌었다
// (client/src/store/useAppStore.js의 toggleWishlist/toggleVisited, 서버 user_bakery_status 테이블).
export default function AuthModal() {
  const authModal = useAppStore((s) => s.authModal);
  const closeAuthModal = useAppStore((s) => s.closeAuthModal);
  const openAuthModal = useAppStore((s) => s.openAuthModal);
  const restoreSession = useAppStore((s) => s.restoreSession);
  const showToast = useAppStore((s) => s.showToast);

  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [taste, setTaste] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authModal) return;
    setId('');
    setPassword('');
    setTaste([]);
    setSubmitting(false);
  }, [authModal]);

  const toggleTaste = (value) =>
    setTaste((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));

  const handleLogin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { token } = await authApi.login({ username: id, password });
      localStorage.setItem('token', token);
      await restoreSession();
      closeAuthModal();
    } catch (err) {
      showToast(err.message || '로그인에 실패했어요.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { token } = await authApi.signup({ username: id, password, taste });
      localStorage.setItem('token', token);
      await restoreSession();
      closeAuthModal();
      showToast('회원가입을 완료했어요');
    } catch (err) {
      showToast(err.message || '회원가입에 실패했어요.');
    } finally {
      setSubmitting(false);
    }
  };

  const isLogin = authModal === 'login';

  return (
    <Modal open={authModal === 'login' || authModal === 'signup'} onClose={closeAuthModal}>
      {isLogin ? (
        <form onSubmit={handleLogin}>
          <div className="modal-head">
            <Mascot />
            <h2>로그인</h2>
          </div>
          <div className="field">
            <label htmlFor="login-id">아이디</label>
            <input id="login-id" type="text" placeholder="아이디" value={id} onChange={(e) => setId(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="login-pw">비밀번호</label>
            <input
              id="login-pw"
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="modal-actions">
            <button type="button" onClick={closeAuthModal}>
              취소
            </button>
            <button type="submit" className="primary" disabled={submitting}>
              {submitting ? '로그인 중…' : '로그인'}
            </button>
          </div>
          <button type="button" className="modal-switch" onClick={() => openAuthModal('signup')}>
            계정이 없으신가요? 회원가입
          </button>
        </form>
      ) : (
        <form onSubmit={handleSignup}>
          <div className="modal-head">
            <Mascot />
            <h2>회원가입</h2>
          </div>
          <div className="field">
            <label htmlFor="signup-id">아이디</label>
            <input
              id="signup-id"
              type="text"
              placeholder="아이디"
              value={id}
              onChange={(e) => setId(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="signup-pw">비밀번호</label>
            <input
              id="signup-pw"
              type="password"
              placeholder="비밀번호 (4자 이상)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="field">
            <label>빵 취향</label>
            <CheckGroup options={BREAD_CATEGORIES} values={taste} onToggle={toggleTaste} />
          </div>
          <div className="modal-actions">
            <button type="button" onClick={closeAuthModal}>
              취소
            </button>
            <button type="submit" className="primary" disabled={submitting}>
              {submitting ? '가입 중…' : '가입하기'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
