import type { QueryResult, QueryResultRow } from "pg";
import { describe, expect, it } from "vitest";
import type { DatabaseExecutor } from "../../db/databaseExecutor.js";
import { PgHospitalApplicationRepository } from "./pgHospitalApplicationRepository.js";

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
const applicationRow = {
  id: "a996466d-01a8-4ae4-b7ed-51354fac21dd",
  hospital_id: "be0aa4da-8adc-4765-9622-e11ab406fc6d",
  applicant_account_id: "bdd50fb2-0ac9-45c5-bf74-7a9299cb086b",
  business_registration_number: "1234567890",
  care_institution_code: "CARE-001",
  representative_name: "홍길동",
  business_open_date: "2020-01-01",
  status: "pending",
  verification_provider: "mock",
  verification_result: { businessStatus: "mock_valid" },
  reviewed_by: null,
  submitted_at: now,
  reviewed_at: null,
};

describe("PgHospitalApplicationRepository", () => {
  it("상세 신청을 pending과 mock 검증 결과로 생성한다", async () => {
    const executor = new FakeDatabaseExecutor([applicationRow]);
    const repository = new PgHospitalApplicationRepository();

    const application = await repository.create(executor, {
      hospitalId: applicationRow.hospital_id,
      applicantAccountId: applicationRow.applicant_account_id,
      businessRegistrationNumber: "1234567890",
      careInstitutionCode: "CARE-001",
      representativeName: "홍길동",
      businessOpenDate: "2020-01-01",
      verificationResult: { businessStatus: "mock_valid" },
    });

    expect(application.status).toBe("pending");
    expect(application.verificationProvider).toBe("mock");
    expect(executor.calls[0]?.queryText).toContain("'mock', $7");
    expect(executor.calls[0]?.values).toEqual([
      applicationRow.hospital_id,
      applicationRow.applicant_account_id,
      "1234567890",
      "CARE-001",
      "홍길동",
      "2020-01-01",
      { businessStatus: "mock_valid" },
    ]);
  });

  it("pending 신청만 플랫폼 관리자가 승인하거나 거절한다", async () => {
    const reviewerId = "6a30b1d2-d0d0-4fc9-aea0-253af7fd085c";
    const executor = new FakeDatabaseExecutor([
      {
        ...applicationRow,
        status: "approved",
        reviewed_by: reviewerId,
        reviewed_at: now,
      },
    ]);
    const repository = new PgHospitalApplicationRepository();

    const application = await repository.review(
      executor,
      applicationRow.id,
      "approved",
      reviewerId,
    );

    expect(application?.status).toBe("approved");
    expect(executor.calls[0]?.queryText).toContain("WHERE id = $1 AND status = 'pending'");
  });
});
