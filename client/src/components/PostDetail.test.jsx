import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PostDetail from './PostDetail';
import * as AuthContext from '../contexts/AuthContext';

// AuthContext 모킹
vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('PostDetail Component', () => {
  const mockPost = {
    id: 'post-1',
    title: 'Test Post',
    content: 'This is a test post',
    author_id: 'user-1',
    authorName: 'TestUser',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // 기본적으로 fetch를 성공 상태(채팅방 없음)로 모킹
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ hasChats: false }),
      })
    );
  });

  it('타인의 글을 볼 때: "1:1 채팅 신청하기" 버튼이 표시된다 (Happy Path)', () => {
    // currentUser가 author_id와 다름
    AuthContext.useAuth.mockReturnValue({
      currentUser: { id: 'user-2', username: 'HelperUser' },
    });

    render(<PostDetail post={mockPost} onBack={vi.fn()} />);
    
    // 버튼 렌더링 확인
    expect(screen.getByText('🤝 1:1 채팅 신청하기')).toBeInTheDocument();
    
    // 수정/삭제 버튼은 없어야 함
    expect(screen.queryByText('✏️ 글 수정')).not.toBeInTheDocument();
    expect(screen.queryByText('🗑️ 글 삭제')).not.toBeInTheDocument();
  });

  it('본인의 글을 볼 때 (채팅 없음): "수정", "삭제" 버튼이 활성화되어 표시된다 (Happy Path)', async () => {
    // currentUser가 author_id와 같음
    AuthContext.useAuth.mockReturnValue({
      currentUser: { id: 'user-1', username: 'TestUser' },
    });

    render(<PostDetail post={mockPost} onBack={vi.fn()} />);

    // API 호출이 완료될 때까지 대기
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/posts/post-1/has-chats'));
    });

    // 버튼 렌더링 확인
    const editBtn = screen.getByText('✏️ 글 수정');
    const deleteBtn = screen.getByText('🗑️ 글 삭제');
    
    expect(editBtn).toBeInTheDocument();
    expect(deleteBtn).toBeInTheDocument();
    
    // 비활성화 되지 않아야 함
    expect(editBtn).not.toBeDisabled();
    expect(deleteBtn).not.toBeDisabled();
  });

  it('본인의 글을 볼 때 (채팅 있음): "수정", "삭제" 버튼이 비활성화된다 (Edge Case)', async () => {
    AuthContext.useAuth.mockReturnValue({
      currentUser: { id: 'user-1', username: 'TestUser' },
    });

    // 채팅이 존재한다고 모킹
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ hasChats: true }),
      })
    );

    render(<PostDetail post={mockPost} onBack={vi.fn()} />);

    await waitFor(() => {
      const editBtn = screen.getByText('✏️ 글 수정');
      expect(editBtn).toBeDisabled();
      expect(screen.getByText('🗑️ 글 삭제')).toBeDisabled();
    });

    // 경고 메시지 확인
    expect(screen.getByText('* 진행 중인 채팅이 있어 수정/삭제가 불가능합니다.')).toBeInTheDocument();
  });

  it('API 에러 시: UI가 깨지지 않고 기본 상태(수정/삭제 가능)를 유지한다 (Failure Case)', async () => {
    AuthContext.useAuth.mockReturnValue({
      currentUser: { id: 'user-1', username: 'TestUser' },
    });

    // API 에러 발생 모킹
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

    render(<PostDetail post={mockPost} onBack={vi.fn()} />);

    await waitFor(() => {
      const editBtn = screen.getByText('✏️ 글 수정');
      expect(editBtn).not.toBeDisabled();
    });
  });
});
