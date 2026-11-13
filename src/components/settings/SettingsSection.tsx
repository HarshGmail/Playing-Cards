import type { ReactNode } from 'react';

interface SettingsSectionProps {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}

export default function SettingsSection({ id, title, description, children }: SettingsSectionProps) {
  return (
    <section aria-labelledby={id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 space-y-4">
      <header className="space-y-1">
        <h2 id={id} className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
      </header>
      {children}
    </section>
  );
}
