import { Body, Controller, Get, HttpException, HttpStatus, Param, Post } from "@nestjs/common";
import type {
  ReflectionDraftSaveRequest,
  RepositoryAnalysisErrorResponse,
} from "@ptop/contracts";
import {
  ReflectionDraftLoadError,
  ReflectionDraftPersistenceError,
} from "./reflection.persistence";
import { InvalidReflectionDraftError, ReflectionService } from "./reflection.service";

@Controller("repository-analyses")
export class ReflectionDraftController {
  constructor(private readonly reflectionService: ReflectionService) {}

  @Post(":analysisId/reflection")
  async save(
    @Param("analysisId") analysisId: string,
    @Body() request: ReflectionDraftSaveRequest,
  ) {
    try {
      return await this.reflectionService.save(analysisId, request?.draft);
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  @Get(":analysisId/reflection")
  async find(@Param("analysisId") analysisId: string) {
    try {
      return await this.reflectionService.find(analysisId);
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  private toHttpException(error: unknown): HttpException {
    if (error instanceof InvalidReflectionDraftError) {
      return this.createException(
        "INVALID_REFLECTION_DRAFT",
        error.message,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (error instanceof ReflectionDraftPersistenceError) {
      return this.createException(
        "REFLECTION_SAVE_FAILED",
        error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (error instanceof ReflectionDraftLoadError) {
      return this.createException(
        "REFLECTION_LOAD_FAILED",
        error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return this.createException(
      "REFLECTION_SAVE_FAILED",
      "회고 저장에 실패했습니다.",
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
