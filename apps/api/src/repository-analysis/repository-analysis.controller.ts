import { Body, Controller, HttpException, HttpStatus, Post } from "@nestjs/common";
import type {
  RepositoryAnalysisErrorResponse,
  RepositoryAnalysisRequest,
  RepositoryAnalysisResult,
} from "@ptop/contracts";
import {
  GitHubRateLimitError,
  GitHubRepositoryNotFoundError,
  GitHubRequestError,
} from "./github-repository.client";
import {
  InvalidRepositoryUrlError,
  RepositoryAnalysisService,
} from "./repository-analysis.service";

@Controller("repository-analyses")
export class RepositoryAnalysisController {
  constructor(private readonly repositoryAnalysisService: RepositoryAnalysisService) {}

  @Post()
  async create(@Body() request: RepositoryAnalysisRequest): Promise<RepositoryAnalysisResult> {
    try {
      return await this.repositoryAnalysisService.analyze(request);
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  private toHttpException(error: unknown): HttpException {
    if (error instanceof InvalidRepositoryUrlError) {
      return this.createException(
        "INVALID_REPOSITORY_URL",
        error.message,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (error instanceof GitHubRepositoryNotFoundError) {
      return this.createException("REPOSITORY_NOT_FOUND", error.message, HttpStatus.NOT_FOUND);
    }

    if (error instanceof GitHubRateLimitError) {
      return this.createException(
        "GITHUB_RATE_LIMITED",
        error.message,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (error instanceof GitHubRequestError) {
      return this.createException(
        "EXTERNAL_SERVICE_ERROR",
        "GitHub 데이터를 가져오지 못했습니다.",
        HttpStatus.BAD_GATEWAY,
      );
    }

    return this.createException(
      "INTERNAL_SERVER_ERROR",
      "Repository 분석 중 오류가 발생했습니다.",
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  private createException(
    code: RepositoryAnalysisErrorResponse["code"],
    message: string,
    status: HttpStatus,
  ): HttpException {
    return new HttpException({ code, message } satisfies RepositoryAnalysisErrorResponse, status);
  }
}
