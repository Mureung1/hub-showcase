import { useEffect, useState } from 'react';
import { allCategories, bakeries } from '../data/bakeries.js';
import { useAppStore } from '../store/useAppStore.js';
import Modal from '../components/Modal.jsx';
import Mascot from '../components/Mascot.jsx';

const VISITED_OPTIONS = bakeries.slice(0, 2).map((b) => b.name);
const WISHLIST_OPTIONS = bakeries.slice(2, 4).map((b) => b.name);

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

// CLAUDE.md 6번 결정사항: JWT는 서버 연동(3주차) 시 붙는다. 지금은 mock 로그인으로 화면만 완성.
// TODO(3주차): api/auth.js의 login/signup으로 교체하고 토큰을 localStorage에 저장.
export default function AuthModal() {
  const authModal = useAppStore((s) => s.authModal);
  const closeAuthModal = useAppStore((s) => s.closeAuthModal);
  const openAuthModal = useAppStore((s) => s.openAuthModal);
  const login = useAppStore((s) => s.login);

  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [taste, setTaste] = useState([]);
  const [visited, setVisited] = useState([]);
  const [wishlist, setWishlist] = useState([]);

  useEffect(() => {
    if (!authModal) return;
    setId('');
    setPassword('');
    setTaste([]);
    setVisited([]);
    setWishlist([]);
  }, [authModal]);

  const toggleFrom = (setter) => (value) =>
    setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));

  const handleLogin = (e) => {
    e.preventDefault();
    login({ id: id.trim() || '데모사용자', taste: [], visited: [], wishlist: [] });
  };

  const handleSignup = (e) => {
    e.preventDefault();
    login({ id: id.trim() || '새사용자', taste, visited, wishlist });
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
            <button type="submit" className="primary">
              로그인
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
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="field">
            <label>빵 취향</label>
            <CheckGroup options={allCategories} values={taste} onToggle={toggleFrom(setTaste)} />
          </div>
          <div className="field">
            <label>가본 곳</label>
            <CheckGroup options={VISITED_OPTIONS} values={visited} onToggle={toggleFrom(setVisited)} />
          </div>
          <div className="field">
            <label>가고 싶은 곳</label>
            <CheckGroup options={WISHLIST_OPTIONS} values={wishlist} onToggle={toggleFrom(setWishlist)} />
          </div>
          <div className="modal-actions">
            <button type="button" onClick={closeAuthModal}>
              취소
            </button>
            <button type="submit" className="primary">
              가입하기
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
