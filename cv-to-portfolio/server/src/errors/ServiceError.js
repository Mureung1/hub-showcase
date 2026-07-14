export class ServiceError extends Error {
  constructor(message, status = 500, options = {}) {
    super(message, options);
    this.name = "ServiceError";
    this.status = status;
  }
}
