const API_URL = '';

export interface ApiEnvelope<T> {
  data: T;
}

export function getAuthToken() {
  return localStorage.getItem('iedc_auth_token');
}

export function withAuthHeaders(headers?: HeadersInit) {
  const nextHeaders = new Headers(headers);
  const token = getAuthToken();

  if (token) {
    nextHeaders.set('Authorization', `Bearer ${token}`);
  }

  return nextHeaders;
}

export async function apiFetch<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const headers = withAuthHeaders(options?.headers);

  if (!(options?.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(await resolveErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: async <T = unknown>(url: string): Promise<ApiEnvelope<T>> => {
    const data = await apiFetch<T>(url);
    return { data };
  },

  post: async <T = unknown>(url: string, body?: unknown): Promise<ApiEnvelope<T>> => {
    const data = await apiFetch<T>(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return { data };
  },

  patch: async <T = unknown>(url: string, body?: unknown): Promise<ApiEnvelope<T>> => {
    const data = await apiFetch<T>(url, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return { data };
  },

  delete: async <T = unknown>(url: string): Promise<ApiEnvelope<T>> => {
    const data = await apiFetch<T>(url, {
      method: 'DELETE',
    });
    return { data };
  },
};

async function resolveErrorMessage(response: Response) {
  try {
    const errorData = await response.json() as { message?: string | string[]; error?: string };
    const message = errorData.message;

    if (Array.isArray(message)) {
      return message.join('; ');
    }

    return message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
  } catch {
    try {
      const errorText = await response.text();
      return errorText || `HTTP ${response.status}: ${response.statusText}`;
    } catch {
      return `HTTP ${response.status}: ${response.statusText}`;
    }
  }
}
