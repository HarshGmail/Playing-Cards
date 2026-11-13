'use client';

import { useEffect, useState } from 'react';
import { Check, Download } from 'lucide-react';
import { useInstallPrompt } from '@/components/pwa/useInstallPrompt';
import { PRIMARY_BUTTON_CLASS } from '@/components/pwa/pwaClasses';
import { isIosDevice, readPlatformSnapshot } from '@/lib/push/platform';

const MUTED_TEXT = 'text-sm text-gray-600 dark:text-gray-400';

interface InstallPlatform {
  standalone: boolean;
  ios: boolean;
}

export default function InstallSettings() {
  const { canInstall, install } = useInstallPrompt();
  const [platform, setPlatform] = useState<InstallPlatform | null>(null);

  useEffect(() => {
    const snapshot = readPlatformSnapshot();
    setPlatform({ standalone: snapshot.isStandalone, ios: isIosDevice(snapshot) });
    const markInstalled = () => setPlatform({ standalone: true, ios: false });
    window.addEventListener('appinstalled', markInstalled);
    return () => window.removeEventListener('appinstalled', markInstalled);
  }, []);

  if (!platform) return null;

  if (platform.standalone) {
    return (
      <p className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
        <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
        Installed. You are running Playing Cards from your home screen.
      </p>
    );
  }

  if (canInstall) {
    return (
      <div className="space-y-3">
        <p className={MUTED_TEXT}>Add Playing Cards to your device for quicker access and a full-screen view.</p>
        <button type="button" onClick={install} className={PRIMARY_BUTTON_CLASS}>
          <Download className="w-4 h-4" />
          Install app
        </button>
      </div>
    );
  }

  if (platform.ios) {
    return (
      <div className="space-y-2">
        <p className={MUTED_TEXT}>To install on iPhone or iPad:</p>
        <ol className="text-sm text-gray-700 dark:text-gray-200 space-y-1 list-decimal list-inside">
          <li>Tap Share in Safari</li>
          <li>Choose Add to Home Screen</li>
          <li>Open the app from your Home Screen and enable notifications</li>
        </ol>
      </div>
    );
  }

  return <p className={MUTED_TEXT}>Open this site in Chrome or Edge and use the browser menu to install it.</p>;
}
