// URL state encoding. Stuff a tiny JSON blob into the hash so refreshes and
// shared links restore the same reactor configuration.

export interface SharedState {
  T: number;
}

const KEY = "s";

export function readState(): Partial<SharedState> {
  if (typeof window === "undefined") return {};
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return {};
  try {
    const params = new URLSearchParams(hash);
    const raw = params.get(KEY);
    if (!raw) return {};
    const decoded = JSON.parse(atob(raw));
    if (typeof decoded !== "object" || decoded === null) return {};
    const out: Partial<SharedState> = {};
    if (typeof decoded.T === "number" && Number.isFinite(decoded.T)) out.T = decoded.T;
    return out;
  } catch {
    return {};
  }
}

export function writeState(state: SharedState): void {
  if (typeof window === "undefined") return;
  const encoded = btoa(JSON.stringify(state));
  const params = new URLSearchParams();
  params.set(KEY, encoded);
  const newHash = `#${params.toString()}`;
  if (window.location.hash !== newHash) {
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}${newHash}`);
  }
}

export function buildShareURL(state: SharedState): string {
  if (typeof window === "undefined") return "";
  const encoded = btoa(JSON.stringify(state));
  const params = new URLSearchParams();
  params.set(KEY, encoded);
  return `${window.location.origin}${window.location.pathname}#${params.toString()}`;
}
