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
            <div key={item.paperId} className="paper-card library-card-content" style={{ display: 'flex', flexDirection: 'column' }}>
              <div 
                className="ribbon-badge"
                style={{ position: 'relative', top: 'auto', left: 'auto', right: 'auto', display: 'inline-block', marginBottom: '12px', alignSelf: 'flex-start', borderRadius: '4px' }}
              >
                {item.matchScore}% Match
              </div>

              <div className="library-card-top">
                <h3 className="paper-title library-card-title">{item.title}</h3>
                <p className="paper-authors">{item.authors}</p>
              </div>

              <div className="library-card-bottom" style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column' }}>
                <div className="paper-meta library-card-meta">
                  <span className="paper-channel">{item.channel}</span> • <span className="paper-year">{item.year}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'stretch' }}>
                  {item.url && (
                    <a 
                      href={item.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="archive-btn"
                      style={{
                        flex: 1,
                        height: 'auto',
                        margin: 0,
                        alignSelf: 'stretch',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textDecoration: 'none',
                        textAlign: 'center',
                        backgroundColor: 'rgba(77, 171, 247, 0.1)',
                        border: '1px solid #4dabf7',
                        borderColor: '#4dabf7',
                        color: '#4dabf7',
                        fontSize: '11px',
                        padding: '6px 12px',
                        whiteSpace: 'nowrap',
                        boxSizing: 'border-box',
                        borderRadius: '4px'
                      }}
                    >
                      📖 원문 보기
                    </a>
                  )}
                  <button 
                    className="remove-btn library-remove-btn" 
                    onClick={() => handleRemovePaper(item.paperId)}
                    style={{
                      flex: 1,
                      height: 'auto',
                      margin: 0,
                      alignSelf: 'stretch',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      padding: '6px 12px',
                      fontSize: '11px',
                      whiteSpace: 'nowrap',
                      boxSizing: 'border-box',
                      border: '1px solid transparent'
                    }}
                  >
                    🗑️ 서재에서 제거
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyLibrary;
