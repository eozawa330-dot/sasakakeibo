import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export class ApiError extends Error { constructor(status, message) { super(message); this.status = status; } }
export const cookieNames = { session: 'kakeibo_session', freee: 'kakeibo_freee', state: 'kakeibo_oauth' };
export function cookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').map(value => value.trim().split(/=(.*)/s)).filter(value => value[0]).map(([key, value]) => [key, value || '']));
}
function encryptionKey() {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) throw new ApiError(503, '接続設定が必要です。管理者に確認してください。');
  return createHash('sha256').update(process.env.SESSION_SECRET).digest();
}
export function seal(data, lifetime) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify({ ...data, exp: Date.now() + lifetime * 1000 }), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}
export function unseal(value, purpose) {
  try {
    const data = Buffer.from(value || '', 'base64url');
    if (data.length < 29 || data.length > 8192) return null;
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), data.subarray(0,12));
    decipher.setAuthTag(data.subarray(12,28));
    const decoded = JSON.parse(Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString());
    return decoded.exp > Date.now() && decoded.purpose === purpose ? decoded : null;
  } catch { return null; }
}
export function setCookie(req, res, name, value, lifetime) {
  const secure = process.env.NODE_ENV === 'production' || req.headers['x-forwarded-proto'] === 'https';
  const cookie = name + '=' + value + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + lifetime + (secure ? '; Secure' : '');
  const previous = res.getHeader('Set-Cookie') || [];
  res.setHeader('Set-Cookie', [...(Array.isArray(previous) ? previous : [previous]), cookie]);
}
export function authorize(req) {
  const session = unseal(cookies(req)[cookieNames.session], 'session');
  if (!session) throw new ApiError(401, '設定から接続用コードを入力してください。');
  return session;
}
export function checkOrigin(req) {
  if (req.headers['x-kakeibo-client'] !== '1') throw new ApiError(403, 'アプリから操作してください。');
  const origin = req.headers.origin;
  if (origin && new URL(origin).host !== req.headers.host) throw new ApiError(403, 'この操作は許可されていません。');
}
export function verifyCode(value) {
  const expected = process.env.APP_ACCESS_CODE;
  if (!expected || expected.length < 24) throw new ApiError(503, '接続用コードがまだ設定されていません。');
  if (typeof value !== 'string' || value.length > 256) return false;
  return timingSafeEqual(createHash('sha256').update(value).digest(), createHash('sha256').update(expected).digest());
}
