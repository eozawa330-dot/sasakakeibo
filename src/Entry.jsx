import { useEffect, useRef, useState } from 'react';
import { X, Image, FileText, ArrowUpRight, Pencil, Undo2, Repeat2, Check, Trash2 } from 'lucide-react';
import { allCategories, categoryFor, money, recordSchema, today } from './lib/ledger.js';
import { photoStore } from './lib/photos.js';

export function Modal({ title, children, onClose, wide=false }) {
  const ref=useRef();
  useEffect(()=>{const dialog=ref.current;if(!dialog.open)dialog.showModal();return()=>dialog.close();},[]);
  return <dialog ref={ref} className={'modal '+(wide?'modal-wide':'')} onCancel={onClose} onClick={e=>{if(e.target===ref.current)onClose();}} aria-label={title}><div className="modal-head"><h2>{title}</h2><button className="icon-button" aria-label="閉じる" onClick={onClose}><X size={20}/></button></div>{children}</dialog>;
}
export function SavedPhoto({ id, onClick }) {
  const [src,setSrc]=useState(null);
  useEffect(()=>{let active=true;photoStore('get',id).then(value=>{if(active)setSrc(value);}).catch(()=>{});return()=>{active=false;};},[id]);
  return src?<button className="photo-thumb" onClick={()=>onClick(src)} aria-label="添付写真を拡大"><img src={src} alt="添付したレシートまたはスクリーンショット"/></button>:<span className="photo-unavailable"><Image size={16}/>写真</span>;
}
export function RecordCard({ record, categories, onEdit, onDelete, onPhoto }) {
  const category=categoryFor(record.categoryId,categories);
  return <div className="record-card"><div className="record-card-main"><span className={'record-icon '+(record.type==='income'?'income-icon':'')}>{record.type==='income'?<FileText size={19}/>:<ArrowUpRight size={19}/>}</span><div className="record-name"><strong>{record.title||category.name}</strong><small>{record.date.slice(5).replace('-','/')} · {category.name}{record.source==='freee'?' · freee':''}{record.recurringId?' · 定期':''}</small></div><strong className={'record-amount '+(record.type==='income'?'positive':'')}>{record.type==='income'?'+':'−'}{money(record.amount)}</strong></div><div className="record-tools">{record.photoId&&<button onClick={()=>onPhoto(record.photoId)}><Image size={14}/>写真</button>}<button onClick={()=>onEdit(record)}><Pencil size={14}/>{record.source==='freee'?'詳細':'修正'}</button>{record.source!=='freee'&&<button onClick={()=>onDelete(record)}><Undo2 size={14}/>取り消す</button>}</div></div>;
}
export function EntryEditor({ initial, categories, onSave, onClose, onDelete, existing=false, duplicateWarning='' }) {
  const [form,setForm]=useState({...initial,categoryId:initial.categoryId||'',date:initial.date||today(),title:initial.title||'',memo:initial.memo||''});
  const [repeat,setRepeat]=useState(false),[allowDuplicate,setAllowDuplicate]=useState(false),[error,setError]=useState('');
  const cats=allCategories(categories),readonly=form.source==='freee';
  const update=(name,value)=>setForm(prev=>({...prev,[name]:value}));
  const submit=e=>{e.preventDefault();try{const cat=cats.find(c=>c.id===form.categoryId);if(!cat)throw new Error('カテゴリを選んでください。');const parsed=recordSchema.parse({...form,id:form.id||crypto.randomUUID(),amount:Number(form.amount),type:cat.type});if(duplicateWarning&&!allowDuplicate)throw new Error('重複の確認をしてください。');onSave(parsed,repeat);}catch(err){setError(err.message?.startsWith('[')?'金額・日付・カテゴリを確認してください。':err.message);}};
  return <Modal title={readonly?'freee請求書の詳細':existing?'記録を修正':'内容を確認して登録'} onClose={onClose}><form className="entry-form" onSubmit={submit}>
    {readonly&&<p className="notice">金額や請求日の変更はfreee請求書で行ってください。次回の同期で反映されます。</p>}
    <label>金額<div className="amount-input"><span>¥</span><input type="number" inputMode="numeric" min="1" max="999999999999" step="1" value={form.amount??''} onChange={e=>update('amount',e.target.value)} required disabled={readonly}/></div></label>
    <div className="form-columns"><label>日付<input type="date" value={form.date} onChange={e=>update('date',e.target.value)} required disabled={readonly}/></label><label>カテゴリ<select value={form.categoryId} onChange={e=>update('categoryId',e.target.value)} required disabled={readonly}><option value="">選択してください</option>{['income','fixed','variable'].map(group=><optgroup key={group} label={{income:'収入',fixed:'固定費',variable:'変動費'}[group]}>{cats.filter(c=>c.type===group).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>)}</select></label></div>
    <label>お店・内容<input value={form.title} onChange={e=>update('title',e.target.value)} maxLength="255" disabled={readonly}/></label>
    {(form.type==='income'||cats.find(c=>c.id===form.categoryId)?.type==='income')&&<label>請求書番号（分かる場合）<input value={form.invoiceNumber||''} onChange={e=>update('invoiceNumber',e.target.value||null)} maxLength="255" disabled={readonly}/></label>}
    <label>メモ<textarea value={form.memo} onChange={e=>update('memo',e.target.value)} rows="2" maxLength="2000" disabled={readonly}/></label>
    {!readonly&&!existing&&<label className="check-row"><input type="checkbox" checked={repeat} onChange={e=>setRepeat(e.target.checked)}/><span><Repeat2 size={16}/>この内容を毎月自動で登録</span></label>}
    {duplicateWarning&&<div className="notice"><p>{duplicateWarning}</p><label className="check-row"><input type="checkbox" checked={allowDuplicate} onChange={e=>setAllowDuplicate(e.target.checked)}/><span>別の記録であることを確認しました</span></label></div>}
    {error&&<p className="error" role="alert">{error}</p>}
    {!readonly&&<button className="primary-button full" type="submit"><Check size={17}/>{existing?'変更を保存':'この内容で登録'}</button>}
    {existing&&!readonly&&<button type="button" className="text-button danger" onClick={()=>onDelete(initial)}><Trash2 size={16}/>この記録を取り消す</button>}
  </form></Modal>;
}
