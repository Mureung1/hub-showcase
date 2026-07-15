import type {
  PatientCategoryDefinition,
  PatientCounts,
  PatientInputMode,
  PatientRegistrationInput,
} from "@baro-jinryo/shared";
import {
  calculatePatientCount,
  createEmptyPatientCounts,
  patientCountsSchema,
} from "@baro-jinryo/shared";
import { ArrowLeft, Clock3, Info, MapPin, Stethoscope } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";
import { PatientCountStepper } from "../components/PatientCountStepper";

interface PatientRegistrationPageProps {
  inputMode: PatientInputMode;
  categories: PatientCategoryDefinition[];
  onRegister: (input: PatientRegistrationInput) => void;
}

export function PatientRegistrationPage({
  inputMode,
  categories,
  onRegister,
}: PatientRegistrationPageProps) {
  const [counts, setCounts] = useState<PatientCounts>(() => createEmptyPatientCounts(categories));
  const [totalOnlyCount, setTotalOnlyCount] = useState(1);
  const total = inputMode === "categorized" ? calculatePatientCount(counts) : totalOnlyCount;
  const countsValidation = patientCountsSchema.safeParse(counts);
  const isValid = inputMode === "total_only" || countsValidation.success;

  function changeCount(categoryId: string, nextCount: number) {
    setCounts((current) => ({ ...current, [categoryId]: Math.max(0, nextCount) }));
  }

  return (
    <div className="app-shell">
      <AppHeader />
      <main className="registration-page content-width">
        <Link className="back-link" to="/">
          <ArrowLeft size={18} aria-hidden="true" /> 병원 목록
        </Link>
        <div className="registration-layout">
          <section className="clinic-overview" aria-labelledby="clinic-name">
            <div className="clinic-visual" aria-hidden="true">
              <Stethoscope size={54} strokeWidth={1.5} />
            </div>
            <div className="clinic-overview__content">
              <div className="clinic-title-row">
                <div>
                  <h1 id="clinic-name">서울이비인후과</h1>
                  <p>이비인후과</p>
                </div>
                <span className="status-badge">원격 접수 중</span>
              </div>
              <ul className="clinic-meta">
                <li>
                  <Clock3 size={18} /> 오늘 09:00–18:00
                </li>
                <li>
                  <MapPin size={18} /> 서울 마포구 월드컵로 12, 2층
                </li>
              </ul>
              <div className="clinic-waiting-band">
                <div>
                  <span>앞 대기 환자</span>
                  <strong>5명</strong>
                </div>
                <div>
                  <span>예상 대기</span>
                  <strong>약 50분</strong>
                </div>
              </div>
              <p className="advisory-copy">
                <Info size={16} /> 진료 상황에 따라 순서와 예상 시간이 달라질 수 있습니다.
              </p>
            </div>
          </section>

          <section className="registration-panel" aria-labelledby="registration-title">
            <h2 id="registration-title">원격 웨이팅 등록</h2>
            <p>함께 진료받을 가족 인원을 선택해 주세요.</p>
            {inputMode === "categorized" ? (
              <fieldset className="count-fieldset">
                <legend>환자 인원</legend>
                {categories
                  .slice()
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((category) => (
                    <PatientCountStepper
                      key={category.id}
                      category={category}
                      count={counts[category.id] ?? 0}
                      total={total}
                      onChange={changeCount}
                    />
                  ))}
              </fieldset>
            ) : (
              <div className="total-only-control">
                <div>
                  <strong>총인원</strong>
                  <span>분류 없이 함께 진료받을 전체 인원</span>
                </div>
                <div className="stepper" aria-label="총인원">
                  <button
                    type="button"
                    aria-label="총인원 1명 줄이기"
                    onClick={() => setTotalOnlyCount((count) => Math.max(1, count - 1))}
                    disabled={totalOnlyCount <= 1}
                  >
                    −
                  </button>
                  <output>{totalOnlyCount}</output>
                  <button
                    type="button"
                    aria-label="총인원 1명 늘리기"
                    onClick={() => setTotalOnlyCount((count) => Math.min(9, count + 1))}
                    disabled={totalOnlyCount >= 9}
                  >
                    +
                  </button>
                </div>
              </div>
            )}
            <p className="total-count">
              총 <strong>{total}명</strong>
            </p>
            <div className="notice notice--warning">
              <Info size={20} />
              <div>
                <strong>도착 후 데스크 접수가 필요합니다</strong>
                <p>원격 순서는 진료 준비 순서이며, 병원 도착 후 직원에게 접수번호를 알려주세요.</p>
              </div>
            </div>
            {!countsValidation.success && inputMode === "categorized" && (
              <p className="field-error">{countsValidation.error.issues[0]?.message}</p>
            )}
            <button
              className="primary-button"
              type="button"
              onClick={() =>
                onRegister(
                  inputMode === "categorized"
                    ? { inputMode, patientCounts: counts }
                    : { inputMode, totalCount: totalOnlyCount },
                )
              }
              disabled={!isValid}
            >
              웨이팅 등록
            </button>
            <p className="privacy-copy">환자 이름, 생년월일과 증상은 수집하지 않습니다.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
