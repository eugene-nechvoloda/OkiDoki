const GUEST_ID_KEY = "okidoki_guest_id";

type JsonValue = unknown;

type LegacyKeyAliases = Record<string, string[]>;

// Backwards-compatible storage keys.
// We intentionally support multiple historical keys so data survives refactors/renames.
const LEGACY_KEY_ALIASES: LegacyKeyAliases = {
  // Guest-prefix migration
  okidoki_chats: ["okidoki_guest_chats"],
  okidoki_documents: ["okidoki_guest_documents"],
  okidoki_templates: ["okidoki_guest_templates"],

  // Projects -> Folders rename migration (+ guest-prefix migration for folders)
  okidoki_folders: [
    "okidoki_guest_folders",
    "okidoki_projects",
    "okidoki_guest_projects",
  ],
};

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function getCandidateKeys(primaryKey: string): string[] {
  const keys = new Set<string>();
  keys.add(primaryKey);

  // Explicit aliases (renames, etc.)
  for (const k of LEGACY_KEY_ALIASES[primaryKey] ?? []) keys.add(k);

  // Automatic guest/non-guest migration
  if (primaryKey.startsWith("okidoki_guest_")) {
    keys.add(primaryKey.replace("okidoki_guest_", "okidoki_"));
  } else if (primaryKey.startsWith("okidoki_")) {
    keys.add(primaryKey.replace("okidoki_", "okidoki_guest_"));
  }

  return Array.from(keys);
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

  const candidateKeys = getCandidateKeys(key);

  for (const candidateKey of candidateKeys) {
    const raw = window.localStorage.getItem(candidateKey);
    if (raw !== null) {
      // If we found data under a legacy key, migrate it to the primary key.
      if (candidateKey !== key) {
        window.localStorage.setItem(key, raw);
      }
      return safeParse<T>(raw, fallback);
    }
  }

  return fallback;
}

export function writeGuestJson(key: string, value: JsonValue): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

