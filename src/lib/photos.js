function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('kakeibo-photos', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('photos');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('写真を保存できませんでした。ブラウザの保存容量を確認してください。'));
  });
}
export async function photoStore(action, id, value) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('photos', action === 'get' ? 'readonly' : 'readwrite');
    const store = transaction.objectStore('photos');
    const request = action === 'get' ? store.get(id) : action === 'delete' ? store.delete(id) : store.put(value, id);
    transaction.oncomplete = () => { resolve(request.result); db.close(); };
    transaction.onerror = () => { reject(new Error('写真を保存できませんでした。')); db.close(); };
  });
}
export async function preparePhoto(file) {
  if (!file.type.startsWith('image/')) throw new Error('画像ファイルを選んでください。');
  if (file.size > 25 * 1024 * 1024) throw new Error('25MB以下の写真を選んでください。');
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error('この画像は読み込めません。JPEGまたはPNGで添付してください。'); });
  const ratio = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas'); canvas.width = Math.round(bitmap.width * ratio); canvas.height = Math.round(bitmap.height * ratio);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  const data = canvas.toDataURL('image/jpeg', 0.82);
  if (data.length > 1500000) throw new Error('画像が大きすぎます。近づいて撮り直してください。');
  const hashBytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return { id: crypto.randomUUID(), data, hash: Array.from(new Uint8Array(hashBytes)).map(byte => byte.toString(16).padStart(2,'0')).join('') };
}
