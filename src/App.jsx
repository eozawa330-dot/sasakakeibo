import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Sparkles, Camera, Plus, ArrowUp, MessageCircle, ChartNoAxesCombined, Settings, ChevronRight, X, Pencil, LoaderCircle } from 'lucide-react';
import { allCategories, currentMonth, duplicates, loadLedger, mergeFreee, money, normalizeCategories, parseQuickEntry, recordSchema, recurringForMonth, reportFacts, summarize, today, monthLabel, categoryFor } from './lib/ledger.js';
import { DEFAULT_CATEGORIES } from './lib/categories.js';
import { photoStore, preparePhoto } from './lib/photos.js';
import { readJSON, request } from './lib/client.js';
import { Modal, EntryEditor, RecordCard, SavedPhoto } from './Entry.jsx';
const Report = lazy(() => import('./Report.jsx'));
import SettingsPanel from './Settings.jsx';
import { useAppearance } from './Appearance.jsx';
import './styles.css';
import './appearance.css';

const readList=key=>{const list=readJSON(key,[]);return Array.isArray(list)?list:[];};
export default function App() {
  const appearance = useAppearance();
  const [initial]=useState(()=>{try{return {...loadLedger(localStorage),error:''};}catch{return {records:[],categories:normalizeCategories(DEFAULT_CATEGORIES),error:'保存済みデータを読み込めません。元のデータを保護するため編集を停止しています。設定からバックアップを保存してください。'};}});
  const [records,setRecords]=useState(initial.records),[categories,setCategories]=useState(initial.categories),[storageError,setStorageError]=useState(initial.error);
  const [messages,setMessages]=useState(()=>readList('kakeibo_chat_v1')),[templates,setTemplates]=useState(()=>readList('kakeibo_recurring_v1')),[skips,setSkips]=useState(()=>readList('kakeibo_skips_v1'));
  const [tab,setTab]=useState('chat'),[month,setMonth]=useState(currentMonth()),[text,setText]=useState(''),[attachments,setAttachments]=useState([]),[busy,setBusy]=useState(false),[photoBusy,setPhotoBusy]=useState(false),[settings,setSettings]=useState(false),[editor,setEditor]=useState(null),[photo,setPhoto]=useState(null),[toast,setToast]=useState(null);
  const [status,setStatus]=useState({api:false,aiConfigured:false,freeeConfigured:false,loggedIn:false,freeeConnected:false}),[syncing,setSyncing]=useState(false),[syncInfo,setSyncInfo]=useState(()=>readJSON('kakeibo_sync_v1',{}));
  const list=useRef(),cameraInput=useRef(),galleryInput=useRef(),syncLock=useRef(false),messageRef=useRef(messages),recordsRef=useRef(records),toastTimer=useRef();
  recordsRef.current=records;messageRef.current=messages;
  const notify=(message,undo)=>{clearTimeout(toastTimer.current);setToast({message,undo});toastTimer.current=setTimeout(()=>setToast(null),undo?10000:6500);};
  const persist=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{notify('保存容量が不足しています。設定からバックアップしてください。');return false;}};
  const snapshot=()=>{if(!localStorage.getItem('kakeibo_before_chat_v1'))localStorage.setItem('kakeibo_before_chat_v1',JSON.stringify({records:localStorage.getItem('kakeibo_records'),categories:localStorage.getItem('kakeibo_categories'),savedAt:new Date().toISOString()}));};
  function commit(next) {if(storageError){notify(storageError);return false;}try{snapshot();if(!persist('kakeibo_records',next))return false;recordsRef.current=next;setRecords(next);return true;}catch{notify('バックアップを保存できませんでした。記録は変更していません。');return false;}}
  function saveMessages(next){messageRef.current=next;setMessages(next);persist('kakeibo_chat_v1',next);}
  function append(message) {saveMessages([...messageRef.current,{id:crypto.randomUUID(),...message}].slice(-80));}
  const refreshStatus=()=>request('/status').then(setStatus).catch(()=>setStatus({api:false,aiConfigured:false,freeeConfigured:false,loggedIn:false,freeeConnected:false}));
  useEffect(()=>{refreshStatus();const params=new URLSearchParams(location.search);if(params.get('freee')==='connected'){notify('freee請求書を連携しました。');history.replaceState(null,'',location.pathname);}return()=>clearTimeout(toastTimer.current);},[]);
  useEffect(()=>{const onStorage=event=>{
    if(event.key==='kakeibo_records'||event.key==='kakeibo_categories'){try{const next=loadLedger(localStorage);recordsRef.current=next.records;setRecords(next.records);setCategories(next.categories);}catch{setStorageError('保存済みデータを確認できません。バックアップを保存してください。');}}
    if(event.key==='kakeibo_chat_v1'){const next=readList(event.key);messageRef.current=next;setMessages(next);}
    if(event.key==='kakeibo_recurring_v1')setTemplates(readList(event.key));
    if(event.key==='kakeibo_skips_v1')setSkips(readList(event.key));
    if(event.key==='kakeibo_sync_v1')setSyncInfo(readJSON(event.key,{}));
  };window.addEventListener('storage',onStorage);return()=>window.removeEventListener('storage',onStorage);},[]);
  useEffect(()=>{if(list.current&&messages.length)list.current.scrollTo({top:list.current.scrollHeight,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});},[messages,busy,tab]);
  useEffect(()=>{if(storageError||month>currentMonth())return;const additions=recurringForMonth(templates,recordsRef.current,month).filter(r=>!skips.includes(r.id));if(additions.length)commit([...additions,...recordsRef.current]);},[month,templates,skips,storageError]);
  async function sync(force=false) {
    if(syncLock.current||!status.freeeConnected||storageError)return;
    if(!force&&Date.now()-new Date(syncInfo[month]||0).getTime()<15*60000)return;
    syncLock.current=true;setSyncing(true);
    try{const data=await request('/freee/invoices?month='+month);const incoming=data.records.map(r=>recordSchema.parse(r));localStorage.setItem('kakeibo_before_freee_sync',JSON.stringify({records:recordsRef.current,savedAt:new Date().toISOString()}));if(commit(mergeFreee(recordsRef.current,incoming,data.month))){const next={...syncInfo,[data.month]:data.syncedAt};setSyncInfo(next);persist('kakeibo_sync_v1',next);if(force)notify(incoming.length+'件の請求書を同期しました。');}}catch(err){notify(err.message);}finally{syncLock.current=false;setSyncing(false);}
  }
  useEffect(()=>{sync();},[month,status.freeeConnected]);
  async function attach(files) {setPhotoBusy(true);try{const selected=Array.from(files||[]);if(attachments.length+selected.length>2)throw new Error('写真は1回に2枚まで添付できます。');const prepared=[];for(const file of selected)prepared.push(await preparePhoto(file));setAttachments(previous=>[...previous,...prepared]);}catch(err){notify(err.message);}finally{setPhotoBusy(false);if(cameraInput.current)cameraInput.current.value='';if(galleryInput.current)galleryInput.current.value='';}}
  const createRecord=(candidate,p,source)=>recordSchema.parse({...candidate,id:crypto.randomUUID(),title:candidate.title||'',memo:candidate.memo||'',source,createdAt:new Date().toISOString(),...(p?{photoId:p.id,imageHash:p.hash}:{})});
  function duplicateNotice(record) {
    if(duplicates(record,recordsRef.current.filter(r=>r.id!==record.targetId)).length)return '同じ内容の記録が見つかりました。二重登録にならないか確認してください。';
    if(record.type==='income'&&!record.invoiceNumber&&recordsRef.current.some(r=>r.source==='freee'&&r.date.slice(0,7)===record.date.slice(0,7)))return 'この月はfreeeの収入が登録されています。freeeに含まれない別の収入か確認してください。';
    return '';
  }
  async function send(value=text) {
    if(busy||photoBusy||(!value.trim()&&!attachments.length)||storageError)return;
    setBusy(true);const photos=[...attachments],userText=value.trim();
    try {
      for(const image of photos)await photoStore('put',image.id,image.data);
      let result,source='ai';
      if(status.aiConfigured&&status.loggedIn)result=await request('/chat',{method:'POST',body:JSON.stringify({text:userText,images:photos.map(p=>p.data),categories:allCategories(categories).map(({id,name,type})=>({id,name,type})),history:messageRef.current.slice(-10).map(m=>({role:m.role,text:(m.text||'').slice(0,6000)})),recentRecords:recordsRef.current.slice(0,30).map(r=>({id:r.id,title:r.title||r.memo||categoryFor(r.categoryId,categories).name,amount:r.amount,date:r.date,type:r.type,categoryId:r.categoryId})),facts:reportFacts(recordsRef.current,currentMonth(),categories)})});
      else if(photos.length)throw new Error('写真の読み取りにはAIの接続が必要です。設定から接続してください。添付写真はそのまま残っています。');
      else {const candidate=parseQuickEntry(userText,categories);result={reply:candidate?'簡単入力で候補を作りました。内容を確認してください。':'AIはまだ接続されていません。「ランチ 1,200円」のように入力すると、確認して記録できます。',records:candidate?[candidate]:[]};source='quick';}
      const recordIds=[],pending=[];let next=[...recordsRef.current];
      for(const [index,candidate] of result.records.entries()) {
        const raw=createRecord(candidate,photos[index]||photos[0],photos.length?(candidate.type==='income'?'screenshot':'receipt'):source);
        const canAuto=source==='ai'&&photos.length===1&&result.records.length===1&&candidate.type!=='income'&&!candidate.targetId&&!candidate.needsConfirmation&&candidate.confidence>=0.92&&candidate.categoryId&&!duplicateNotice(raw);
        if(canAuto){next=[raw,...next];recordIds.push(raw.id);}else pending.push({...raw,targetId:candidate.targetId||null});
      }
      if(recordIds.length&&!commit(next)){pending.push(...next.filter(r=>recordIds.includes(r.id)));recordIds.length=0;}
      append({role:'user',text:userText,photoIds:photos.map(p=>p.id)});setText('');setAttachments([]);
      append({role:'assistant',text:recordIds.length?'レシートの内容を記録しました。区分や金額はいつでも修正できます。':result.reply,recordIds,candidates:pending,source});
    }catch(err){notify(err.message);if(err.status===401)setSettings(true);}finally{setBusy(false);}
  }
  function saveEntry(record,repeat=false) {
    const target=editor?.targetId,existing=editor?.existing;
    if(target&&recordsRef.current.find(r=>r.id===target)?.source==='freee'){notify('freeeの請求書はfreee側で変更してください。');return;}
    const saved={...record,id:target||record.id};
    if(!commit((target||existing)?recordsRef.current.map(r=>r.id===saved.id?saved:r):[saved,...recordsRef.current]))return;
    if(repeat){const template={id:crypto.randomUUID(),type:saved.type,categoryId:saved.categoryId,amount:saved.amount,title:saved.title,memo:saved.memo,day:Number(saved.date.slice(-2)),startMonth:saved.date.slice(0,7)};const next=[...templates,template];if(persist('kakeibo_recurring_v1',next)){setTemplates(next);commit(recordsRef.current.map(r=>r.id===saved.id?{...r,recurringId:template.id}:r));}}
    if(editor?.messageId)saveMessages(messageRef.current.map(m=>m.id===editor.messageId?{...m,text:(m.candidates||[]).length===1?(target?'内容を修正しました。':'この内容で記録しました。'):m.text,candidates:(m.candidates||[]).filter(c=>c.id!==(editor.candidateId||record.id)),recordIds:[...new Set([...(m.recordIds||[]),saved.id])]}:m));
    setEditor(null);notify(existing||target?'記録を修正しました。':'記録しました。');
  }
  function deleteRecord(record) {
    if(!commit(recordsRef.current.filter(r=>r.id!==record.id)))return;
    if(record.recurringId){const next=[...skips,'recurring:'+record.recurringId+':'+record.date.slice(0,7)];setSkips(next);persist('kakeibo_skips_v1',next);}
    setEditor(null);notify('記録を取り消しました。',()=>{if(commit([record,...recordsRef.current.filter(r=>r.id!==record.id)])){const next=skips.filter(id=>id!=='recurring:'+record.recurringId+':'+record.date.slice(0,7));setSkips(next);persist('kakeibo_skips_v1',next);setToast(null);}});
  }
  async function showPhoto(id){try{const src=await photoStore('get',id);if(src)setPhoto(src);else notify('このブラウザに写真が見つかりません。');}catch(err){notify(err.message);}}
  const openCandidate=(candidate,messageId)=>{const target=candidate.targetId?records.find(r=>r.id===candidate.targetId):null;setEditor({...candidate,...(target?{id:target.id,source:target.source}:{}),candidateId:candidate.id,targetId:candidate.targetId,messageId,existing:Boolean(target),warning:duplicateNotice(candidate)});};
  const changeTab=value=>{setTab(value);if(value==='report')window.scrollTo({top:0});};
  const mini=summarize(records,currentMonth());
  return <div className={'app-shell '+(tab==='chat'?'chat-shell':'')}>
    <div className="app-backdrop" aria-hidden="true" style={{backgroundImage:`url("${appearance.image}")`}}/><div className="background-scrim" aria-hidden="true" style={{opacity:appearance.dim/100}}/>
    <header className="app-header"><button className="brand" onClick={()=>changeTab('chat')} aria-label="家計簿のホームへ">kakeibo<span>✦</span></button><div className="header-actions"><span className={'connection-dot '+(status.aiConfigured&&status.loggedIn?'connected':'')}>{status.aiConfigured&&status.loggedIn?'AIと連携中':'かんたん入力'}</span><button className="icon-button settings-button" aria-label="接続と設定" onClick={()=>setSettings(true)}><Settings size={20}/></button></div></header>
    {storageError&&<div className="storage-error" role="alert">{storageError}</div>}
    {tab==='chat'?<main className="chat-page"><div className="chat-topline"><span>{monthLabel(currentMonth())}</span><button onClick={()=>changeTab('report')}>支出 <b>{money(mini.expense)}</b><ChevronRight size={14}/></button></div><div className="conversation" ref={list} role="log" aria-label="家計簿との会話" aria-live="polite">
      {!messages.length&&<div className="welcome"><div className="welcome-star"><Sparkles size={31} strokeWidth={1.4}/></div><p className="welcome-kicker">毎日の記録を、もっと軽く。</p><h1><span>おかえりなさい。</span><br/>今日は何を記録しますか？</h1><p>レシートを撮る。ひとこと話す。<br/>あとは、家計簿におまかせ。</p><div className="suggestions"><button onClick={()=>setText('ランチ 1,200円')}><Plus size={16}/>ランチを記録</button><button onClick={()=>setEditor({type:'variable',amount:'',date:today(),source:'manual'})}><Pencil size={16}/>金額を入力</button><button onClick={()=>changeTab('report')}><ChartNoAxesCombined size={16}/>今月のレポート</button></div></div>}
      {messages.map(message=><article key={message.id} className={'message message-'+message.role}>{message.role==='assistant'&&<div className="assistant-label"><Sparkles size={15}/>kakeibo{message.source==='quick'&&<small>かんたん入力</small>}</div>}{message.photoIds?.length>0&&<div className="message-photos">{message.photoIds.map(id=><SavedPhoto key={id} id={id} onClick={setPhoto}/>)}</div>}{message.text&&<p className="message-text">{message.text}</p>}{message.recordIds?.map(id=>{const record=records.find(r=>r.id===id);return record?<RecordCard key={id} record={record} categories={categories} onEdit={r=>setEditor({...r,existing:true})} onDelete={deleteRecord} onPhoto={showPhoto}/>:<small key={id} className="muted">この記録は取り消されています</small>;})}{message.candidates?.map(candidate=><div className="candidate" key={candidate.id}><div><small>{candidate.targetId?'修正する内容':'確認して登録'}</small><strong>{candidate.title} <b>{money(candidate.amount)}</b></strong><span>{candidate.date} · {categoryFor(candidate.categoryId,categories).name}</span></div><button className="secondary-button" onClick={()=>openCandidate(candidate,message.id)}><Pencil size={15}/>確認</button></div>)}</article>)}
      {busy&&<div className="thinking"><Sparkles size={16}/><span>内容を確認しています</span><LoaderCircle size={15} className="spin"/></div>}
    </div><div className="composer-wrap"><div className="camera-row"><button className="manual-shortcut" onClick={()=>setEditor({type:'variable',amount:'',date:today(),source:'manual'})}><Pencil size={15}/>手入力</button><button className="camera-button" aria-label="カメラでレシートを撮影" onClick={()=>cameraInput.current.click()} disabled={busy||photoBusy}><Camera size={27} strokeWidth={1.7}/><span>撮影する</span></button></div>{attachments.length>0&&<div className="attachment-tray">{attachments.map(p=><div key={p.id}><img src={p.data} alt="送信する写真"/><button aria-label="添付写真を外す" onClick={()=>setAttachments(prev=>prev.filter(a=>a.id!==p.id))}><X size={15}/></button></div>)}<small>送信するとAIが内容を読み取ります</small></div>}<form className="composer" onSubmit={e=>{e.preventDefault();send();}}><button className="icon-button" type="button" aria-label="写真・スクリーンショットを添付" onClick={()=>galleryInput.current.click()} disabled={busy||photoBusy}><Plus size={23}/></button><textarea value={text} onChange={e=>setText(e.target.value)} placeholder="金額を入力、またはAIに相談" aria-label="メッセージ" rows="1" maxLength="6000" onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();send();}}}/><button className="send-button" type="submit" aria-label="メッセージを送信" disabled={busy||photoBusy||(!text.trim()&&!attachments.length)}>{busy||photoBusy?<LoaderCircle size={20} className="spin"/>:<ArrowUp size={21}/>}</button></form><p className="composer-note">{status.aiConfigured&&status.loggedIn?'写真と会話は読み取りのためOpenAIへ送信されます':'AI未接続でも、文字と手入力で記録できます'}</p></div></main>:<main><Suspense fallback={<p className="empty-text">レポートを読み込んでいます</p>}><Report records={records} categories={categories} month={month} setMonth={setMonth} onEdit={r=>setEditor({...r,existing:true})} onDelete={deleteRecord} onPhoto={showPhoto} onDiscuss={value=>{setTab('chat');setText(value);}} status={status} sync={sync} syncing={syncing} lastSync={syncInfo[month]}/></Suspense></main>}
    <nav className="bottom-nav" aria-label="メインナビゲーション"><button aria-current={tab==='chat'?'page':undefined} onClick={()=>changeTab('chat')}><MessageCircle size={21}/><span>チャット</span></button><button aria-current={tab==='report'?'page':undefined} onClick={()=>changeTab('report')}><ChartNoAxesCombined size={21}/><span>レポート</span></button></nav>
    <input hidden ref={cameraInput} type="file" accept="image/*" capture="environment" onChange={e=>attach(e.target.files)}/><input hidden ref={galleryInput} type="file" accept="image/*" multiple onChange={e=>attach(e.target.files)}/>
    {toast&&<div className="toast" role="status"><span>{toast.message}</span>{toast.undo&&<button onClick={toast.undo}>元に戻す</button>}<button aria-label="通知を閉じる" onClick={()=>setToast(null)}><X size={16}/></button></div>}
    {editor&&<EntryEditor initial={editor} categories={categories} existing={editor.existing} duplicateWarning={editor.warning} onClose={()=>setEditor(null)} onSave={saveEntry} onDelete={deleteRecord}/>}
    {photo&&<Modal title="添付した写真" onClose={()=>setPhoto(null)} wide><img className="photo-full" src={photo} alt="記録に添付した写真"/></Modal>}
    {settings&&<SettingsPanel appearance={appearance} status={status} refreshStatus={refreshStatus} records={records} categories={categories} templates={templates} skips={skips} messages={messages} persist={persist} notify={notify} storageError={storageError} onClose={()=>setSettings(false)} onCategories={setCategories} onTemplates={setTemplates} onRestore={data=>{setStorageError('');recordsRef.current=data.records;setRecords(data.records);setCategories(data.categories);setTemplates(data.recurring);setSkips(data.skips);saveMessages([]);setSyncInfo({});persist('kakeibo_sync_v1',{});}}/>}
  </div>;
}
