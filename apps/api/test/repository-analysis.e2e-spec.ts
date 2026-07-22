import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { RepositoryAnalysisController } from "../src/repository-analysis/presentation/repository-analysis.controller";
import { RepositoryAnalysisService } from "../src/repository-analysis/application/repository-analysis.service";

describe("Repository analysis endpoint", () => {
  let app: INestApplication;
  const analyze = jest.fn();

  beforeAll(async () => {
    const testingModule = await Test.createTestingModule({
      controllers: [RepositoryAnalysisController],
      providers: [{ provide: RepositoryAnalysisService, useValue: { analyze } }],
    }).compile();

    app = testingModule.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    analyze.mockReset();
  });

  it("returns 201 with the completed analysis", async () => {
    analyze.mockResolvedValue({ id: "analysis-id", contributors: [] });

    await request(app.getHttpServer())
      .post("/api/v1/repository-analyses")
      .send({ repositoryUrl: "https://github.com/SubJeeLee/hub" })
      .expect(201)
      .expect({ id: "analysis-id", contributors: [] });
  });

  it("returns a stable 400 response for an invalid URL", async () => {
    const { InvalidRepositoryUrlError } = await import(
      "../src/repository-analysis/application/repository-analysis.service"
    );
    analyze.mockRejectedValue(new InvalidRepositoryUrlError());

    await request(app.getHttpServer())
      .post("/api/v1/repository-analyses")
      .send({ repositoryUrl: "invalid" })
      .expect(400)
      .expect({
        code: "INVALID_REPOSITORY_URL",
        message: "지원하는 GitHub Repository URL을 입력해 주세요.",
      });
  });
});
