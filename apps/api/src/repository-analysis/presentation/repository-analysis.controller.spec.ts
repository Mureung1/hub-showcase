import { HttpException, HttpStatus } from "@nestjs/common";
import {
  GitHubRateLimitError,
  GitHubRepositoryNotFoundError,
  GitHubRequestError,
} from "../infrastructure/github/github-repository.client";
import { RepositoryAnalysisController } from "./repository-analysis.controller";
import {
  InvalidRepositoryUrlError,
  type RepositoryAnalysisService,
} from "../application/repository-analysis.service";
import { RepositoryAnalysisPersistenceError } from "../infrastructure/persistence/repository-analysis.persistence";

describe("RepositoryAnalysisController", () => {
  function createController(error?: Error) {
    const service = {
      analyze: error
        ? jest.fn().mockRejectedValue(error)
        : jest.fn().mockResolvedValue({ id: "analysis-id" }),
    };

    return new RepositoryAnalysisController(service as unknown as RepositoryAnalysisService);
  }

  it.each([
    [new InvalidRepositoryUrlError(), HttpStatus.BAD_REQUEST, "INVALID_REPOSITORY_URL"],
    [new GitHubRepositoryNotFoundError(), HttpStatus.NOT_FOUND, "REPOSITORY_NOT_FOUND"],
    [new GitHubRateLimitError(), HttpStatus.TOO_MANY_REQUESTS, "GITHUB_RATE_LIMITED"],
    [new GitHubRequestError(500), HttpStatus.BAD_GATEWAY, "EXTERNAL_SERVICE_ERROR"],
    [new RepositoryAnalysisPersistenceError(), HttpStatus.SERVICE_UNAVAILABLE, "ANALYSIS_PERSISTENCE_FAILED"],
  ])("maps domain failures to stable API errors", async (error, status, code) => {
    const controller = createController(error);

    let caught: HttpException | undefined;
    try {
      await controller.create({ repositoryUrl: "https://github.com/owner/repo" });
    } catch (exception) {
      caught = exception as HttpException;
    }

    expect(caught?.getStatus()).toBe(status);
    expect(caught?.getResponse()).toEqual(expect.objectContaining({ code }));
  });

  it("returns an internal error without leaking implementation details", async () => {
    const controller = createController(new Error("database secret detail"));

    await expect(
      controller.create({ repositoryUrl: "https://github.com/owner/repo" }),
    ).rejects.toMatchObject({
      response: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Repository 분석 중 오류가 발생했습니다.",
      },
      status: 500,
    });
  });
});
