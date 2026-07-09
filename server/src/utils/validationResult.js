function formatPath(path = []) {
  return path.map(String).join('.')
}

export function formatValidationIssues(error) {
  if (!Array.isArray(error?.issues)) {
    return []
  }

  return error.issues.map((issue) => ({
    path: formatPath(issue.path),
    message: issue.message,
    code: issue.code,
  }))
}

export function createValidationError({
  code,
  message,
  cause,
  statusCode = 400,
  type = 'schema_validation_error',
}) {
  const error = new Error(message)
  error.statusCode = statusCode
  error.type = type
  error.publicMessage = message
  error.validationCode = code
  error.validationDetails = formatValidationIssues(cause)
  error.cause = cause

  return error
}

export function toValidationErrorResponse(error) {
  return {
    ok: false,
    error: {
      code: error.validationCode || error.type || 'SCHEMA_VALIDATION_ERROR',
      message: error.publicMessage || 'Schema validation failed.',
      details: Array.isArray(error.validationDetails)
        ? error.validationDetails
        : [],
    },
  }
}
