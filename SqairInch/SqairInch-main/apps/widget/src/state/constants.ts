export const SESSION_STORAGE_KEY = "sqairinch_session_id";

function generateSessionId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function getOrCreateSessionId(): string {
  if (typeof localStorage === "undefined") return generateSessionId();
  let id = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!id) {
    id = generateSessionId();
    localStorage.setItem(SESSION_STORAGE_KEY, id);
  }
  return id;
}

export function createNewSessionId(): string {
  const id = generateSessionId();
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(SESSION_STORAGE_KEY, id);
  }
  return id;
}
