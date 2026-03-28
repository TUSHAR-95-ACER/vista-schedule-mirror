export function getUserStorageKey(baseKey: string, userId: string) {
  return `${baseKey}:${userId}`;
}

export function loadUserStorage<T>(baseKey: string, userId: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(getUserStorageKey(baseKey, userId));
    return stored ? JSON.parse(stored) as T : fallback;
  } catch {
    return fallback;
  }
}

export function saveUserStorage<T>(baseKey: string, userId: string, value: T) {
  localStorage.setItem(getUserStorageKey(baseKey, userId), JSON.stringify(value));
}