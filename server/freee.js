import { ApiError, cookies, cookieNames, seal, unseal, setCookie } from './security.js';
import { recordSchema } from '../src/lib/ledger.js';

const TOKEN_URL = 'https://accounts.secure.freee.co.jp/public_api/token';
export const freeeConfigured = () => Boolean(process.env.FREEE_CLIENT_ID && process.env.FREEE_CLIENT_SECRET && process.env.FREEE_REDIRECT_URI && process.env.SESSION_SECRET?.length >= 32);
export async function exchangeToken(parameters) {
  const response = await fetch(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ ...parameters, client_id: process.env.FREEE_CLIENT_ID, client_secret: process.env.FREEE_CLIENT_SECRET }), signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new ApiError(401, 'freeeの認証が切れました。もう一度連携してください。');
  const token = await response.json();
  if (!token.access_token || !token.refresh_token || !Number.isFinite(Number(token.expires_in))) throw new ApiError(502, 'freeeの認証情報を確認できませんでした。');
  return { accessToken: token.access_token, refreshToken: token.refresh_token, companyId: String(token.company_id || process.env.FREEE_COMPANY_ID || ''), expiresAt: Date.now() + Number(token.expires_in) * 1000, purpose: 'freee' };
}
export function saveFreee(req, res, token) {
  setCookie(req, res, cookieNames.freee, seal(token, 90 * 86400), 90 * 86400);
}
export async function freeeToken(req, res) {
  const existing = unseal(cookies(req)[cookieNames.freee], 'freee');
  if (!existing) throw new ApiError(401, 'freee請求書を連携してください。');
  if (existing.expiresAt > Date.now() + 60000) return existing;
  const refreshed = await exchangeToken({ grant_type: 'refresh_token', refresh_token: existing.refreshToken });
  refreshed.companyId ||= existing.companyId;
  saveFreee(req, res, refreshed);
  return refreshed;
}
export function invoiceRecords(invoices, companyId, month) {
  return invoices.filter(invoice => invoice.cancel_status === 'uncanceled' && typeof invoice.billing_date === 'string' && invoice.billing_date.startsWith(month)).map(invoice => {
    // Exclude balances carried from a previous invoice, so prior-month income is not counted twice.
    const amount = Number(invoice.total_amount) - Number(invoice.amount_brought_forward || 0);
    if (!Number.isFinite(amount) || amount < 0) throw new ApiError(502, '負の請求額があるため、自動同期を停止しました。freeeの請求書を確認してください。');
    return { id: 'freee:' + companyId + ':' + invoice.id, sourceKey: 'freee:' + companyId + ':' + invoice.id, source: 'freee', type: 'income', categoryId: 'inc_freee', amount, date: invoice.billing_date, title: String(invoice.partner_name || invoice.subject || 'freee請求書').slice(0,255), memo: String(invoice.subject || '').slice(0,2000), invoiceNumber: invoice.invoice_number || null, dueDate: invoice.payment_date || null, syncedAt: new Date().toISOString() };
  }).filter(record => record.amount !== 0).map(record => recordSchema.parse(record));
}
export async function fetchInvoices(req, res, month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || '')) throw new ApiError(400, '集計月を選び直してください。');
  const token = await freeeToken(req, res);
  if (!/^\d+$/.test(token.companyId)) throw new ApiError(503, 'freeeの事業所を選択して連携し直してください。');
  const lastDay = new Date(Number(month.slice(0,4)), Number(month.slice(5)), 0).getDate();
  const invoices = [];
  for (let offset = 0; offset < 10000; offset += 100) {
    const query = new URLSearchParams({ company_id: token.companyId, start_billing_date: month + '-01', end_billing_date: month + '-' + lastDay, cancel_status: 'uncanceled', limit: '100', offset: String(offset) });
    const response = await fetch('https://api.freee.co.jp/iv/invoices?' + query, { headers: { Authorization: 'Bearer ' + token.accessToken }, signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new ApiError(response.status === 401 ? 401 : 502, response.status === 429 ? 'freeeの利用回数上限に達しました。時間をおいて同期してください。' : 'freeeの請求書を取得できませんでした。前回の記録を保持しています。');
    const data = await response.json();
    if (!Array.isArray(data.invoices)) throw new ApiError(502, 'freeeの応答を確認できませんでした。前回の記録を保持しています。');
    invoices.push(...data.invoices);
    if (data.invoices.length < 100) return { month, records: invoiceRecords(invoices, token.companyId, month), syncedAt: new Date().toISOString() };
  }
  throw new ApiError(422, '請求書が多いため自動同期を停止しました。部分的な取得結果は反映していません。');
}
