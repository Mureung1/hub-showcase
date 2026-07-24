// ProtectedRoute(로그인 가드) 테스트 — 분기 3개를 전부 고정한다:
// ① 세션 있음 → children 렌더  ② 세션 없음 → /login 리다이렉트  ③ loading 중 → 판단 보류(빈 화면)
//
// AuthProvider를 실제로 쓰지 않고 useAuth를 모킹한다 — AuthProvider는 lib/supabase.ts를
// 끌고 오는데, 그 파일은 VITE_SUPABASE_* env가 없으면 throw하기 때문(테스트를 env에 묶지 않기).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuth } from './AuthContext';

vi.mock('./AuthContext', () => ({ useAuth: vi.fn() }));
const mockedUseAuth = vi.mocked(useAuth);

// 가드 판단에는 세션의 "존재 여부"만 쓰이므로 내용물은 빈 껍데기로 충분
const 가짜세션 = {} as Session;

/** App.tsx의 라우팅 구조를 축소 재현 — 주소창 없이 메모리 라우터로 특정 경로에서 렌더 */
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div>로그인 화면</div>} />
        <Route path="/" element={<ProtectedRoute><div>보호된 화면</div></ProtectedRoute>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockedUseAuth.mockReset();
  });

  it('세션이 있으면 children을 보여준다', () => {
    mockedUseAuth.mockReturnValue({ session: 가짜세션, loading: false });
    renderAt('/');
    expect(screen.getByText('보호된 화면')).toBeInTheDocument();
  });

  it('세션이 없으면 /login으로 되돌린다', () => {
    mockedUseAuth.mockReturnValue({ session: null, loading: false });
    renderAt('/');
    expect(screen.getByText('로그인 화면')).toBeInTheDocument();
    expect(screen.queryByText('보호된 화면')).not.toBeInTheDocument();
  });

  it('세션 복원 중(loading)에는 아무것도 보여주지 않는다 — 오리다이렉트 방지', () => {
    // 새로고침 직후: 세션은 아직 null이지만 loading이라 /login으로 보내면 안 된다
    mockedUseAuth.mockReturnValue({ session: null, loading: true });
    renderAt('/');
    expect(screen.queryByText('보호된 화면')).not.toBeInTheDocument();
    expect(screen.queryByText('로그인 화면')).not.toBeInTheDocument();
  });
});
