import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Ticket from '../components/Ticket.jsx';

const TAGS = ['포스터제작', '릴스편집', '리뷰관리', '메뉴판디자인', 'SNS운영'];

const STATUS_STYLE = {
  '모집중': { bg: 'var(--primary-soft)', color: 'var(--primary)' },
  '진행중': { bg: 'var(--hot-soft)', color: 'var(--hot)' },
  '완료대기': { bg: 'var(--hot-soft)', color: 'var(--hot)' },
  '완료': { bg: 'var(--ok-soft)', color: 'var(--ok)' },
};

export default function TalentFeedPage() {
  const [requests, setRequests] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null); // null = 전체
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('requests').select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setRequests(data ?? []); setLoading(false); });
  }, []);

  const visible = selectedTag
    ? requests.filter((r) => r.tag === selectedTag)
    : requests;

  const chip = (active) => ({
    border: 'none', borderRadius: 999, padding: '8px 14px',
    fontSize: '.82rem', fontWeight: 700, cursor: 'pointer',
    background: active ? 'var(--primary-soft)' : 'var(--bg-section)',
    color: active ? 'var(--primary)' : 'var(--muted)',
    whiteSpace: 'nowrap',
  });

  return (
    <section style={{ padding: '20px 16px 40px' }}>
      <h1 className="sec-title" style={{ marginBottom: 4 }}>
        재능 <em style={{ color: 'var(--primary)', fontStyle: 'normal' }}>헬퍼</em> 🤝
      </h1>
      <p className="sec-cap" style={{ marginBottom: 16 }}>
        재능으로 한 끼를 바꿔 보세요
      </p>

      <Link to="/talent/new" style={{
        display: 'block', textAlign: 'center', textDecoration: 'none',
        minHeight: 48, lineHeight: '48px', borderRadius: 14, marginBottom: 16,
        background: 'var(--primary-soft)', color: 'var(--primary)',
        fontWeight: 700, fontSize: '.95rem',
      }}>
        ＋ 재능 요청 올리기
      </Link>

      {/* 태그 필터 칩 */}
      <div style={{
        display: 'flex', gap: 8, overflowX: 'auto',
        paddingBottom: 8, marginBottom: 16
      }}>
        <button style={chip(!selectedTag)} onClick={() => setSelectedTag(null)}>
          전체
        </button>
        {TAGS.map((t) => (
          <button key={t} style={chip(selectedTag === t)}
            onClick={() => setSelectedTag(selectedTag === t ? null : t)}>
            #{t}
          </button>
        ))}
      </div>

      {/* 목록 */}
      {loading && <p style={{ color: 'var(--muted)' }}>불러오는 중…</p>}
      {!loading && visible.length === 0 && (
        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '40px 0' }}>
          아직 이 태그의 요청이 없어요
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {visible.map((r) => (
          <Link key={r.id} to={`/talent/${r.id}`}
            style={{ textDecoration: 'none', color: 'inherit' }}>
            <article style={{
              background: 'var(--bg-card)', borderRadius: 'var(--r-card)',
              padding: 24, boxShadow: 'var(--shadow-card)',
            }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <span style={{
                  borderRadius: 999, padding: '4px 12px', fontSize: '.74rem',
                  fontWeight: 700, background: 'var(--primary-soft)',
                  color: 'var(--primary)',
                }}>#{r.tag}</span>
                <span style={{
                  borderRadius: 999, padding: '4px 12px', fontSize: '.74rem',
                  fontWeight: 700,
                  background: STATUS_STYLE[r.status]?.bg,
                  color: STATUS_STYLE[r.status]?.color,
                }}>{r.status}</span>
              </div>

              <h2 style={{
                fontSize: '1.05rem', fontWeight: 800, color: 'var(--ink)',
                letterSpacing: '-0.02em', lineHeight: 1.35, margin: '0 0 6px',
              }}>{r.title}</h2>

              <p style={{
                fontSize: '.9rem', color: 'var(--body)', lineHeight: 1.7,
                margin: '0 0 16px',
                display: '-webkit-box', WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>{r.content}</p>

              <Ticket count={r.reward_count} label="식사권 · 완료 확인 후 지급돼요" />
            </article>
          </Link>
        ))}
      </div>
    </section>
  );
}