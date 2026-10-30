export interface FilePreviewPayload {
  name: string;
  type: string;
  url: string;
  size?: number;
}

const key = (id: string) => `file-preview:${id}`;

export function stashFileForPreview(file: FilePreviewPayload): string {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try {
    sessionStorage.setItem(key(id), JSON.stringify(file));
  } catch {
    // The route will show a clear unavailable state if storage is unavailable.
  }
  return id;
}

export function readFileForPreview(id: string): FilePreviewPayload | null {
  try {
    const raw = sessionStorage.getItem(key(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FilePreviewPayload;
    if (!parsed?.url || !parsed?.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearFilePreview(id: string): void {
  try {
    sessionStorage.removeItem(key(id));
  } catch {
    // ignore storage failures
  }
}
