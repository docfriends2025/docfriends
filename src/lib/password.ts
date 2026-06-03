// ~/lib/password.ts — edge-safe password hashing with Web Crypto PBKDF2-HMAC-SHA256.
// No bcrypt (won't run on workerd). Encoded form: pbkdf2$sha256$<iter>$<saltB64>$<hashB64>.
// Iteration count tuned by measuring hash+verify on the deployed Pages function.

// Tuned to the Cloudflare Pages Workers CPU budget (measured on the deployed function):
// one PBKDF2-HMAC-SHA256 derivation at 100k passes reliably; >=130k reliably exceeds the
// CPU cap (HTTP 500). Real requests do exactly one derivation; rate-limiting backstops this.
export const PBKDF2_ITERATIONS = 100000;
const KEYLEN = 32; // 256-bit derived key
export const MIN_PASSWORD_LEN = 8;

const toB64 = (buf: ArrayBuffer | Uint8Array): string => {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s);
};
const fromB64 = (s: string): Uint8Array => Uint8Array.from(atob(s), (ch) => ch.charCodeAt(0));

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password) as BufferSource, 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' }, key, KEYLEN * 8);
  return new Uint8Array(bits);
}

/** Hash a plaintext password into the encoded storage string. */
export async function hashPassword(password: string, iterations: number = PBKDF2_ITERATIONS): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, iterations);
  return `pbkdf2$sha256$${iterations}$${toB64(salt)}$${toB64(hash)}`;
}

/** Constant-time comparison of a plaintext against a stored hash. */
export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split('$');
  if (parts.length !== 5 || parts[0] !== 'pbkdf2' || parts[1] !== 'sha256') return false;
  const iterations = parseInt(parts[2], 10);
  if (!Number.isFinite(iterations) || iterations < 1) return false;
  let salt: Uint8Array, expected: Uint8Array;
  try { salt = fromB64(parts[3]); expected = fromB64(parts[4]); } catch { return false; }
  const actual = await derive(password, salt, iterations);
  return timingSafeEqual(actual, expected);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export const passwordTooShort = (pw: string): boolean => typeof pw !== 'string' || pw.length < MIN_PASSWORD_LEN;
