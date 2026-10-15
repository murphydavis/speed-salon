import { MODERATOR_HEADER } from "@speed-salon/shared";

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  init: RequestInit & { moderatorId?: string } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  if (init.moderatorId) headers.set(MODERATOR_HEADER, init.moderatorId);
  const res = await fetch(path, { ...init, headers });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      status?: number;
      code?: string;
      message?: string;
    } | null;
    throw new ApiRequestError(
      body?.status ?? res.status,
      body?.code ?? "http_error",
      body?.message ?? res.statusText,
    );
  }
  return res.json() as Promise<T>;
}

export async function apiDownload(
  path: string,
  filename: string,
  init: RequestInit & { moderatorId?: string } = {},
): Promise<void> {
  const headers = new Headers(init.headers);
  if (init.moderatorId) headers.set(MODERATOR_HEADER, init.moderatorId);
  const res = await fetch(path, { ...init, headers });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new ApiRequestError(res.status, "http_error", body?.message ?? res.statusText);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
