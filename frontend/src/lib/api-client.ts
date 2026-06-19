const base = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

export const apiClient = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const res = await fetch(new URL(url, base), options);
  if (!res.ok) throw await res.json().catch(() => ({ status: res.status }));
  return (res.status === 204 ? undefined : await res.json()) as T;
};
