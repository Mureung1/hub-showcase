import type { MockPatientConfig } from "@baro-jinryo/shared";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPatientConfig } from "../services/apiClient";
import { HospitalSearchPage } from "./HospitalSearchPage";

vi.mock("../components/AppHeader", () => ({
  AppHeader: () => <header>바로진료</header>,
}));

vi.mock("../services/apiClient", () => ({
  getApiHealth: vi.fn().mockResolvedValue({ ok: true }),
  getPatientConfig: vi.fn().mockRejectedValue(new Error("테스트에서는 mock 병원 유지")),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <HospitalSearchPage />
    </MemoryRouter>,
  );
}

const liveConfig: MockPatientConfig = {
  hospital: {
    id: "10000000-0000-4000-8000-000000000001",
    name: "서울이비인후과",
    department: "이비인후과",
    district: "서울특별시 마포구",
    address: "서울특별시 마포구 월드컵로 12, 2층",
    phoneNumber: "+82212345678",
    operatingHoursText: "평일 09:00-18:00",
  },
  inputMode: "total_only",
  categories: [],
  queueStatus: "open",
  waitingPatients: 2,
  estimatedMinutes: 20,
};

describe("HospitalSearchPage 지역 검색", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPatientConfig).mockRejectedValue(new Error("테스트에서는 병원 현황 조회 실패"));
  });

  it("첫 API 응답 전에는 임의의 대기 인원과 시간을 표시하지 않는다", () => {
    vi.mocked(getPatientConfig).mockImplementation(() => new Promise(() => undefined));

    renderPage();

    expect(screen.getByText("대기 현황 확인 중")).toBeVisible();
    expect(screen.queryByText("앞 대기 5명")).toBeNull();
    expect(screen.queryByText("약 50분")).toBeNull();
  });

  it("API 응답을 받은 뒤 실제 대기 인원과 시간을 표시한다", async () => {
    vi.mocked(getPatientConfig).mockResolvedValue(liveConfig);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("앞 대기 2명")).toBeVisible();
      expect(screen.getByText("약 20분")).toBeVisible();
    });
  });

  it("시·도를 선택하기 전에는 시·군·구 선택을 비활성화한다", () => {
    renderPage();

    expect(screen.getByRole("combobox", { name: "시·군·구 선택" })).toBeDisabled();
  });

  it("서울 마포구를 선택하면 해당 지역 병원 카드만 표시한다", () => {
    renderPage();

    fireEvent.change(screen.getByRole("combobox", { name: "시·도 선택" }), {
      target: { value: "서울특별시" },
    });
    const cityDistrictSelect = screen.getByRole("combobox", {
      name: "시·군·구 선택",
    });
    expect(cityDistrictSelect).toBeEnabled();

    fireEvent.change(cityDistrictSelect, { target: { value: "마포구" } });

    const hospitalSection = screen
      .getByRole("heading", { name: "현재 접수 가능한 병원" })
      .closest("section");
    expect(hospitalSection).not.toBeNull();
    expect(within(hospitalSection as HTMLElement).getByText("서울이비인후과")).toBeVisible();
    expect(within(hospitalSection as HTMLElement).getByText("우리내과의원")).toBeVisible();
    expect(within(hospitalSection as HTMLElement).queryByText("연세정형외과의원")).toBeNull();
    expect(within(hospitalSection as HTMLElement).getByText("2곳")).toBeVisible();
  });

  it("검색어와 지역을 조합하고 결과가 없으면 빈 상태를 표시한다", () => {
    renderPage();

    fireEvent.change(screen.getByRole("combobox", { name: "시·도 선택" }), {
      target: { value: "서울특별시" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "시·군·구 선택" }), {
      target: { value: "서대문구" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "병원 검색" }), {
      target: { value: "내과" },
    });

    expect(screen.getByText("0곳")).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("검색 조건에 맞는 병원이 없습니다.");
  });

  it("대표 진료과를 선택하면 해당 진료과 병원만 표시한다", () => {
    renderPage();

    fireEvent.change(screen.getByRole("combobox", { name: "대표 진료과 선택" }), {
      target: { value: "정형외과" },
    });

    expect(screen.getByRole("heading", { name: "연세정형외과의원" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "서울이비인후과" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "우리내과의원" })).toBeNull();
    expect(screen.getByText("1곳")).toBeVisible();
  });
});
