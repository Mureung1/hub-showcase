import Field from "./Field";
import { MAJORS, REGIONS, ENROLLMENTS } from "../data/activities";

const GRADES = [1, 2, 3, 4];
const INCOMES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// 조건 입력 패널. 여기서 고른 값은 "이 조건으로 찾기"를 눌러야 결과에 반영된다(App에서 처리).
export default function ConditionPanel({ profile, setField, showScholarship, setShowScholarship, query, setQuery, runSearch }) {
  return (
    <section className="panel">
      <div className="fields">
        <Field label="학년" value={profile.grade} onChange={(v) => setField("grade", v)} options={GRADES} parse={Number} format={(v) => v + "학년"} />
        <Field label="전공" value={profile.major} onChange={(v) => setField("major", v)} options={MAJORS} />
        <Field label="지역" value={profile.region} onChange={(v) => setField("region", v)} options={REGIONS} />
        <label className="field">
          <span className="field-label">나이</span>
          <input type="number" min="15" max="99" value={profile.age ?? ""} placeholder="선택 안 함"
            onChange={(e) => setField("age", e.target.value === "" ? null : Number(e.target.value))} />
        </label>
        <Field label="재학 상태" value={profile.enrollment} onChange={(v) => setField("enrollment", v)} options={ENROLLMENTS} />
      </div>

      <label className="toggle">
        <input type="checkbox" checked={showScholarship} onChange={(e) => setShowScholarship(e.target.checked)} />
        장학·지원금도 볼래요 (소득분위·학점 입력)
      </label>

      {showScholarship && (
        <div className="fields scholarship">
          <Field label="소득분위" value={profile.income} onChange={(v) => setField("income", v)} options={INCOMES} parse={Number} format={(v) => v + "분위"} />
          <label className="field">
            <span className="field-label">학점</span>
            <div className="gpa">
              <input type="range" min="2" max="4.5" step="0.1" value={profile.gpa ?? 3.5} disabled={profile.gpa == null}
                onChange={(e) => setField("gpa", Number(e.target.value))} />
              <span className="gpa-val">{profile.gpa == null ? "잘 모름" : profile.gpa.toFixed(1)}</span>
              <button type="button" className="gpa-toggle" onClick={() => setField("gpa", profile.gpa == null ? 3.5 : null)}>
                {profile.gpa == null ? "입력하기" : "잘 모름"}
              </button>
            </div>
          </label>
        </div>
      )}

      <div className="panel-actions">
        <input type="search" className="search-input" placeholder="제목으로 검색"
          value={query} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch()} />
        <button className="search-btn" onClick={runSearch}>이 조건으로 찾기</button>
      </div>
    </section>
  );
}
