import { ErrorRequestHandler } from "express";
import { isHttpError } from "../errors/HttpError";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (isHttpError(error)) {
    res.status(error.status).json({
      code: error.code,
      message: error.message
    });
    return;
  }

  const message = error instanceof Error ? error.message : "Unexpected server error";

  res.status(500).json({
    message
  });
};
