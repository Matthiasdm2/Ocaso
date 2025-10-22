// /lib/fetcher.ts
export async function apiGet<T>(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    method: 'GET',
    credentials: 'include',
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText} ${body}`);
  }
  return res.json() as Promise<T>;
}
