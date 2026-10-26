import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CATEGORIES } from '../src/lib/categories.js';
import { today, shiftMonth, summarize, normalizeCategories, loadLedger, duplicates, mergeFreee, recurringForMonth, parseQuickEntry } from '../src/lib/ledger.js';
import { invoiceRecords } from '../server/freee.js';

const cats=normalizeCategories(DEFAULT_CATEGORIES);
const row=(extra={})=>({id:'1',type:'variable',categoryId:'var_1',amount:1200,date:'2026-10-22',memo:'',...extra});
test('existing storage keys, customized categories and records are read without writing',()=>{
  const categories=structuredClone(DEFAULT_CATEGORIES);categories.variable[0].name='カスタム食費';
  const values={kakeibo_records:JSON.stringify([row()]),kakeibo_categories:JSON.stringify(categories)};
  const storage={getItem:key=>values[key]||null,setItem:()=>assert.fail('migration must not overwrite data')};
  const data=loadLedger(storage);assert.equal(data.records.length,1);assert.equal(data.categories.variable[0].name,'カスタム食費');assert.ok(data.categories.income.find(c=>c.id==='inc_freee'));
});
test('new users start empty without automatically counting sample records',()=>assert.deepEqual(loadLedger({getItem:()=>null}).records,[]));
test('corrupt stored records fail safely instead of silently returning empty data',()=>assert.throws(()=>loadLedger({getItem:key=>key==='kakeibo_records'?'broken':null})));
test('JST date handles the UTC month boundary',()=>{assert.equal(today(new Date('2026-10-31T15:01:00Z')),'2026-11-01');assert.equal(shiftMonth('2026-01',-1),'2025-12');});
test('summary separates invoices, fixed and variable expenses and avoids dividing by zero',()=>{assert.equal(summarize([row()],'2026-10').savingRate,null);assert.deepEqual(summarize([row(),row({id:'2',type:'income',amount:10000}),row({id:'3',type:'fixed',amount:3000})],'2026-10').balance,5800);});
test('duplicate image and normalized invoice number are detected across sources',()=>{assert.equal(duplicates(row({imageHash:'abc'}),[row({id:'other',imageHash:'abc',date:'2026-09-01'})]).length,1);assert.equal(duplicates(row({type:'income',invoiceNumber:'ＡＢ 123'}),[row({type:'income',invoiceNumber:'ab123',date:'2026-09-01'})]).length,1);});
test('freee sync updates rather than duplicates, removes canceled records, preserves manual data',()=>{
  const old=[row({id:'manual'}),row({id:'old',source:'freee',sourceKey:'freee:1:2'}),row({id:'canceled',source:'freee',sourceKey:'freee:1:3'})];
  const incoming=[row({id:'new',source:'freee',sourceKey:'freee:1:2',amount:2500})];
  const next=mergeFreee(old,incoming,'2026-10');assert.equal(next.length,2);assert.ok(next.find(r=>r.id==='manual'));assert.equal(next.find(r=>r.id==='new').amount,2500);assert.deepEqual(mergeFreee(next,incoming,'2026-10'),next);
});
test('freee replaces an identified income screenshot, and moving an invoice month removes the old copy',()=>{
  const old=[row({id:'screen',source:'screenshot',type:'income',invoiceNumber:'INV-1'}),row({id:'past',source:'freee',sourceKey:'freee:1:1',date:'2026-09-01'})];
  const next=mergeFreee(old,[row({source:'freee',sourceKey:'freee:1:1',type:'income',invoiceNumber:'INV-1'})],'2026-10');assert.equal(next.length,1);
});
test('invoice collection uses billing date, ignores cancellations and removes carry-forward balances',()=>{
  const invoices=[{id:1,billing_date:'2026-10-01',payment_date:'2026-11-30',cancel_status:'uncanceled',total_amount:130000,amount_brought_forward:30000,invoice_number:'A'},{id:2,billing_date:'2026-10-01',cancel_status:'canceled',total_amount:99999},{id:3,billing_date:'2026-09-01',cancel_status:'uncanceled',total_amount:99999}];
  const result=invoiceRecords(invoices,'42','2026-10');assert.equal(result.length,1);assert.equal(result[0].amount,100000);assert.equal(result[0].date,'2026-10-01');assert.equal(result[0].dueDate,'2026-11-30');
});
test('recurring entries clamp to leap-month length and do not repeat a month',()=>{
  const template={id:'rent',type:'fixed',categoryId:'fix_1',amount:85000,title:'家賃',day:31,startMonth:'2024-01'};
  const next=recurringForMonth([template],[],'2024-02');assert.equal(next[0].date,'2024-02-29');assert.equal(recurringForMonth([template],next,'2024-02').length,0);assert.equal(recurringForMonth([template],[],'2023-12').length,0);
});
test('quick entries require a single amount and keep unknown categories for confirmation',()=>{assert.equal(parseQuickEntry('ランチ １,２００円',cats).categoryId,'var_2');assert.equal(parseQuickEntry('請求 10万円',cats).amount,100000);assert.equal(parseQuickEntry('500円と600円',cats),null);assert.equal(parseQuickEntry('何か 500円',cats).categoryId,'');});
test('specific custom categories take precedence over their shorter name prefix',()=>{assert.equal(parseQuickEntry('えま(食) 500円',cats).categoryId,'var_11');});
