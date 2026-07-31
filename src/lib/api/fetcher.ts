export interface ApiErrorResponse {
  error: string;
  code: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, init);

  if (!res.ok) {
    const data = await res.json();
    const error = data as ApiErrorResponse;
    throw new ApiError(error.error, error.code, res.status);
  }

  return res.json();
}
