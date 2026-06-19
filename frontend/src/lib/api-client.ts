const base = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

// orval's fetch client expects the mutator to return { data, status, headers }.
export const apiClient = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const res = await fetch(new URL(url, base), options);
  const body = res.status === 204 ? undefined : await res.json().catch(() => undefined);
  const result = { data: body, status: res.status, headers: res.headers };
  if (!res.ok) throw result;
  return result as T;
};
