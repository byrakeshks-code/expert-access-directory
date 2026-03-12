const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 15_000;

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

function clearTokenAndRedirect() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth_token');
  if (window.location.pathname !== '/login') {
    window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  retriesLeft = MAX_RETRIES,
): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.status === 401) {
      clearTokenAndRedirect();
      throw new Error('Session expired. Please log in again.');
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || `API error: ${res.status}`);
    }

    if (res.status === 204) return {} as T;
    const json = await res.json();
    // Unwrap backend { success, data } wrapper so callers get inner data directly
    if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
      return json.data as T;
    }
    return json as T;
  } catch (err: any) {
    clearTimeout(timeout);

    const isNetworkError = err.name === 'TypeError' || err.name === 'AbortError';
    if (isNetworkError && retriesLeft > 0) {
      await sleep(RETRY_DELAY_MS);
      return request<T>(endpoint, options, retriesLeft - 1);
    }

    throw err;
  }
}

async function requestFormData<T>(
  endpoint: string,
  formData: FormData,
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (res.status === 401) {
    clearTokenAndRedirect();
    throw new Error('Session expired.');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || `API error: ${res.status}`);
  }

  const json = await res.json();
  if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
    return json.data as T;
  }
  return json as T;
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, data?: any) =>
    request<T>(endpoint, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),
  put: <T>(endpoint: string, data?: any) =>
    request<T>(endpoint, { method: 'PUT', body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(endpoint: string, data?: any) =>
    request<T>(endpoint, { method: 'PATCH', body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
  upload: <T>(endpoint: string, formData: FormData) =>
    requestFormData<T>(endpoint, formData),
};
