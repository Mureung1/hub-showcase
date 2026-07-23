import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore.js';
import { fetchRecommendation } from '../api/recommend.js';
import { haversineDistanceKm } from '../utils/geo.js';
import { MODES } from '../utils/routeCalc.js';
import { BREAD_CATEGORIES } from '../data/breadCategories.js';
import Mascot from '../components/Mascot.jsx';
import { SparkleIcon, SearchIcon, CloseIcon } from '../components/icons.jsx';

const COUNTS = [2, 3, 4];
// "바로 추천받기"는 질문에 답하지 않고 눌러도 되는 지름길 버튼 — 항상 이 순서 그대로 추천한다.
const QUICK_PICK_NAMES = ['성심당', '하레하레', '콜마르브레드'];

function BakeryPicker({ bakeries, value, onChange }) {
  const [query, setQuery] = useState('');
  const selected = bakeries.find((b) => b.id === value);

  const matches = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return bakeries.filter((b) => b.name.includes(q)).slice(0, 6);
  }, [bakeries, query]);

  if (selected) {
    return (
      <div className="bakery-picker-selected">
        <span>{selected.name}</span>
        <button type="button" className="close-btn" aria-label="선택 해제" onClick={() => onChange(null)}>
          <CloseIcon style={{ width: 12, height: 12 }} />
        </button>
      </div>
    );
  }

  return (
    <div className="bakery-picker">
      <span className="search">
        <SearchIcon />
        <input
          type="text"
          placeholder="빵집 이름으로 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
      </span>
      {matches.length > 0 && (
        <div className="bakery-picker-list">
          {matches.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                onChange(b.id);
                setQuery('');
              }}
            >
              {b.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RecommendScreen() {
  const navigate = useNavigate();
  const bakeries = useAppStore((s) => s.bakeries);
  const userLocation = useAppStore((s) => s.userLocation);
  const applyRecommendation = useAppStore((s) => s.applyRecommendation);
  const showToast = useAppStore((s) => s.showToast);

  const [count, setCount] = useState(3);
  const [mode, setMode] = useState('walk');
  const [mustIncludeId, setMustIncludeId] = useState(null);
  const [styles, setStyles] = useState([]);
  const [wantsCoffee, setWantsCoffee] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleStyle = (c) => {
    setStyles((prev) => (prev.includes(c) ? prev.filter((s) => s !== c) : [...prev, c]));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { bakeries: picked, routes } = await fetchRecommendation({
        origin: userLocation,
        count,
        mustIncludeId,
        styles,
        wantsCoffee,
      });
      applyRecommendation({ bakeries: picked, routes, mode });
      navigate('/route');
    } catch {
      showToast('추천을 받아오지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  // 질문에 답할 필요 없이 바로 받는 고정 추천 — 서버 계산 없이 이 순서 그대로 보여준다.
  const handleQuickRecommend = () => {
    const picked = QUICK_PICK_NAMES.map((name) => bakeries.find((b) => b.name === name)).filter(Boolean);
    if (picked.length < 2) {
      showToast('추천할 빵집 데이터를 아직 불러오지 못했어요.');
      return;
    }
    let distanceKm = haversineDistanceKm(userLocation, picked[0]);
    for (let i = 0; i < picked.length - 1; i++) distanceKm += haversineDistanceKm(picked[i], picked[i + 1]);
    applyRecommendation({
      bakeries: picked,
      routes: [{ order: picked.map((b) => b.id), distanceKm }],
      mode,
    });
    navigate('/route');
  };

  return (
    <section className="screen-recommend">
      <div className="recommend-topbar">
        <Link to="/" className="recommend-close" aria-label="닫기">
          <CloseIcon />
        </Link>
      </div>

      <div className="recommend-body">
        <Mascot variant="pointing" className="mascot-icon recommend-mascot" />
        <h1>자동 추천받기</h1>
        <p className="recommend-lead">답하고 싶은 것만 골라도 괜찮아요. 아무것도 안 골라도 바로 추천해드려요.</p>

        <div className="recommend-list">
          <div className="recommend-question">
            <h2>몇 곳 가고 싶어요?</h2>
            <div className="mode-tabs">
              {COUNTS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`mode-tab${count === n ? ' active' : ''}`}
                  onClick={() => setCount(n)}
                >
                  {n}곳
                </button>
              ))}
            </div>
          </div>

          <div className="recommend-question">
            <h2>이동수단은 뭐예요?</h2>
            <div className="mode-tabs">
              {MODES.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`mode-tab${mode === value ? ' active' : ''}`}
                  onClick={() => setMode(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="recommend-question">
            <h2>
              꼭 넣고 싶은 곳이 있어요? <span className="optional-badge">선택</span>
            </h2>
            <BakeryPicker bakeries={bakeries} value={mustIncludeId} onChange={setMustIncludeId} />
          </div>

          <div className="recommend-question">
            <h2>
              좋아하는 빵이 있어요? <span className="optional-badge">선택, 여러 개 가능</span>
            </h2>
            <div className="mode-tabs wrap">
              {BREAD_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`mode-tab${styles.includes(c) ? ' active' : ''}`}
                  onClick={() => toggleStyle(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="recommend-question">
            <h2>커피와 같이 먹고 싶어요?</h2>
            <div className="mode-tabs">
              <button
                type="button"
                className={`mode-tab${wantsCoffee ? ' active' : ''}`}
                onClick={() => setWantsCoffee(true)}
              >
                네
              </button>
              <button
                type="button"
                className={`mode-tab${!wantsCoffee ? ' active' : ''}`}
                onClick={() => setWantsCoffee(false)}
              >
                아니오
              </button>
            </div>
          </div>
        </div>

        <div className="recommend-actions">
          <button type="button" className="btn-solid" disabled={loading} onClick={handleSubmit}>
            <SparkleIcon />
            {loading ? '추천 받는 중…' : '추천받기'}
          </button>
          <button type="button" className="recommend-quick-link" onClick={handleQuickRecommend}>
            질문 상관없이 바로 추천받기
          </button>
        </div>
      </div>
    </section>
  );
}
