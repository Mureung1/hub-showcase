import React from 'react';
import { LibraryItem } from '../types';

interface MyLibraryProps {
  savedPapers: LibraryItem[];
  handleRemovePaper: (paperId: string) => Promise<void>;
}

function MyLibrary({ savedPapers, handleRemovePaper }: MyLibraryProps) {
  return (
    <div className="library-page-container">
      <div className="library-page-header">
        <h2>📚 내 서재 보관함 (My Library)</h2>
        <p>보관 처리하신 핵심 논문 목록입니다. 언제든 에이전트 핵심 인사이트를 조회하거나 제외할 수 있습니다.</p>
      </div>

      {savedPapers.length === 0 ? (
        <div className="library-empty-card bento-card">
          <div className="placeholder-content">
            <div className="placeholder-icon">📚</div>
            <p className="placeholder-desc">
              보관된 논문이 없습니다. Workspace에서 마음에 드는 논문을 보관해 보세요!
            </p>
          </div>
        </div>
      ) : (
        <div className="library-grid">
          {savedPapers.map((item) => (
            <div key={item.paperId} className="paper-card library-card-content">
              <div className="library-card-top">
                <div className="ribbon-badge">
                  {item.matchScore}% Match
                </div>
                <h3 className="paper-title library-card-title">{item.title}</h3>
                <p className="paper-authors">{item.authors}</p>
              </div>

              <div className="library-card-bottom">
                <div className="paper-meta library-card-meta">
                  <span className="paper-channel">{item.channel}</span> • <span className="paper-year">{item.year}</span>
                </div>
                <button 
                  className="remove-btn library-remove-btn" 
                  onClick={() => handleRemovePaper(item.paperId)}
                >
                  서재에서 제거
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyLibrary;
