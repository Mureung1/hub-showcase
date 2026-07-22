import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth.jsx';

const TAGS = ['포스터제작', '릴스편집', '리뷰관리', '메뉴판디자인', 'SNS운영'];

export default function RequestFormPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [tag, setTag] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [reward, setReward] = useState(3);
  const [dueDate, setDueDate] = useState('');
  const [imageFile, setImageFile] = useState(null);      // 사용자가 고른 파일
  const [imagePreview, setImagePreview] = useState('');   // 미리보기용 임시 주소
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // 사장님만 요청을 올릴 수 있음
  if (profile && profile.role !== 'owner') {
    return (
      <section style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ color: 'var(--body)', lineHeight: 1.7 }}>
          재능 요청은 <strong style={{ color: 'var(--primary)' }}>사장님</strong>만
          올릴 수 있어요 🙏
        </p>
      </section>
    );
  }

  // 파일을 고르면 미리보기를 만든다 (아직 업로드 아님 — 등록 버튼 누를 때 올림)
  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file)); // 브라우저 안에서만 보이는 임시 주소
  }

  async function handleSubmit() {
    if (!tag) return setError('작업 태그를 선택해 주세요');
    if (!title.trim()) return setError('제목을 입력해 주세요');
    if (!content.trim() && !imageFile)
      return setError('글이나 이미지 중 하나로 어떤 결과물을 원하는지 알려주세요');

    setSaving(true);
    setError('');

    // 1. 이미지가 있으면 results 창고에 먼저 업로드하고 공개 주소를 받는다
    let imageUrl = 'https://placehold.co/600x400'; // 이미지를 안 올렸으면 기본 자리표시
    if (imageFile) {
      // 파일 이름이 겹치지 않게 시간+원본이름으로 경로를 만든다
      const path = `examples/${Date.now()}_${imageFile.name}`;
      const { error: upErr } = await supabase.storage
        .from('results')          // 아까 만든 버킷 이름
        .upload(path, imageFile);

      if (upErr) {
        setSaving(false);
        return setError('이미지 업로드 실패: ' + upErr.message);
      }

      // 업로드한 파일의 공개 URL 얻기 (버킷이 public이라 이 주소로 바로 볼 수 있음)
      const { data: pub } = supabase.storage.from('results').getPublicUrl(path);
      imageUrl = pub.publicUrl;
    }

    // 2. 요청글 저장 — 이미지 주소(글자)를 DB에 넣는다
    const { error: e } = await supabase.from('requests').insert({
      owner_id: profile.id,
      tag, title, content,
      example_image_url: imageUrl,
      reward_count: reward,
      due_date: dueDate || null,
      region: '부산대 앞',
    });
    setSaving(false);
    if (e) return setError('등록 실패: ' + e.message);

    navigate('/talent');
  }

  const label = { display: 'block', fontSize: '.84rem', fontWeight: 700,
                  color: 'var(--ink)', marginBottom: 8 };
  const required = { color: 'var(--hot)', fontSize: '.74rem', marginLeft: 4 };
  const optional = { color: 'var(--muted)', fontSize: '.74rem', marginLeft: 4 };
  const input = { width: '100%', minHeight: 48, borderRadius: 14, border: 'none',
                  background: 'var(--bg-section)', padding: '0 16px',
                  fontSize: '.95rem', color: 'var(--ink)', boxSizing: 'border-box' };
  const chip = (active) => ({
    border: 'none', borderRadius: 999, padding: '10px 14px',
    fontSize: '.82rem', fontWeight: 700, cursor: 'pointer',
    background: active ? 'var(--primary-soft)' : 'var(--bg-section)',
    color: active ? 'var(--primary)' : 'var(--muted)',
  });

  return (
    <section style={{ padding: '20px 16px 40px', maxWidth: 480, margin: '0 auto' }}>
      <h1 className="sec-title" style={{ marginBottom: 4 }}>
        재능 <em style={{ color: 'var(--primary)', fontStyle: 'normal' }}>요청</em> 올리기 ✍️
      </h1>
      <p className="sec-cap" style={{ marginBottom: 24 }}>
        조건을 미리 적어두면 다툼이 확 줄어요
      </p>

      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--r-card)',
                    padding: 24, boxShadow: 'var(--shadow-card)',
                    display: 'flex', flexDirection: 'column', gap: 20 }}>

        <div>
          <span style={label}>작업 태그<em style={required}>필수</em></span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {TAGS.map((t) => (
              <button key={t} style={chip(tag === t)} onClick={() => setTag(t)}>
                #{t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span style={label}>제목<em style={required}>필수</em></span>
          <input style={input} placeholder="예: 손글씨 메뉴판을 바꾸고 싶어요"
            value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div>
          <span style={label}>요청 내용<em style={optional}>글 또는 이미지</em></span>
          <textarea style={{ ...input, minHeight: 100, padding: 16, lineHeight: 1.7,
                             resize: 'vertical', fontFamily: 'inherit' }}
            placeholder="어떤 결과물을 원하는지, 참고하고 싶은 스타일이 있는지 적어주세요"
            value={content} onChange={(e) => setContent(e.target.value)} />
        </div>

        <div>
          <span style={label}>기대 결과물 예시<em style={optional}>글 또는 이미지</em></span>
          <p style={{ fontSize: '.74rem', color: 'var(--muted)', margin: '0 0 8px' }}>
            글 설명과 참고 이미지 중 최소 하나는 넣어주세요. 둘 다 넣어도 좋아요
          </p>
          {imagePreview && (
            <img src={imagePreview} alt="미리보기"
              style={{ width: '100%', borderRadius: 14, marginBottom: 8, display: 'block' }} />
          )}
          <label style={{ ...chip(false), display: 'inline-block', textAlign: 'center' }}>
            {imageFile ? '📷 다시 고르기' : '📷 이미지 선택'}
            <input type="file" accept="image/*" onChange={handleFileChange}
              style={{ display: 'none' }} />
          </label>
        </div>

        <div>
          <span style={label}>보상 식사권<em style={required}>필수</em></span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button style={chip(false)} onClick={() => setReward(Math.max(1, reward - 1))}>−</button>
            <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--ticket-ink)' }}>
              🎟️ {reward}장
            </span>
            <button style={chip(false)} onClick={() => setReward(Math.min(20, reward + 1))}>＋</button>
          </div>
          <p style={{ fontSize: '.74rem', color: 'var(--muted)', marginTop: 6 }}>
            💡 포스터·메뉴판은 보통 3~5장이 시세예요
          </p>
        </div>

        <div>
          <span style={label}>완료 희망일<em style={optional}>선택</em></span>
          <input style={input} type="date"
            value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>

        <div style={{ background: 'var(--bg-section)', borderRadius: 14,
                      padding: '12px 16px', fontSize: '.82rem',
                      color: 'var(--body)', lineHeight: 1.7 }}>
          ✅ 수정 요청 1회가 기본으로 포함돼요. 무리한 추가 수정 요구는 안 돼요.
        </div>

        {error && <p style={{ color: 'var(--hot)', fontSize: '.84rem', margin: 0 }}>{error}</p>}

        <button onClick={handleSubmit} disabled={saving} style={{
          minHeight: 48, borderRadius: 14, border: 'none',
          background: 'var(--primary-soft)', color: 'var(--primary)',
          fontWeight: 700, fontSize: '1rem', cursor: 'pointer',
        }}>
          {saving ? '올리는 중…' : '요청 올리기'}
        </button>
      </div>
    </section>
  );
}