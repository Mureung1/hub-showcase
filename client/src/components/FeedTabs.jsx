import React, { useState } from 'react';

const FeedTabs = ({ currentCategory, onCategoryChange, filters, onFilterChange }) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const toggleFilter = (key, value) => {
    onFilterChange({ ...filters, [key]: filters[key] === value ? '' : value });
  };

  return (
    <>
      <div className="search-box">
        <div className="search-input-wrapper">
          <span className="search-icon-inside">🔍</span>
          <input type="text" className="search-input" placeholder="키워드로 게시글을 검색해보세요" />
        </div>
        <button 
          className={`toggle-filter-btn ${isFilterOpen ? 'active' : ''}`}
          onClick={() => setIsFilterOpen(!isFilterOpen)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>
          </svg>
          필터
        </button>
      </div>

      <div className={`tag-filter-container ${isFilterOpen ? '' : 'hidden'}`}>
        <div className="tag-row">
          <span className="filter-label">상태</span>
          <div className="chip-container">
            <button className={`filter-chip ${filters.status === 'recruiting' ? 'active' : ''}`}
              onClick={() => toggleFilter('status', 'recruiting')}>모집중</button>
            <button className={`filter-chip ${filters.status === 'completed' ? 'active' : ''}`}
              onClick={() => toggleFilter('status', 'completed')}>모집완료</button>
          </div>
        </div>
        <div className="tag-row">
          <span className="filter-label">보상</span>
          <div className="chip-container">
            <button className={`filter-chip ${filters.reward === '음료 제공' ? 'active' : ''}`}
              onClick={() => toggleFilter('reward', '음료 제공')}>☕ 음료 제공</button>
            <button className={`filter-chip ${filters.reward === '식사 제공' ? 'active' : ''}`}
              onClick={() => toggleFilter('reward', '식사 제공')}>🍽️ 식사 제공</button>
          </div>
        </div>
      </div>

      <div className="sort-bar">
        <div className="web-nav" style={{ display: 'flex', gap: '20px', height: 'auto' }}>
          {['전체', '질문', '고민', '프로젝트'].map(cat => (
            <div 
              key={cat}
              className={`web-nav__item ${currentCategory === cat ? 'active' : ''}`}
              style={{ paddingBottom: '12px' }}
              onClick={() => onCategoryChange(cat)}
            >
              {cat}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default FeedTabs;
