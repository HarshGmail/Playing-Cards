'use client';

import { useEffect } from 'react';

const SERVICE_WORKER_URL = '/sw.js';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register(SERVICE_WORKER_URL).catch((err) => {
      console.warn('Service worker registration failed', err);
    });
  }, []);

  return null;
}
