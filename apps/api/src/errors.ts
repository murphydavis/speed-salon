export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }

  toJSON() {
    return { status: this.status, code: this.code, message: this.message };
  }
}

export function notFound(entity: string): ApiError {
  return new ApiError(404, "not_found", `${entity} not found`);
}
