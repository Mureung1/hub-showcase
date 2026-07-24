import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CreatePostModal from './CreatePostModal';

describe('CreatePostModal Component (글쓰기 기능 테스트)', () => {
  const mockOnClose = vi.fn();
  const mockOnPostCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // alert 및 console.error 모킹
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // global fetch 모킹
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------
  // 1. 정상 동작 (Happy Path)
  // ---------------------------------------------------------
  describe('1. 정상 동작 (Happy Path)', () => {
    it('isOpen이 true일 때 모든 기본 UI 요소(제목, 내용, 태그, 보상옵션, 버튼)가 정상 렌더링되어야 한다', () => {
      render(
        <CreatePostModal
          isOpen={true}
          onClose={mockOnClose}
          onPostCreated={mockOnPostCreated}
        />
      );

      expect(screen.getByText('고민글 올리기')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/만나고 싶은 선배\/후배 조건을 한 줄로 요약해 주세요/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/만나고 싶은 이유와 나누고 싶은 구체적인 이야기를 작성해 주세요/i)).toBeInTheDocument();
      expect(screen.getByText('#1학년')).toBeInTheDocument();
      expect(screen.getByText('#학교생활')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '고민글 게시하기' })).toBeInTheDocument();
    });

    it('제목, 내용, 태그를 입력하고 게시 버튼을 누르면 API 호출 후 성공적으로 모달이 닫혀야 한다', async () => {
      // API 성공 응답 모킹
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, message: '생성 성공' }),
      });

      render(
        <CreatePostModal
          isOpen={true}
          onClose={mockOnClose}
          onPostCreated={mockOnPostCreated}
        />
      );

      // 1) 제목 입력
      const titleInput = screen.getByPlaceholderText(/만나고 싶은 선배\/후배 조건을 한 줄로 요약해 주세요/i);
      fireEvent.change(titleInput, { target: { value: '컴퓨터공학과 진로 고민 나누실 분' } });

      // 2) 내용 입력
      const contentInput = screen.getByPlaceholderText(/만나고 싶은 이유와 나누고 싶은 구체적인 이야기를 작성해 주세요/i);
      fireEvent.change(contentInput, { target: { value: '3학년 선배님께 전공 심화 과목 추천받고 싶습니다!' } });

      // 3) 태그 선택 (학년 태그)
      const gradeChip = screen.getByText('#2학년');
      fireEvent.click(gradeChip);

      // 4) 게시 버튼 클릭
      const submitBtn = screen.getByRole('button', { name: '고민글 게시하기' });
      fireEvent.click(submitBtn);

      // 5) 검증: fetch API 호출 확인
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      const fetchArgs = global.fetch.mock.calls[0];
      expect(fetchArgs[0]).toContain('/api/posts');
      const requestBody = JSON.parse(fetchArgs[1].body);

      expect(requestBody).toEqual({
        title: '컴퓨터공학과 진로 고민 나누실 분',
        content: '3학년 선배님께 전공 심화 과목 추천받고 싶습니다!',
        tags: ['2학년'],
        author_grade: '2학년',
        author_major: '미상',
        grade_tag: '2학년',
        major_tag: '미상',
        reward: '음료 제공',
      });

      // 콜백 호출 검증
      expect(mockOnPostCreated).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('관심 주제 태그는 최대 3개까지만 선택할 수 있어야 한다', () => {
      render(
        <CreatePostModal
          isOpen={true}
          onClose={mockOnClose}
          onPostCreated={mockOnPostCreated}
        />
      );

      const topic1 = screen.getByText('#학교생활');
      const topic2 = screen.getByText('#고민상담');
      const topic3 = screen.getByText('#진로고민');
      const topic4 = screen.getByText('#대외활동');

      fireEvent.click(topic1);
      fireEvent.click(topic2);
      fireEvent.click(topic3);
      fireEvent.click(topic4); // 4번째 클릭

      // active 클래스가 3개까지만 적용되었는지 확인
      expect(topic1).toHaveClass('active');
      expect(topic2).toHaveClass('active');
      expect(topic3).toHaveClass('active');
      expect(topic4).not.toHaveClass('active');
    });
  });

  // ---------------------------------------------------------
  // 2. 유효성 검사 실패 케이스 (Validation Errors)
  // ---------------------------------------------------------
  describe('2. 입력 유효성 검사 (Validation Errors)', () => {
    it('제목이 비어있을 경우 경고창을 띄우고 API를 호출하지 않아야 한다', () => {
      render(
        <CreatePostModal
          isOpen={true}
          onClose={mockOnClose}
          onPostCreated={mockOnPostCreated}
        />
      );

      const contentInput = screen.getByPlaceholderText(/만나고 싶은 이유와 나누고 싶은 구체적인 이야기를 작성해 주세요/i);
      fireEvent.change(contentInput, { target: { value: '내용만 입력함' } });
      fireEvent.click(screen.getByText('#1학년'));

      const submitBtn = screen.getByRole('button', { name: '고민글 게시하기' });
      fireEvent.click(submitBtn);

      expect(window.alert).toHaveBeenCalledWith('제목을 입력해주세요. (최대 50자)');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('내용이 비어있을 경우 경고창을 띄우고 API를 호출하지 않아야 한다', () => {
      render(
        <CreatePostModal
          isOpen={true}
          onClose={mockOnClose}
          onPostCreated={mockOnPostCreated}
        />
      );

      const titleInput = screen.getByPlaceholderText(/만나고 싶은 선배\/후배 조건을 한 줄로 요약해 주세요/i);
      fireEvent.change(titleInput, { target: { value: '제목만 입력함' } });
      fireEvent.click(screen.getByText('#1학년'));

      const submitBtn = screen.getByRole('button', { name: '고민글 게시하기' });
      fireEvent.click(submitBtn);

      expect(window.alert).toHaveBeenCalledWith('내용을 입력해주세요. (최대 500자)');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('태그가 단 하나도 선택되지 않은 경우 경고창을 띄우고 API를 호출하지 않아야 한다', () => {
      render(
        <CreatePostModal
          isOpen={true}
          onClose={mockOnClose}
          onPostCreated={mockOnPostCreated}
        />
      );

      const titleInput = screen.getByPlaceholderText(/만나고 싶은 선배\/후배 조건을 한 줄로 요약해 주세요/i);
      const contentInput = screen.getByPlaceholderText(/만나고 싶은 이유와 나누고 싶은 구체적인 이야기를 작성해 주세요/i);

      fireEvent.change(titleInput, { target: { value: '제목 입력' } });
      fireEvent.change(contentInput, { target: { value: '내용 입력' } });

      const submitBtn = screen.getByRole('button', { name: '고민글 게시하기' });
      fireEvent.click(submitBtn);

      expect(window.alert).toHaveBeenCalledWith('최소 1개 이상의 태그를 선택해주세요. (학년, 학과, 관심 주제 중 하나)');
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------
  // 3. 예외 및 실패 케이스 (API Failure)
  // ---------------------------------------------------------
  describe('3. API 실패 케이스 (API Failures)', () => {
    it('서버가 500 에러를 반환할 때 실패 경고 메시지가 표시되어야 한다', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(
        <CreatePostModal
          isOpen={true}
          onClose={mockOnClose}
          onPostCreated={mockOnPostCreated}
        />
      );

      fireEvent.change(screen.getByPlaceholderText(/만나고 싶은 선배\/후배 조건을 한 줄로 요약해 주세요/i), {
        target: { value: '제목' },
      });
      fireEvent.change(screen.getByPlaceholderText(/만나고 싶은 이유와 나누고 싶은 구체적인 이야기를 작성해 주세요/i), {
        target: { value: '내용' },
      });
      fireEvent.click(screen.getByText('#1학년'));

      fireEvent.click(screen.getByRole('button', { name: '고민글 게시하기' }));

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('게시글 생성에 실패했습니다.');
      });
      expect(mockOnPostCreated).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------
  // 4. 모달 비활성화 상태 테스트
  // ---------------------------------------------------------
  describe('4. 모달 비활성화 상태 (isOpen=false)', () => {
    it('isOpen이 false이면 아무 요소도 렌더링되지 않아야 한다', () => {
      const { container } = render(
        <CreatePostModal
          isOpen={false}
          onClose={mockOnClose}
          onPostCreated={mockOnPostCreated}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });
});
