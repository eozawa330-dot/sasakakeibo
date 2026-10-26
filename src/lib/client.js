export async function request(path, options = {}) {
  const perform = async () => {
    const response = await fetch('/api' + path, { credentials: 'same-origin', ...options, headers: { 'Content-Type':'application/json', 'X-Kakeibo-Client':'1', ...options.headers } });
    let data; try { data = await response.json(); } catch { throw new Error('接続設定を確認してください。文字での簡単入力は利用できます。'); }
    if (!response.ok) { const error = new Error(data.error || '接続できませんでした。'); error.status=response.status; throw error; }
    return data;
  };
  return path.startsWith('/freee/invoices') && navigator.locks ? navigator.locks.request('kakeibo-freee-sync',perform) : perform();
}
export const readJSON = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
export function downloadJSON(value, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
  const anchor=document.createElement('a'); anchor.href=url; anchor.download=filename; anchor.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
