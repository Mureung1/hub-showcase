import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { setPin, getPinStatus } from '../lib/api';

export default function PinSettingPage() {
    const { profile, loading } = useAuth();

    const [pin, setPinValue] = useState('');
    const [pinConfirm, setPinConfirm] = useState('');
    const [hasPin, setHasPin] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null); // { type:'ok'|'error', text }

    // 이미 설정했는지 조회 → 안내 문구가 달라진다
    useEffect(() => {
        if (!profile?.id) return;
        getPinStatus(profile.id)
            .then((s) => setHasPin(s.hasPin))
            .catch(() => { });
    }, [profile?.id]);

    if (loading) return <div style={{ padding: 24 }}>불러오는 중…</div>;

    if (profile?.role !== 'owner') {
        return (
            <div style={{ padding: 24, color: 'var(--body)' }}>
                PIN은 사장님만 설정할 수 있어요.
            </div>
        );
    }

    const onlyDigits = (v) => v.replace(/\D/g, '').slice(0, 6);

    async function handleSave() {
        setMessage(null);

        if (pin.length !== 6) {
            return setMessage({ type: 'error', text: 'PIN은 숫자 6자리로 입력해 주세요.' });
        }
        if (pin !== pinConfirm) {
            return setMessage({ type: 'error', text: '두 번 입력한 PIN이 서로 달라요.' });
        }

        setSaving(true);
        try {
            await setPin(profile.id, pin);
            setHasPin(true);
            setPinValue('');
            setPinConfirm('');
            setMessage({ type: 'ok', text: 'PIN이 저장됐어요.' });
        } catch (e) {
            setMessage({ type: 'error', text: e.message });
        } finally {
            setSaving(false);
        }
    }

    return (
        <div style={{ background: 'var(--bg-page)', minHeight: '100vh', padding: '28px 20px 60px' }}>
            <h1 style={{
                fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em',
                lineHeight: 1.35, color: 'var(--ink)', margin: '0 0 24px',
            }}>
                식사권 확인 <span style={{ color: 'var(--primary)' }}>PIN</span> 설정
            </h1>

            <div style={{
                background: 'var(--bg-card)', borderRadius: 'var(--r-card)',
                padding: 24, boxShadow: 'var(--shadow-card)',
            }}>
                {/* 왜 필요한지 이유와 함께 안내 */}
                <div style={{
                    background: 'var(--bg-section)', borderRadius: 'var(--r-inner)',
                    padding: '16px 18px', marginBottom: 24,
                    fontSize: '.88rem', lineHeight: 1.7, color: 'var(--body)',
                }}>
                    💡 학생이 식사권을 쓸 때 <b style={{ color: 'var(--ink)' }}>사장님이 직접 6자리를 눌러야</b> 차감돼요.
                    다른 사람이 마음대로 쓰는 걸 막아줘요.
                </div>

                <div style={{
                    fontSize: '.84rem', fontWeight: 700, color: 'var(--muted)', marginBottom: 12,
                }}>
                    현재 상태 · {hasPin
                        ? <span style={{ color: 'var(--ok)' }}>설정 완료</span>
                        : <span style={{ color: 'var(--hot)' }}>아직 없음</span>}
                </div>

                <label style={labelStyle}>
                    PIN 6자리 <span style={{ color: 'var(--hot)' }}>필수</span>
                </label>
                <input
                    type="password" inputMode="numeric" value={pin}
                    onChange={(e) => setPinValue(onlyDigits(e.target.value))}
                    placeholder="••••••" style={inputStyle}
                />

                <label style={{ ...labelStyle, marginTop: 20 }}>다시 한 번 입력</label>
                <input
                    type="password" inputMode="numeric" value={pinConfirm}
                    onChange={(e) => setPinConfirm(onlyDigits(e.target.value))}
                    placeholder="••••••" style={inputStyle}
                />

                {message && (
                    <div style={{
                        marginTop: 18, fontSize: '.86rem', fontWeight: 600,
                        color: message.type === 'ok' ? 'var(--ok)' : 'var(--hot)',
                    }}>
                        {message.text}
                    </div>
                )}

                <button
                    onClick={handleSave} disabled={saving}
                    style={{
                        width: '100%', minHeight: 48, marginTop: 24,
                        background: 'var(--primary-soft)', color: 'var(--primary)',
                        border: 'none', borderRadius: 'var(--r-inner)',
                        fontSize: '1rem', fontWeight: 700,
                        cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1,
                    }}
                >
                    {saving ? '저장 중…' : hasPin ? 'PIN 바꾸기' : 'PIN 저장하기'}
                </button>
            </div>

            <p style={{
                marginTop: 28, textAlign: 'center',
                fontSize: '.82rem', color: 'var(--muted)', lineHeight: 1.7,
            }}>
                🔒 PIN은 안전하게 암호화되어 저장돼요
            </p>
        </div>
    );
}

const labelStyle = {
    display: 'block', fontSize: '.88rem', fontWeight: 700,
    color: 'var(--ink)', marginBottom: 10,
};

const inputStyle = {
    width: '100%', minHeight: 48, boxSizing: 'border-box',
    background: 'var(--bg-section)', border: 'none',
    borderRadius: 'var(--r-inner)', padding: '0 16px',
    fontSize: '1.2rem', letterSpacing: '0.3em', color: 'var(--ink)',
    fontFamily: 'inherit',
};