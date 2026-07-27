import React, { useState } from 'react';

import { useAuth } from '../contexts/AuthContext';

// 게시글 수정 모달 컴포넌트
const EditPostModal = ({ isOpen, onClose, onPostEdited, initialData }) => {
  const { currentUser } = useAuth();
  
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [gradeTag, setGradeTag] = useState(initialData?.grade_tag || initialData?.author_grade || '');
  const [majorTag, setMajorTag] = useState(initialData?.major_tag || initialData?.author_major || '');
  
  // 기존 태그 복원 (topicTags)
  const initialTopicTags = initialData?.tags?.filter(
    t => t !== initialData?.major_tag && t !== initialData?.author_major && 
         t !== initialData?.grade_tag && t !== initialData?.author_grade
  ) || [];
  
  const [topicTags, setTopicTags] = useState(initialTopicTags);
  const [reward, setReward] = useState(initialData?.reward || '음료 제공');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── 2) 관심 주제 태그 토글 함수 ──
  // 이미 선택된 태그를 다시 누르면 해제, 새로 누르면 추가 (최대 3개)
  const toggleTopicTag = (tag) => {
    if (topicTags.includes(tag)) {
      // 이미 선택되어 있으면 빼기
      setTopicTags(topicTags.filter((t) => t !== tag));
    } else if (topicTags.length < 3) {
      // 3개 미만이면 추가
      setTopicTags([...topicTags, tag]);
    }
  };

  // ── 3) 폼 제출 함수 (어제 만든 E2E 로직을 여기로 이사!) ──
  const handleSubmit = async () => {
    // 유효성 검사 세분화: 제목과 본문 검사
    if (!title.trim()) {
      return alert('제목을 입력해주세요. (최대 50자)');
    }
    if (!content.trim()) {
      return alert('내용을 입력해주세요. (최대 500자)');
    }

    // 태그 최소 1개 이상 선택 필수 검사
    const allTags = [...(gradeTag ? [gradeTag] : []), ...(majorTag ? [majorTag] : []), ...topicTags];
    if (allTags.length === 0) {
      return alert('최소 1개 이상의 태그를 선택해주세요. (학년, 학과, 관심 주제 중 하나)');
    }

    setIsSubmitting(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiUrl}/api/posts/${initialData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          tags: allTags,
          author_grade: gradeTag || '미상',
          author_major: majorTag || '미상',
          grade_tag: gradeTag || '미상',
          major_tag: majorTag || '미상',
          reward,
        }),
      });

      if (!res.ok) throw new Error('게시글 수정 실패');

      if (onPostEdited) onPostEdited();
      if (onClose) onClose();
    } catch (err) {
      console.error('게시글 수정 오류:', err);
      alert('게시글 수정에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── 4) 모달이 열려있지 않으면 아무것도 안 그림 ──
  if (!isOpen) return null;

  // ── 5) 화면 렌더링 (index.html 디자인을 JSX로 변환) ──
  return (
    <div className="modal-backdrop active" onClick={onClose}>
      <div className="modal-view active" onClick={(e) => e.stopPropagation()}>

        {/* 모달 헤더 */}
        <div className="modal-header">
          <span className="modal-header-title">고민글 수정하기</span>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        {/* 모달 본문 */}
        <div className="modal-body">

          {/* 제목 입력 */}
          <div className="form-group">
            <label className="form-label">제목</label>
            <input
              type="text"
              className="form-input"
              placeholder="만나고 싶은 선배/후배 조건을 한 줄로 요약해 주세요. (50자 이내)"
              maxLength={50}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div className="char-count">{title.length}/50</div>
          </div>

          {/* 내용 입력 */}
          <div className="form-group">
            <label className="form-label">내용</label>
            <textarea
              className="form-textarea"
              placeholder="만나고 싶은 이유와 나누고 싶은 구체적인 이야기를 작성해 주세요. (500자 이내)"
              maxLength={500}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <div className="char-count">{content.length}/500</div>
          </div>

          {/* 학년 태그 (1개만 선택) */}
          <div className="form-group">
            <label className="form-label">학년 태그 (1개만 선택 가능)</label>
            <div className="chip-container">
              {['1학년', '2학년', '3학년', '4학년'].map((tag) => (
                <span
                  key={tag}
                  className={`selectable-chip ${gradeTag === tag ? 'active' : ''}`}
                  onClick={() => setGradeTag(gradeTag === tag ? '' : tag)}
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* 학과 태그 (직접 입력) */}
          <div className="form-group">
            <label className="form-label">학과 태그 (본인의 전공을 직접 입력해주세요)</label>
            <input
              type="text"
              className="form-input"
              placeholder="예: 컴퓨터공학과"
              value={majorTag}
              onChange={(e) => setMajorTag(e.target.value)}
              list="major-suggestions"
            />
            <datalist id="major-suggestions">
              <option value="컴퓨터공학과" />
              <option value="경영학과" />
              <option value="디자인학과" />
              <option value="전자공학과" />
              <option value="기계공학과" />
              <option value="경제학과" />
              <option value="심리학과" />
            </datalist>
          </div>

          {/* 관심 주제 태그 (최대 3개) */}
          <div className="form-group">
            <label className="form-label">관심 주제 태그 (최대 3개 선택 가능)</label>
            <div className="chip-container">
              {['학교생활', '고민상담', '진로고민', '대외활동', '꿀팁공유'].map((tag) => (
                <span
                  key={tag}
                  className={`selectable-chip ${topicTags.includes(tag) ? 'active' : ''}`}
                  onClick={() => toggleTopicTag(tag)}
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* 보상 선택 */}
          <div className="form-group">
            <label className="form-label">대화 감사 보상 선택</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="post-reward"
                  value="음료 제공"
                  checked={reward === '음료 제공'}
                  onChange={(e) => setReward(e.target.value)}
                />
                ☕ 음료 제공 (제가 살게요)
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="post-reward"
                  value="식사 제공"
                  checked={reward === '식사 제공'}
                  onChange={(e) => setReward(e.target.value)}
                />
                🍽️ 식사 제공 (대접해 드릴게요)
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="post-reward"
                  value="없음"
                  checked={reward === '없음'}
                  onChange={(e) => setReward(e.target.value)}
                />
                대화만
              </label>
            </div>
          </div>
        </div>

        {/* 모달 하단 버튼 */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>취소</button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? '수정 중...' : '게시글 수정하기'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditPostModal;
