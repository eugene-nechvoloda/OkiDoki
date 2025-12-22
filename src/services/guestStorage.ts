const GUEST_ID_KEY = "okidoki_guest_id";

type JsonValue = unknown;

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getGuestId(): string {
  if (typeof window === "undefined") return "guest";

  const existing = window.localStorage.getItem(GUEST_ID_KEY);
  if (existing) return existing;

  const id = crypto.randomUUID();
  window.localStorage.setItem(GUEST_ID_KEY, id);
  return id;
}

export function readGuestJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  return safeParse<T>(window.localStorage.getItem(key), fallback);
}

export function writeGuestJson(key: string, value: JsonValue): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}
