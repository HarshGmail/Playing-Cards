'use client';

import AppearanceSettings from '@/components/settings/AppearanceSettings';
import InstallSettings from '@/components/settings/InstallSettings';
import IntegrationsSettings from '@/components/settings/IntegrationsSettings';
import NotificationsSettings from '@/components/settings/NotificationsSettings';
import SettingsSection from '@/components/settings/SettingsSection';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>

        <SettingsSection
          id="settings-integrations"
          title="Integrations"
          description="Connect outside assistants to your Playing Cards account."
        >
          <IntegrationsSettings />
        </SettingsSection>

        <SettingsSection
          id="settings-notifications"
          title="Notifications"
          description="Alerts on this device, even when the app is closed."
        >
          <NotificationsSettings />
        </SettingsSection>

        <SettingsSection
          id="settings-install"
          title="Install app"
          description="Keep Playing Cards on your home screen."
        >
          <InstallSettings />
        </SettingsSection>

        <SettingsSection
          id="settings-appearance"
          title="Appearance"
          description="Follow your device or pick a theme for this browser."
        >
          <AppearanceSettings />
        </SettingsSection>
      </div>
    </div>
  );
}
