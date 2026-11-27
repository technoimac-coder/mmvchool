import { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { documentTextPresetsApi, type DocumentTextPreset } from '../lib/api';

export function DocumentTextPresets({ text, onSelect }: { text: string; onSelect: (text: string) => void }) {
  const { t } = useLanguage();
  const [opened, setOpened] = useState(false);
  const [items, setItems] = useState<DocumentTextPreset[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const trimmed = text.trim();

  useEffect(() => {
    if (!opened) return;
    let active = true;
    documentTextPresetsApi.list().then(result => {
      if (active) setItems(result);
    }).catch(() => {
      if (active) setError(t('โหลดข้อความที่บันทึกไว้ไม่สำเร็จ', 'Could not load saved text.'));
    });
    return () => { active = false; };
  }, [opened, t]);

  async function update(input: { action: 'save'; text: string } | { action: 'delete'; id: string }) {
    if (busy) return;
    setBusy(true);
    setError('');
    setStatus('');
    try {
      setItems(await documentTextPresetsApi.update(input));
      setStatus(input.action === 'save' ? t('บันทึกข้อความแล้ว', 'Text saved.') : t('ลบข้อความแล้ว', 'Text removed.'));
    } catch {
      setError(t('แก้ไขรายการข้อความไม่สำเร็จ กรุณาลองใหม่', 'Could not update saved text. Try again.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <details onToggle={event => { setOpened(event.currentTarget.open); setError(''); }} className="rounded-lg border border-indigo-100 bg-white p-2 text-xs">
      <summary className="cursor-pointer font-semibold text-indigo-800">{t('ข้อความที่ใช้บ่อยของฉัน', 'My frequently used text')}</summary>
      <div className="mt-2 space-y-2">
        <button type="button" disabled={busy || items === null || !trimmed || Array.from(trimmed).length > 500 || items.some(item => item.text === trimmed)}
          className="rounded-lg border border-indigo-200 px-2 py-1.5 font-semibold text-indigo-800 disabled:opacity-50"
          onClick={() => void update({ action: 'save', text: trimmed })}>
          {t('บันทึกไว้ใช้ครั้งหน้า', 'Save for next time')}
        </button>
        {items === null && !error && <p>{t('กำลังโหลด…', 'Loading…')}</p>}
        {items?.length === 0 && <p>{t('ยังไม่มีข้อความที่บันทึกไว้', 'No saved text yet.')}</p>}
        <ul className="max-h-40 space-y-1 overflow-y-auto">
          {items?.map(item => (
            <li key={item.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1">
              <button type="button" className="min-w-0 flex-1 whitespace-pre-wrap break-words py-1 text-left text-indigo-900" onClick={() => onSelect(item.text)}>{item.text}</button>
              <button type="button" disabled={busy} className="shrink-0 px-1 py-1 text-rose-700 disabled:opacity-50"
                aria-label={t(`ลบข้อความ ${item.text}`, `Delete saved text ${item.text}`)}
                onClick={() => void update({ action: 'delete', id: item.id })}>{t('ลบ', 'Delete')}</button>
            </li>
          ))}
        </ul>
        {error && <p role="alert" className="text-rose-700">{error}</p>}
        {status && <p role="status" className="text-emerald-700">{status}</p>}
      </div>
    </details>
  );
}
