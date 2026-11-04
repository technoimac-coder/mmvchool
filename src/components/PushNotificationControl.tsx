'use client';

import React, { useEffect, useState } from 'react';
import { BellRing, BellOff } from 'lucide-react';
import { pushNotificationsApi } from '../lib/api';

function decodeKey(value: string): Uint8Array<ArrayBuffer> {
  const padded = value + '='.repeat((4 - value.length % 4) % 4);
  const binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  const output = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index++) output[index] = binary.charCodeAt(index);
  return output;
}

export const PushNotificationControl: React.FC<{ onChange?: (enabled: boolean) => void }> = ({ onChange }) => {
  const [supported, setSupported] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        if (!cancelled) { setSupported(false); setBusy(false); }
        return;
      }
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        const subscription = await registration.pushManager.getSubscription();
        if (subscription && Notification.permission === 'granted') {
          const status = await pushNotificationsApi.status();
          if (!status.subscribed) await pushNotificationsApi.subscribe(subscription.toJSON());
        }
        if (!cancelled) setEnabled(Boolean(subscription) && Notification.permission === 'granted');
      } catch { if (!cancelled) setSupported(false); }
      finally { if (!cancelled) setBusy(false); }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const toggle = async () => {
    setBusy(true); setMessage('');
    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        await pushNotificationsApi.unsubscribe(existing.endpoint);
        await existing.unsubscribe();
        setEnabled(false); onChange?.(false); setMessage('ปิด Push บนอุปกรณ์นี้แล้ว');
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('กรุณาอนุญาตการแจ้งเตือนในเบราว์เซอร์');
      const status = await pushNotificationsApi.status();
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeKey(status.publicKey) });
      await pushNotificationsApi.subscribe(subscription.toJSON());
      setEnabled(true); onChange?.(true); setMessage('เปิด Push Notification สำเร็จ');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'เปิด Push Notification ไม่สำเร็จ');
    } finally { setBusy(false); }
  };

  if (!supported) return <p className="m-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">อุปกรณ์นี้ยังไม่รองรับ Push · iPhone/iPad ให้เพิ่มเว็บไว้ที่หน้าจอโฮมก่อน</p>;
  return <div className="m-3 rounded-xl border border-blue-100 bg-blue-50 p-3">
    <button type="button" disabled={busy} onClick={() => void toggle()} className={`flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-60 ${enabled ? 'bg-slate-600' : 'bg-blue-700'}`}>
      {enabled ? <BellOff className="h-4 w-4" /> : <BellRing className="h-4 w-4" />}
      {busy ? 'กำลังตรวจสอบ...' : enabled ? 'ปิด Push บนอุปกรณ์นี้' : 'เปิดรับ Push Notification'}
    </button>
    <p className="mt-2 text-[11px] leading-relaxed text-blue-900">แจ้งเตือนเฉพาะรายการใหม่หลังเปิดใช้งาน ข้อมูลและประวัติเดิมไม่เปลี่ยนแปลง</p>
    {message && <p className="mt-1 text-[11px] font-semibold text-blue-950">{message}</p>}
  </div>;
};
