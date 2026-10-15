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

/** Client garbage and known driver faults become typed HTTP errors; everything else is 500. */
export function toClientError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (isJsonParseError(err)) {
    return new ApiError(400, "invalid_json", "request body is not valid JSON");
  }
  if (pgCode(err) === "22P02") {
    return new ApiError(400, "invalid_id", "id is not a valid UUID");
  }
  return new ApiError(500, "internal", "internal error");
}

function isJsonParseError(err: unknown): boolean {
  if (!(err instanceof SyntaxError)) return false;
  const withType = err as SyntaxError & { type?: string; status?: number };
  return withType.type === "entity.parse.failed" || withType.status === 400;
}

function pgCode(err: unknown): string | undefined {
  if (typeof err !== "object" || err === null || !("code" in err)) return undefined;
  const code = (err as { code: unknown }).code;
  return typeof code === "string" ? code : undefined;
}
