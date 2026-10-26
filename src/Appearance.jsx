import { useEffect, useRef, useState } from 'react';
import { ImagePlus, RotateCcw, Sun, LoaderCircle } from 'lucide-react';
import { photoStore, preparePhoto } from './lib/photos.js';
import { readJSON } from './lib/client.js';

const STORAGE_KEY = 'kakeibo_appearance_v1';
const DEFAULT_BACKGROUND = '/backgrounds/watercolor.jpeg';
const DEFAULT_DIM = 28;

function preferences(value) {
  return {
    backgroundId: /^background:[\w-]{1,100}$/.test(value?.backgroundId || '') ? value.backgroundId : null,
    dim: typeof value?.dim === 'number' && Number.isFinite(value.dim) ? Math.max(0, Math.min(65, value.dim)) : DEFAULT_DIM,
  };
}

export function useAppearance() {
  const [settings, setSettings] = useState(() => preferences(readJSON(STORAGE_KEY, null)));
  const [image, setImage] = useState(DEFAULT_BACKGROUND);

  useEffect(() => {
    let current = true;
    if (!settings.backgroundId) setImage(DEFAULT_BACKGROUND);
    else photoStore('get', settings.backgroundId).then(data => {
      if (current) setImage(typeof data === 'string' && data.startsWith('data:image/') ? data : DEFAULT_BACKGROUND);
    }).catch(() => { if (current) setImage(DEFAULT_BACKGROUND); });
    return () => { current = false; };
  }, [settings.backgroundId]);

  useEffect(() => {
    const update = event => {
      if (event.key === STORAGE_KEY || event.key === null) setSettings(preferences(readJSON(STORAGE_KEY, null)));
    };
    window.addEventListener('storage', update);
    return () => window.removeEventListener('storage', update);
  }, []);

  function save(next) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); }
    catch { throw new Error('背景の設定を保存できませんでした。ブラウザの保存容量を確認してください。'); }
    setSettings(next);
  }

  async function changeImage(file) {
    const photo = await preparePhoto(file);
    const backgroundId = 'background:' + photo.id;
    await photoStore('put', backgroundId, photo.data);
    try { save({ ...settings, backgroundId }); }
    catch (error) { await photoStore('delete', backgroundId).catch(() => {}); throw error; }
    setImage(photo.data);
    if (settings.backgroundId) photoStore('delete', settings.backgroundId).catch(() => {});
  }

  function reset() {
    save({ backgroundId: null, dim: DEFAULT_DIM });
    setImage(DEFAULT_BACKGROUND);
    if (settings.backgroundId) photoStore('delete', settings.backgroundId).catch(() => {});
  }

  return { ...settings, image, changeImage, reset, changeDim: dim => save({ ...settings, dim }) };
}

export default function AppearanceSettings({ appearance, notify }) {
  const fileInput = useRef();
  const [busy, setBusy] = useState(false);
  async function selectImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try { await appearance.changeImage(file); notify('背景画像を変更しました。'); }
    catch (error) { notify(error.message); }
    finally { setBusy(false); if (fileInput.current) fileInput.current.value = ''; }
  }

  return <section className="appearance-settings">
    <h3>自分らしい背景に</h3>
    <div className="background-preview" style={{ backgroundImage: `linear-gradient(rgb(22 32 35 / ${appearance.dim / 100}), rgb(22 32 35 / ${appearance.dim / 100})), url("${appearance.image}")` }}>
      <span className="preview-glass"><span>kakeibo ✦</span><small>毎日の記録を、もっと軽く。</small></span>
    </div>
    <div className="background-actions">
      <button className="secondary-button" disabled={busy} onClick={() => fileInput.current.click()}>{busy ? <LoaderCircle size={16} className="spin"/> : <ImagePlus size={16}/>}画像を変更</button>
      <button className="text-button small" disabled={busy || (!appearance.backgroundId && appearance.dim === DEFAULT_DIM)} onClick={() => {
        try { appearance.reset(); notify('最初の背景に戻しました。'); } catch (error) { notify(error.message); }
      }}><RotateCcw size={14}/>最初の背景に戻す</button>
    </div>
    <input ref={fileInput} type="file" accept="image/*" hidden onChange={selectImage}/>
    <label className="background-dim"><span><Sun size={15}/>背景の暗さ <output>{appearance.dim}%</output></span><input type="range" min="0" max="65" step="1" value={appearance.dim} aria-label="背景の暗さ" disabled={busy} onChange={event => {
      try { appearance.changeDim(Number(event.target.value)); } catch (error) { notify(error.message); }
    }}/></label>
    <p className="muted small">好きな写真や画像を選べます。背景の設定はこのブラウザに保存され、AIには送信されません。</p>
  </section>;
}
