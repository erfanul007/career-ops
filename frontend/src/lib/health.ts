const base = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

export async function fetchHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${base}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
