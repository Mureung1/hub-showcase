import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { STATUS } from '../lib/status';
import { useAuth } from '../hooks/useAuth';
import { getPinStatus } from '../lib/api';
import './MyPage.css';

// 표시 순서 — 지금 신경 써야 할 것(모집중·진행중)이 위로
const GROUPS = [STATUS.RECRUITING, STATUS.IN_PROGRESS, STATUS.PENDING_DONE, STATUS.DONE];

// 완료는 쌓이면 길어지므로 처음엔 3개만
const DONE_PREVIEW = 3;

export default function MyPage() {
    const { profile, loading } = useAuth();
    const navigate = useNavigate();

    const [requests, setRequests] = useState([]);
    const [ticketLeft, setTicketLeft] = useState(0);
    const [busy, setBusy] = useState(true);
    const [showAllDone, setShowAllDone] = useState(false);
    const [hasPin, setHasPin] = useState(null); // null = 확인 전

    const isOwner = profile?.role === 'owner';

    // 역할에 따라 조회 조건이 달라진다 — 사장님은 owner_id, 헬퍼는 helper_id
    useEffect(() => {
        if (!profile?.id) return;

        async function load() {
            setBusy(true);

            const { data } = await supabase
                .from('requests')
                .select('*, owner:users!requests_owner_id_fkey(nickname, store_name)')
                .eq(isOwner ? 'owner_id' : 'helper_id', profile.id)
                .order('created_at', { ascending: false });
            setRequests(data ?? []);

            // 헬퍼는 남은 식사권도 함께 (잔여 = 발급 − 사용기록 수)
            if (!isOwner) {
                const { data: t } = await supabase
                    .from('tickets')
                    .select('id, total_count')
                    .eq('student_id', profile.id);

                const list = t ?? [];
                const ids = list.map((x) => x.id);

                let usedCount = 0;
                if (ids.length > 0) {
                    const { count } = await supabase
                        .from('ticket_redemptions')
                        .select('*', { count: 'exact', head: true })
                        .in('ticket_id', ids);
                    usedCount = count ?? 0;
                }

                const issued = list.reduce((sum, x) => sum + (x.total_count ?? 0), 0);
                setTicketLeft(issued - usedCount);
            }

            setBusy(false);
        }
        load();
    }, [profile?.id, isOwner]);

    // PIN 설정 여부 — 사장님만 확인 (해시값은 server가 내보내지 않음)
    useEffect(() => {
        if (!profile?.id || !isOwner) return;
        getPinStatus(profile.id)
            .then((s) => setHasPin(s.hasPin))
            .catch(() => { });
    }, [profile?.id, isOwner]);

    if (loading) return <section className="mypage"><p className="mypage-empty">불러오는 중이에요…</p></section>;

    return (
        <section className="mypage">
            <h1 className="sec-title">마이페이지 🙋</h1>

            <div className="mypage-profile">
                <div className="mypage-avatar">{isOwner ? '🍚' : '🎓'}</div>
                <div>
                    <b>{profile?.nickname}</b>
                    <small>
                        {isOwner ? (profile?.store_name || '사장님') : '헬퍼'} · {profile?.region}
                    </small>
                </div>
            </div>

            {/* 사장님 — PIN 설정 진입점 */}
            {isOwner && (
                <button
                    className={`mypage-pin ${hasPin === false ? 'need' : ''}`}
                    onClick={() => navigate('/settings/pin')}
                >
                    <span className="mypage-pin-icon">🔒</span>
                    <span className="mypage-pin-text">
                        <b>식사권 확인 PIN</b>
                        <small>
                            {hasPin === null && '확인 중이에요…'}
                            {hasPin === true && '설정 완료 · 눌러서 바꾸기'}
                            {hasPin === false && '아직 없어요. 설정해야 식사권을 확인할 수 있어요'}
                        </small>
                    </span>
                    <span className="mypage-pin-arrow">›</span>
                </button>
            )}

            {/* 헬퍼 — 남은 식사권 요약 */}
            {!isOwner && (
                <button className="mypage-pin" onClick={() => navigate('/wallet')}>
                    <span className="mypage-pin-icon">🎟️</span>
                    <span className="mypage-pin-text">
                        <b>남은 식사권 {ticketLeft}장</b>
                        <small>
                            {ticketLeft === 0
                                ? '아직 없어요. 재능을 나누면 식사권이 쌓여요'
                                : '지갑에서 확인하고 사용하기'}
                        </small>
                    </span>
                    <span className="mypage-pin-arrow">›</span>
                </button>
            )}

            <h2 className="mypage-sec">{isOwner ? '내가 올린 요청' : '내가 지원한 요청'}</h2>

            {busy ? (
                <p className="mypage-empty">불러오는 중이에요…</p>
            ) : requests.length === 0 ? (
                <p className="mypage-empty">
                    {isOwner
                        ? <>아직 올린 요청이 없어요.<br />재능 헬퍼 탭에서 첫 요청을 올려보세요.</>
                        : <>아직 지원한 요청이 없어요.<br />재능 헬퍼 탭에서 요청을 찾아보세요.</>}
                </p>
            ) : (
                GROUPS.map((status) => {
                    const list = requests.filter((r) => r.status === status);
                    if (list.length === 0) return null;

                    const isDone = status === STATUS.DONE;
                    const visible = isDone && !showAllDone ? list.slice(0, DONE_PREVIEW) : list;

                    return (
                        <div key={status} className="mypage-group">
                            <div className="mypage-group-head">
                                {status}
                                <span className="mypage-count">{list.length}</span>
                            </div>

                            {visible.map((r) => (
                                <button
                                    key={r.id}
                                    className="mypage-item"
                                    onClick={() => navigate(`/talent/${r.id}`)}
                                >
                                    <span className="mypage-tag">{r.tag}</span>
                                    <b className="mypage-title">{r.title}</b>
                                    <span className="mypage-meta-row">
                                        {!isOwner && (
                                            <span className="mypage-store">
                                                🍚 {r.owner?.store_name || r.owner?.nickname}
                                            </span>
                                        )}
                                        <span className="mypage-reward">🎟️ 식사권 {r.reward_count}장</span>
                                    </span>
                                </button>
                            ))}

                            {isDone && list.length > DONE_PREVIEW && (
                                <button
                                    className="mypage-more"
                                    onClick={() => setShowAllDone(!showAllDone)}
                                >
                                    {showAllDone ? '접기' : `완료 ${list.length - DONE_PREVIEW}개 더 보기`}
                                </button>
                            )}
                        </div>
                    );
                })
            )}

            <button className="mypage-logout" onClick={() => supabase.auth.signOut()}>
                로그아웃
            </button>
        </section>
    );
}