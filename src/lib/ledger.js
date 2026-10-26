import { z } from 'zod';
import { DEFAULT_CATEGORIES } from './categories.js';

export const today = (now = new Date()) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(now);
export const currentMonth = () => today().slice(0, 7);
export const money = (amount) => '¥' + Math.round(amount).toLocaleString('ja-JP');
export const monthLabel = (month) => month.replace(/^(\d{4})-(\d{2})$/, (_, y, m) => y + '年' + Number(m) + '月');
export function shiftMonth(month, delta) {
  const [year, number] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, number - 1 + delta, 1));
  return date.toISOString().slice(0, 7);
}
export const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
export const allCategories = (categories) => Object.entries(categories).flatMap(([type, values]) => values.map(c => ({ ...c, type: c.subtractFromIncome ? 'variable' : type })));
export const categoryFor = (id, categories) => allCategories(categories).find(c => c.id === id) || { id, name: '未分類', color: '#7a7d86', type: 'variable' };
export const recordSchema = z.object({
  id: z.string().min(1).max(160), type: z.enum(['income', 'fixed', 'variable']),
  categoryId: z.string().min(1).max(100), amount: z.number().finite().positive().max(999999999999),
  date: z.string().refine(validDate), memo: z.string().max(2000).default(''),
  title: z.string().max(255).optional(), source: z.string().max(40).optional(),
  sourceKey: z.string().max(255).optional(), invoiceNumber: z.string().max(255).nullable().optional(),
  imageHash: z.string().max(100).optional(), photoId: z.string().max(160).optional(),
  recurringId: z.string().max(160).optional(), createdAt: z.string().optional(),
}).passthrough();

export function normalizeCategories(input) {
  if (!input || !['income', 'fixed', 'variable'].every(key => Array.isArray(input[key]))) throw new Error('カテゴリの形式を確認してください。');
  const result = {};
  const ids = new Set();
  for (const key of ['income', 'fixed', 'variable']) {
    result[key] = input[key].map(value => {
      if (!value || typeof value.id !== 'string' || !value.id || typeof value.name !== 'string' || !value.name.trim() || ids.has(value.id)) throw new Error('カテゴリ名・IDを確認してください。');
      ids.add(value.id);
      return { ...value, name: value.name.slice(0, 100), color: /^#[a-f\d]{6}$/i.test(value.color || '') ? value.color : '#6383ce' };
    });
  }
  if (!ids.has('inc_freee')) result.income.push({ id: 'inc_freee', name: '請求収入', icon: 'file-text', color: '#427d68' });
  return result;
}

export function loadLedger(storage) {
  const raw = storage.getItem('kakeibo_records');
  const categories = storage.getItem('kakeibo_categories');
  const records = raw ? z.array(recordSchema).parse(JSON.parse(raw)) : [];
  return { records, categories: normalizeCategories(categories ? JSON.parse(categories) : DEFAULT_CATEGORIES) };
}

export function summarize(records, month) {
  const selected = records.filter(record => record.date.startsWith(month));
  const sum = (type) => selected.filter(record => record.type === type).reduce((total, record) => total + record.amount, 0);
  const income = sum('income'), fixed = sum('fixed'), variable = sum('variable');
  return { records: selected, income, fixed, variable, expense: fixed + variable, balance: income - fixed - variable, savingRate: income > 0 ? (income - fixed - variable) / income * 100 : null };
}

export function duplicates(candidate, records) {
  const normalized = (value) => (value || '').normalize('NFKC').replace(/\s/g, '').toLowerCase();
  return records.filter(record =>
    (candidate.sourceKey && candidate.sourceKey === record.sourceKey) ||
    (candidate.imageHash && candidate.imageHash === record.imageHash) ||
    (candidate.type === 'income' && record.type === 'income' && candidate.invoiceNumber && normalized(candidate.invoiceNumber) === normalized(record.invoiceNumber)) ||
    (record.amount === candidate.amount && record.date === candidate.date && record.type === candidate.type && normalized(record.title || record.memo) === normalized(candidate.title || candidate.memo))
  );
}

export function mergeFreee(records, incoming, month) {
  const ids = new Set(incoming.map(record => record.sourceKey));
  const normalizeNumber = value => value.normalize('NFKC').replace(/\s/g,'').toLowerCase();
  const numbers = new Set(incoming.map(record => record.invoiceNumber).filter(Boolean).map(normalizeNumber));
  // The server returns a complete month, including canceled/deleted invoice removals.
  const retained = records.filter(record => !(record.source === 'freee' && (record.date.startsWith(month) || ids.has(record.sourceKey))) && !(record.type === 'income' && record.source === 'screenshot' && record.invoiceNumber && numbers.has(normalizeNumber(record.invoiceNumber))));
  return [...incoming, ...retained];
}

export function recurringForMonth(templates, records, month) {
  const lastDay = new Date(Number(month.slice(0,4)), Number(month.slice(5)), 0).getDate();
  return templates.filter(template => template.startMonth <= month && !records.some(record => record.recurringId === template.id && record.date.startsWith(month))).map(template => ({
    id: 'recurring:' + template.id + ':' + month, recurringId: template.id,
    date: month + '-' + String(Math.min(Number(template.day), lastDay)).padStart(2, '0'),
    type: template.type, amount: template.amount, categoryId: template.categoryId,
    title: template.title, memo: template.memo || '', source: 'recurring',
  }));
}

export function parseQuickEntry(text, categories) {
  const normalized = text.normalize('NFKC');
  const amounts = [...normalized.matchAll(/(?:¥\s*([\d,]+)|([\d,]+)\s*(万)?円)/g)];
  if (amounts.length !== 1) return null;
  const match = amounts[0];
  const amount = Number((match[1] || match[2]).replace(/,/g, '')) * (match[3] ? 10000 : 1);
  if (!amount || amount > 999999999999) return null;
  const cats = allCategories(categories);
  const exact = [...cats].sort((a,b)=>b.name.length-a.name.length).find(c => normalized.includes(c.name));
  const guessedName = /ランチ|夕食|カフェ|レストラン/.test(normalized) ? '外食' : /スーパー|食材/.test(normalized) ? '食費' : /電車|タクシー|バス/.test(normalized) ? '交通費' : /請求|収入|売上/.test(normalized) ? '請求収入' : null;
  const cat = exact || cats.find(c => c.name === guessedName);
  const dateMatch = normalized.match(/\d{4}-\d{2}-\d{2}/);
  let date = dateMatch?.[0] || today();
  if (!dateMatch && /昨日/.test(normalized)) { const d = new Date(date + 'T12:00:00+09:00'); d.setUTCDate(d.getUTCDate() - 1); date = today(d); }
  if (!validDate(date)) return null;
  return { amount, date, title: normalized.replace(match[0], '').trim().slice(0,255) || cat?.name || '支出', type: cat?.type || 'variable', categoryId: cat?.id || '', memo: '', invoiceNumber: null, confidence: 0, needsConfirmation: true };
}

export function reportFacts(records, month, categories) {
  const current = summarize(records, month), previous = summarize(records, shiftMonth(month, -1));
  const grouped = new Map();
  current.records.filter(r => r.type !== 'income').forEach(record => grouped.set(record.categoryId, (grouped.get(record.categoryId) || 0) + record.amount));
  return { month, incomeBasis: '当月請求日・請求額', income: current.income, expense: current.expense, balance: current.balance, fixed: current.fixed, variable: current.variable, previousMonthExpense: previous.expense, elapsedDays: month === currentMonth() ? Number(today().slice(-2)) : null, categories: [...grouped].map(([id, amount]) => ({ name: categoryFor(id, categories).name, amount })), count: current.records.length };
}

export function localInsights(records, month, categories) {
  const facts = reportFacts(records, month, categories);
  if (!facts.count) return ['まだ記録がありません。レシートやひとこと入力で、最初の1件を記録しましょう。'];
  const sorted = facts.categories.sort((a,b) => b.amount - a.amount);
  const lines = [];
  if (sorted.length && facts.expense) lines.push('支出が最も多いのは' + sorted[0].name + 'の' + money(sorted[0].amount) + '。全体の' + Math.round(sorted[0].amount / facts.expense * 100) + '%です。');
  if (facts.previousMonthExpense) lines.push('前月の支出' + money(facts.previousMonthExpense) + 'に対し、今月は' + money(facts.expense) + (facts.elapsedDays ? '（' + facts.elapsedDays + '日時点）' : '') + 'です。');
  if (facts.income) lines.push('収入は請求額で計上しています。差額' + money(facts.balance) + 'は、実際の預金残高とは異なります。');
  return lines;
}
