import type { QueryResult, QueryResultRow } from "pg";
import { describe, expect, it } from "vitest";
import type { DatabaseExecutor } from "../../db/databaseExecutor.js";
import { PgHospitalInquiryRepository } from "./pgHospitalInquiryRepository.js";
import { PgHospitalRepository } from "./pgHospitalRepository.js";

class FakeDatabaseExecutor implements DatabaseExecutor {
  readonly calls: Array<{ queryText: string; values: unknown[] | undefined }> = [];

  constructor(private readonly resultRows: QueryResultRow[]) {}

  async query<Row extends QueryResultRow>(
    queryText: string,
    values?: unknown[],
  ): Promise<QueryResult<Row>> {
    this.calls.push({ queryText, values });
    return {
      command: "SELECT",
      rowCount: this.resultRows.length,
      oid: 0,
      fields: [],
      rows: this.resultRows as Row[],
    };
  }
}

const now = new Date("2026-07-15T09:00:00.000Z");

describe("PgHospitalRepository", () => {
  it("문의 정보로 pending 병원을 생성한다", async () => {
    const executor = new FakeDatabaseExecutor([
      {
        id: "be0aa4da-8adc-4765-9622-e11ab406fc6d",
        name: "바로이비인후과",
        primary_department: "이비인후과",
        phone_number: "+82212345678",
        region_sido: "서울특별시",
        region_sigungu: "마포구",
        address: "서울특별시 마포구 테스트로 1",
        latitude: null,
        longitude: null,
        operating_hours_text: "",
        approval_status: "pending",
        approved_at: null,
        created_at: now,
        updated_at: now,
      },
    ]);
    const repository = new PgHospitalRepository();

    const hospital = await repository.create(executor, {
      name: "바로이비인후과",
      primaryDepartment: "이비인후과",
      phoneNumber: "+82212345678",
      regionSido: "서울특별시",
      regionSigungu: "마포구",
      address: "서울특별시 마포구 테스트로 1",
    });

    expect(hospital.approvalStatus).toBe("pending");
    expect(executor.calls[0]?.queryText).not.toContain("approval_status)");
  });
});

describe("PgHospitalInquiryRepository", () => {
  it("submitted 문의만 수락하며 병원과 검토자를 연결한다", async () => {
    const inquiryId = "45394cf8-30b6-45de-8fc8-c98387dab81c";
    const hospitalId = "be0aa4da-8adc-4765-9622-e11ab406fc6d";
    const reviewerId = "6a30b1d2-d0d0-4fc9-aea0-253af7fd085c";
    const executor = new FakeDatabaseExecutor([
      {
        id: inquiryId,
        applicant_account_id: "bdd50fb2-0ac9-45c5-bf74-7a9299cb086b",
        hospital_id: hospitalId,
        hospital_name: "바로이비인후과",
        primary_department: "이비인후과",
        phone_number: "+82212345678",
        region_sido: "서울특별시",
        region_sigungu: "마포구",
        address: "서울특별시 마포구 테스트로 1",
        status: "accepted",
        reviewed_by: reviewerId,
        submitted_at: now,
        reviewed_at: now,
      },
    ]);
    const repository = new PgHospitalInquiryRepository();

    const inquiry = await repository.accept(executor, inquiryId, hospitalId, reviewerId);

    expect(inquiry?.status).toBe("accepted");
    expect(executor.calls[0]?.queryText).toContain("WHERE id = $1 AND status = 'submitted'");
    expect(executor.calls[0]?.values).toEqual([
      inquiryId,
      "accepted",
      hospitalId,
      reviewerId,
    ]);
  });
});
