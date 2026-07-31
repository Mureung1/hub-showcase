import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { generateAdCopy } from "../lib/api";
import { STATUS } from "../lib/status";
import "./HotDealForm.css";

const TAGS = ["마감할인", "노쇼발생", "우천특가", "당일한정"];

/**
 * ② 핫딜 올리기 — 사장님이 상황을 한 줄 적으면 AI가 초안을 만들어 준다.
 *  규칙(CLAUDE.md·디자인 스킬): AI는 초안까지만.
 *   - "AI가 만든 초안" 표시 필수 / 사장님 확인 후에만 게시 (자동 게시 금지)
 *
 *  ★ 선순환 구조: 내 가게에서 완료된 재능 요청의 결과물 이미지를
 *    핫딜 글의 썸네일로 재사용한다 (기획서 3-2절 — 서비스 차별점)
 *  ※ AI는 오늘 목업. 실제 LLM 연동은 server/services/llm.js만 교체하면 됨.
 */
export default function HotDealFormPage() {
    const { profile } = useAuth();
    const navigate = useNavigate();

    const [situation, setSituation] = useState("");
    const [draft, setDraft] = useState(null);
    const [tag, setTag] = useState(null);
    const [results, setResults] = useState([]);       // 재사용 가능한 완료 결과물들
    const [thumbnail, setThumbnail] = useState(null); // 고른 썸네일 주소
    const [making, setMaking] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // 내 가게에서 완료된 요청 중, 결과물 이미지가 있는 것만 가져온다 (선순환 재료)
    useEffect(() => {
        async function loadResults() {
            if (!profile || profile.role !== "owner") return;
            const { data } = await supabase
                .from("requests")
                .select("id, title, result_image_url")
                .eq("owner_id", profile.id)          // 내 요청만
                .eq("status", STATUS.DONE)           // 완료된 것만
                .not("result_image_url", "is", null) // 결과물이 있는 것만
                .order("created_at", { ascending: false });
            setResults(data ?? []);
        }
        loadResults();
    }, [profile]);

    if (profile && profile.role !== "owner") {
        return (
            <section className="hd-form">
                <p className="hd-guard">핫딜은 <strong>사장님</strong>만 올릴 수 있어요 🙏</p>
            </section>
        );
    }

    async function handleMakeDraft() {
        if (situation.trim().length < 2) return setError("상황을 한 줄 적어주세요");
        setMaking(true);
        setError("");
        try {
            const res = await generateAdCopy(situation);
            setDraft(`${res.title}\n\n${res.body}`);
            const suggested = (res.tags ?? [])
                .map((t) => t.replace("#", ""))
                .find((t) => TAGS.includes(t));
            setTag(suggested ?? null);
            // 결과물이 있으면 가장 최근 것을 기본 썸네일로 자동 첨부 (사장님이 바꿀 수 있음)
            if (results.length > 0 && !thumbnail) setThumbnail(results[0].result_image_url);
        } catch (e) {
            setError(e.message || "초안 만들기에 실패했어요.");
        } finally {
            setMaking(false);
        }
    }

    async function handlePublish() {
        if (!tag) return setError("태그를 선택해 주세요");
        if (!draft.trim()) return setError("홍보 문구를 입력해 주세요");

        setSaving(true);
        setError("");
        const { error: e } = await supabase.from("hot_deals").insert({
            owner_id: profile.id,
            tag,
            content: draft,
            thumbnail_url: thumbnail,  // 선순환 — 헬퍼 결과물이 홍보 자산이 된다
            region: "부산대 앞",
        });
        setSaving(false);
        if (e) return setError("게시 실패: " + e.message);
        navigate("/");
    }

    return (
        <section className="hd-form">
            <h1 className="sec-title">핫딜 올리기 🔥</h1>
            <p className="hd-cap">상황을 한 줄만 적어주세요. 나머지는 도와드릴게요</p>

            <div className="hd-card">
                <div>
                    <span className="hd-label">지금 상황<em className="hd-required">필수</em></span>
                    <textarea
                        className="hd-input"
                        placeholder="예: 비 와서 손님 없는데 김치찌개 남았어요"
                        value={situation}
                        onChange={(e) => setSituation(e.target.value)}
                    />
                </div>

                <button className="hd-btn" onClick={handleMakeDraft} disabled={making}>
                    {making ? "만드는 중이에요…" : "✨ 홍보 문구 만들기"}
                </button>

                {draft !== null && (
                    <>
                        <div className="hd-draft">
                            <span className="hd-ai-badge">✨ AI가 만든 초안</span>
                            <textarea
                                className="hd-input hd-input--draft"
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                            />
                            <p className="hd-hint">마음에 안 들면 직접 고쳐도 돼요</p>
                        </div>

                        <div>
                            <span className="hd-label">태그<em className="hd-required">필수</em></span>
                            <div className="hd-tags">
                                {TAGS.map((t) => (
                                    <button
                                        key={t}
                                        className={`chip ${tag === t ? "chip--on" : ""}`}
                                        onClick={() => setTag(t)}
                                    >
                                        #{t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ★ 선순환 — 헬퍼가 만든 결과물을 썸네일로 */}
                        <div>
                            <span className="hd-label">썸네일<em className="hd-optional">선택</em></span>
                            {results.length === 0 ? (
                                <p className="hd-hint">
                                    아직 완료된 재능 요청이 없어요. 요청이 완료되면 헬퍼님이 만든 결과물을
                                    홍보 사진으로 바로 쓸 수 있어요.
                                </p>
                            ) : (
                                <>
                                    <p className="hd-hint" style={{ marginBottom: 10 }}>
                                        🤝 헬퍼님이 만들어준 결과물이에요. 홍보 사진으로 써보세요
                                    </p>
                                    <div className="hd-thumbs">
                                        {results.map((r) => (
                                            <button
                                                key={r.id}
                                                className={`hd-thumb ${thumbnail === r.result_image_url ? "hd-thumb--on" : ""}`}
                                                onClick={() =>
                                                    setThumbnail(
                                                        thumbnail === r.result_image_url ? null : r.result_image_url
                                                    )
                                                }
                                                title={r.title}
                                            >
                                                <img src={r.result_image_url} alt={r.title} />
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </>
                )}

                {error && <p className="hd-error">{error}</p>}

                {draft !== null && (
                    <button className="hd-btn hd-btn--publish" onClick={handlePublish} disabled={saving}>
                        {saving ? "올리는 중…" : "이대로 올리기"}
                    </button>
                )}
            </div>
        </section>
    );
}