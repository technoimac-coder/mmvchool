'use client';

import React, { useEffect, useState } from 'react';
import { BellRing, X } from 'lucide-react';
import { PushNotificationControl } from './PushNotificationControl';

export const PushNotificationPrompt: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (sessionStorage.getItem('mmv_push_prompt_dismissed') === '1') return;
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return;
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        const subscription = await registration.pushManager.getSubscription();
        if (!cancelled && (!subscription || Notification.permission !== 'granted')) setVisible(true);
      } catch { /* The notification menu still shows device-specific guidance. */ }
    };
    void check();
    return () => { cancelled = true; };
  }, []);

  if (!visible) return null;
  const dismiss = () => {
    sessionStorage.setItem('mmv_push_prompt_dismissed', '1');
    setVisible(false);
  };
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]">
    <aside className="relative w-full max-w-md rounded-3xl border border-blue-200 bg-white p-4 shadow-2xl" role="dialog" aria-modal="true" aria-label="เปิดรับ Push Notification">
      <button type="button" onClick={dismiss} className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="ไว้ภายหลัง"><X className="h-5 w-5" /></button>
      <div className="flex gap-3 pr-8">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-800"><BellRing className="h-6 w-6" /></div>
        <div><h2 className="text-base font-extrabold text-slate-900">เปิดรับแจ้งเตือนบนอุปกรณ์นี้</h2><p className="mt-1 text-xs leading-relaxed text-slate-600">รับแจ้งเตือนงานโรงเรียนได้โดยไม่ใช้โควต้า LINE</p></div>
      </div>
      <PushNotificationControl onChange={enabled => { if (enabled) dismiss(); }} />
    </aside>
  </div>;
};
