import type { MockPatientConfig } from "@baro-jinryo/shared";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { PatientRegistrationPage } from "./PatientRegistrationPage";

vi.mock("../components/AppHeader", () => ({
  AppHeader: () => <header>바로진료</header>,
}));

const config: MockPatientConfig = {
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
  waitingPatients: 5,
  estimatedMinutes: 50,
};

describe("PatientRegistrationPage 병원 상세", () => {
  it("전화번호, 주소와 운영시간을 표시하고 전화 링크를 제공한다", () => {
    render(
      <MemoryRouter>
        <PatientRegistrationPage config={config} onRegister={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByText("평일 09:00-18:00")).toBeVisible();
    expect(screen.getByText("서울특별시 마포구 월드컵로 12, 2층")).toBeVisible();
    expect(screen.getByRole("link", { name: "02-1234-5678" })).toHaveAttribute(
      "href",
      "tel:+82212345678",
    );
  });
});
