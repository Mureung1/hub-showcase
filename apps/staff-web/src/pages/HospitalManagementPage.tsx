import type { HospitalInformation, HospitalManagementState } from "@baro-jinryo/shared";
import { ArrowLeft, Building2, Clock3, Save, Stethoscope } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import {
  getHospitalManagement,
  submitHospitalChangeRequest,
} from "../services/apiClient";

interface HospitalManagementPageProps {
  onBack: () => void;
  onSignOut: () => Promise<void>;
}

function toKoreanPhoneNumber(phoneNumber: string): string {
  const digits = phoneNumber.replace(/^\+82/, "0").replace(/\D/g, "").slice(0, 11);
  if (digits.startsWith("02")) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, -4)}-${digits.slice(-4)}`;
  }
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, -4)}-${digits.slice(-4)}`;
}

function toE164(phoneNumber: string): string {
  const digits = phoneNumber.replace(/\D/g, "");
  return `+82${digits.slice(1)}`;
}

export function HospitalManagementPage({ onBack, onSignOut }: HospitalManagementPageProps) {
  const [state, setState] = useState<HospitalManagementState>();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void getHospitalManagement().then(setState).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "병원 정보를 불러오지 못했습니다.");
    });
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!state) return;
    const data = new FormData(event.currentTarget);
    const proposedValues: HospitalInformation = {
      name: String(data.get("name") ?? "").trim(),
      primaryDepartment: String(data.get("primaryDepartment") ?? "").trim(),
      phoneNumber: toE164(String(data.get("phoneNumber") ?? "")),
      regionSido: String(data.get("regionSido") ?? "").trim(),
      regionSigungu: String(data.get("regionSigungu") ?? "").trim(),
      address: String(data.get("address") ?? "").trim(),
      operatingHoursText: String(data.get("operatingHoursText") ?? "").trim(),
    };
    setSubmitting(true);
    setError("");
    try {
      const pendingChangeRequest = await submitHospitalChangeRequest(proposedValues);
      setState({ ...state, pendingChangeRequest });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "변경 요청을 제출하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="onboarding-shell">
      <header className="staff-header onboarding-header">
        <button className="icon-button" type="button" title="대기열로 돌아가기" onClick={onBack}>
          <ArrowLeft size={20} />
        </button>
        <a className="brand" href="http://127.0.0.1:5173">
          <span className="brand-mark"><Stethoscope size={20} /></span>
          바로진료 병원
        </a>
        <button className="secondary-button compact" type="button" onClick={() => void onSignOut()}>
          로그아웃
        </button>
      </header>
      <main className="onboarding-main hospital-management-main">
        <section className="onboarding-heading">
          <div>
            <span className="section-icon"><Building2 size={24} /></span>
            <div>
              <h1>병원 관리</h1>
              <p>수정 내용은 플랫폼 관리자 승인 후 환자 화면에 반영됩니다.</p>
            </div>
          </div>
        </section>

        {error && <p className="field-error" role="alert">{error}</p>}
        {!state ? (
          <section className="onboarding-state-panel"><p>병원 정보를 불러오는 중입니다.</p></section>
        ) : state.pendingChangeRequest ? (
          <section className="onboarding-state-panel hospital-change-pending">
            <Clock3 size={36} />
            <h2>병원 정보 변경사항을 검토 중입니다</h2>
            <p>승인 전까지는 기존 병원 정보가 유지됩니다.</p>
            <dl className="hospital-change-summary">
              <div><dt>병원명</dt><dd>{state.pendingChangeRequest.proposedValues.name}</dd></div>
              <div><dt>진료과</dt><dd>{state.pendingChangeRequest.proposedValues.primaryDepartment}</dd></div>
              <div><dt>대표 전화</dt><dd>{toKoreanPhoneNumber(state.pendingChangeRequest.proposedValues.phoneNumber)}</dd></div>
              <div><dt>주소</dt><dd>{state.pendingChangeRequest.proposedValues.address}</dd></div>
            </dl>
            <button className="secondary-button" type="button" onClick={onBack}>대기열로 돌아가기</button>
          </section>
        ) : (
          <form className="onboarding-form" onSubmit={(event) => void submit(event)}>
            <div className="form-section-heading">
              <h2>등록된 병원 정보</h2>
              <p>변경할 항목을 수정한 뒤 검토 요청을 보내 주세요.</p>
            </div>
            <div className="onboarding-form-grid">
              <label>병원명<input name="name" defaultValue={state.hospital.name} required minLength={2} /></label>
              <label>대표 진료과<input name="primaryDepartment" defaultValue={state.hospital.primaryDepartment} required /></label>
              <label>대표 전화번호<input name="phoneNumber" defaultValue={toKoreanPhoneNumber(state.hospital.phoneNumber)} required pattern="0\d{1,2}-?\d{3,4}-?\d{4}" /></label>
              <label>시·도<input name="regionSido" defaultValue={state.hospital.regionSido} required /></label>
              <label>시·군·구<input name="regionSigungu" defaultValue={state.hospital.regionSigungu} required /></label>
              <label className="form-span-2">주소<input name="address" defaultValue={state.hospital.address} required /></label>
              <label className="form-span-2">운영 시간 안내<input name="operatingHoursText" defaultValue={state.hospital.operatingHoursText} placeholder="평일 09:00-18:00" /></label>
            </div>
            <button className="primary-button" type="submit" disabled={submitting}>
              <Save size={18} /> {submitting ? "제출 중" : "변경사항 검토 요청"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
