import React, { useState, useEffect } from 'react';

const FeedTabs = ({ currentCategory, onCategoryChange, filters = {}, onFilterChange, searchQuery = '', onSearch }) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(searchQuery);
  const [warningMessage, setWarningMessage] = useState('');

  useEffect(() => {
    setSearchTerm(searchQuery);
  }, [searchQuery]);

  const toggleFilter = (key, value) => {
    if (onFilterChange) {
      onFilterChange({ ...filters, [key]: filters[key] === value ? '' : value });
    }
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const trimmed = searchTerm.trim();

    if (trimmed.length === 0) {
      setWarningMessage('');
      if (onSearch) onSearch('');
      return;
    }

    if (trimmed.length < 2) {
      setWarningMessage('검색어는 최소 2자 이상 입력해주세요!');
      setTimeout(() => setWarningMessage(''), 3000);
      return;
    }

    setWarningMessage('');
    if (onSearch) {
      onSearch(trimmed);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    if (warningMessage) setWarningMessage('');

    const trimmed = val.trim();
    if (trimmed.length >= 2) {
      if (onSearch) onSearch(trimmed);
    } else {
      if (onSearch) onSearch('');
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    setWarningMessage('');
    if (onSearch) onSearch('');
  };

  return (
    <>
      <div className="search-box" style={{ position: 'relative' }}>
        <form onSubmit={handleSearchSubmit} className="search-input-wrapper" style={{ flex: 1, position: 'relative' }}>
          <span className="search-icon-inside" style={{ cursor: 'pointer' }} onClick={handleSearchSubmit}>🔍</span>
          <input 
            type="text" 
            className="search-input" 
            placeholder="키워드로 게시글을 검색해보세요 (2자 이상)..." 
            value={searchTerm}
            onChange={handleInputChange}
          />
          {searchTerm && (
            <button 
              type="button" 
              onClick={handleClear}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--color-text-tertiary)',
                fontSize: '14px',
                cursor: 'pointer',
                padding: '2px'
              }}
              title="검색어 지우기"
            >
              ✕
            </button>
          )}
          {warningMessage && (
            <div style={{
              position: 'absolute',
              top: '42px',
              left: '12px',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)',
              zIndex: 110,
              fontWeight: '500'
            }}>
              ⚠️ {warningMessage}
            </div>
          )}
        </form>
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
              onClick={() => {
                if (onCategoryChange) onCategoryChange(cat);
              }}
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
