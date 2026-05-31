// ~/lib/format.ts — display helpers.

/** US cents → "$349" (or "$349.50" when needed). */
export function formatUSD(cents: number | null | undefined): string {
  if (cents == null) return '—';
  const dollars = cents / 100;
  const hasFraction = Math.round(cents) % 100 !== 0;
  return '$' + dollars.toLocaleString('en-US', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

/** epoch ms → "12m ago" / "3h ago" / "Apr 4, 2026" */
export function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ms).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** epoch ms → "May 18, 2026" */
export function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function initialsFrom(name: string | null, email?: string): string {
  if (name) return name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  if (email) return email[0].toUpperCase();
  return '?';
}

/** Safe JSON.parse for the *_json columns. */
export function parseJSON<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}
