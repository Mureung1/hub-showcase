import type {
  MockDocumentMetadata,
  MockHospitalApplicationInput,
  MockHospitalInquiryInput,
  MockHospitalOnboardingState,
} from "@baro-jinryo/shared";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock3,
  FileImage,
  RefreshCw,
  Send,
  Stethoscope,
} from "lucide-react";
import { type FormEvent, useState } from "react";

interface HospitalOnboardingPageProps {
  state: MockHospitalOnboardingState;
  onBack: () => void;
  onSubmitInquiry: (input: MockHospitalInquiryInput) => Promise<void>;
  onSubmitApplication: (input: MockHospitalApplicationInput) => Promise<void>;
  onRefresh: () => Promise<void>;
}

function toDocumentMetadata(file: File | undefined): MockDocumentMetadata | null {
  if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) return null;
  if (file.size < 1 || file.size > 5 * 1024 * 1024) return null;
  return {
    name: file.name,
    mimeType: file.type as MockDocumentMetadata["mimeType"],
    size: file.size,
  };
}

export function HospitalOnboardingPage({
  state,
  onBack,
  onSubmitInquiry,
  onSubmitApplication,
  onRefresh,
}: HospitalOnboardingPageProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submitInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setIsSubmitting(true);
    setError("");
    try {
      await onSubmitInquiry({
        hospitalName: String(data.get("hospitalName") ?? ""),
        primaryDepartment: String(data.get("primaryDepartment") ?? ""),
        phoneNumber: String(data.get("phoneNumber") ?? ""),
        regionSido: String(data.get("regionSido") ?? ""),
        regionSigungu: String(data.get("regionSigungu") ?? ""),
        address: String(data.get("address") ?? ""),
      });
    } catch {
      setError("입점 문의를 제출하지 못했습니다. 입력값을 확인해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const businessCertificate = toDocumentMetadata(
      (data.get("businessCertificate") as File | null) ?? undefined,
    );
    const medicalOpeningCertificate = toDocumentMetadata(
      (data.get("medicalOpeningCertificate") as File | null) ?? undefined,
    );
    if (!businessCertificate || !medicalOpeningCertificate) {
      setError("각 증빙 이미지는 JPG, PNG, WebP 형식의 5MB 이하 파일이어야 합니다.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      await onSubmitApplication({
        operatingHoursText: String(data.get("operatingHoursText") ?? ""),
        businessRegistrationNumber: String(data.get("businessRegistrationNumber") ?? ""),
        representativeName: String(data.get("representativeName") ?? ""),
        businessOpenDate: String(data.get("businessOpenDate") ?? ""),
        careInstitutionCode: String(data.get("careInstitutionCode") ?? ""),
        businessCertificate,
        medicalOpeningCertificate,
      });
    } catch {
      setError("상세 신청을 제출하지 못했습니다. 입력값과 증빙 파일을 확인해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const inquiryPending = state.inquiry?.status === "submitted";
  const inquiryRejected = state.inquiry?.status === "rejected";
  const inquiryAccepted = state.inquiry?.status === "accepted";
  const applicationApproved = state.application?.status === "approved";

  return (
    <div className="onboarding-shell">
      <header className="staff-header onboarding-header">
        <button
          className="icon-button"
          type="button"
          aria-label="대기열로 돌아가기"
          onClick={onBack}
        >
          <ArrowLeft size={20} />
        </button>
        <a className="brand" href="http://127.0.0.1:5174">
          <span className="brand-mark">
            <Stethoscope size={20} />
          </span>
          바로진료 병원
        </a>
        <span>병원 입점</span>
      </header>
      <main className="onboarding-main">
        <section className="onboarding-heading">
          <div>
            <span className="section-icon">
              <Building2 size={22} />
            </span>
            <div>
              <h1>병원 입점 진행</h1>
              <p>간단 문의가 수락된 후 상세 정보와 증빙을 제출합니다.</p>
            </div>
          </div>
          <ol className="onboarding-steps" aria-label="입점 진행 단계">
            <li className={state.inquiry ? "is-complete" : "is-current"}>1. 간단 문의</li>
            <li className={inquiryAccepted ? "is-complete" : inquiryPending ? "is-current" : ""}>
              2. 문의 검토
            </li>
            <li
              className={applicationApproved ? "is-complete" : inquiryAccepted ? "is-current" : ""}
            >
              3. 상세 신청
            </li>
          </ol>
        </section>

        {(!state.inquiry || inquiryRejected) && (
          <form className="onboarding-form" onSubmit={submitInquiry}>
            <div className="form-section-heading">
              <h2>간단 입점 문의</h2>
              <p>플랫폼 관리자가 확인할 병원 기본정보를 입력합니다.</p>
            </div>
            {inquiryRejected && (
              <div className="notice notice--warning">
                이전 문의가 거절되었습니다. 정보를 확인해 새 문의를 제출해 주세요.
              </div>
            )}
            <div className="onboarding-form-grid">
              <label>
                병원명
                <input name="hospitalName" defaultValue="서울이비인후과" required />
              </label>
              <label>
                대표 진료과
                <input name="primaryDepartment" defaultValue="이비인후과" required />
              </label>
              <label>
                대표 전화번호
                <input name="phoneNumber" defaultValue="02-1234-5678" required />
              </label>
              <label>
                시·도
                <input name="regionSido" defaultValue="서울특별시" required />
              </label>
              <label>
                시·군·구
                <input name="regionSigungu" defaultValue="마포구" required />
              </label>
              <label className="form-span-2">
                상세 주소
                <input name="address" defaultValue="서울 마포구 월드컵로 12, 2층" required />
              </label>
            </div>
            {error && <p className="field-error">{error}</p>}
            <button className="primary-button" type="submit" disabled={isSubmitting}>
              <Send size={18} />
              {isSubmitting ? "제출 중" : "문의 제출"}
            </button>
          </form>
        )}

        {inquiryPending && (
          <section className="onboarding-state-panel">
            <Clock3 size={34} />
            <h2>입점 문의 검토를 기다리고 있습니다</h2>
            <p>플랫폼 관리자가 기본정보를 확인한 뒤 상세 신청 단계를 열어드립니다.</p>
            <button className="secondary-button" type="button" onClick={() => void onRefresh()}>
              <RefreshCw size={18} />
              검토 상태 새로고침
            </button>
          </section>
        )}

        {inquiryAccepted && !state.application && (
          <form className="onboarding-form" onSubmit={submitApplication}>
            <div className="form-section-heading">
              <h2>상세 검증 신청</h2>
              <p>현재 단계에서는 입력 형식과 증빙 파일 메타데이터를 Mock 검증합니다.</p>
            </div>
            <div className="onboarding-form-grid">
              <label className="form-span-2">
                운영시간
                <input name="operatingHoursText" defaultValue="평일 09:00-18:00" required />
              </label>
              <label>
                사업자등록번호
                <input name="businessRegistrationNumber" placeholder="123-45-67890" required />
              </label>
              <label>
                대표자명
                <input name="representativeName" required />
              </label>
              <label>
                개업일자
                <input name="businessOpenDate" type="date" required />
              </label>
              <label>
                요양기관기호
                <input name="careInstitutionCode" required />
              </label>
              <label className="file-field">
                <FileImage size={20} />
                사업자등록증 이미지
                <input
                  name="businessCertificate"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required
                />
              </label>
              <label className="file-field">
                <FileImage size={20} />
                의료기관 개설신고증명서
                <input
                  name="medicalOpeningCertificate"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required
                />
              </label>
            </div>
            {error && <p className="field-error">{error}</p>}
            <button className="primary-button" type="submit" disabled={isSubmitting}>
              <Send size={18} />
              {isSubmitting ? "검증 중" : "상세 신청 제출"}
            </button>
          </form>
        )}

        {applicationApproved && (
          <section className="onboarding-state-panel onboarding-state-panel--success">
            <CheckCircle2 size={38} />
            <h2>Mock 입점 승인이 완료되었습니다</h2>
            <p>병원 검색 노출과 통합 대기열 운영이 가능한 상태입니다.</p>
            <button className="primary-button" type="button" onClick={onBack}>
              통합 대기열로 이동
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
