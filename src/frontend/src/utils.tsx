export type FetchResult<T> =
  | {
      ok: true;
      data: T;
    }
  | { ok: false; error: string };

export async function betterFetch<T>(
  url: string,
  opts: RequestInit = {},
): Promise<FetchResult<T>> {
  try {
    const res = await fetch(url, opts);

    if (!res.ok) {
      return { ok: false, error: res.statusText };
    }

    const data = (await res.json()) as T;
    return {
      ok: true,
      data,
    };
  } catch (err: any) {
    return { ok: false, error: err.toString() };
  }
}
