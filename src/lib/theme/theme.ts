export type ThemeChoice = 'system' | 'light' | 'dark';

export type ResolvedTheme = 'light' | 'dark';

export const THEME_CHOICES: readonly ThemeChoice[] = ['system', 'light', 'dark'];

export const THEME_STORAGE_KEY = 'theme';

export const DEFAULT_THEME_CHOICE: ThemeChoice = 'dark';

export const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return typeof value === 'string' && (THEME_CHOICES as readonly string[]).includes(value);
}

export function parseThemeChoice(value: unknown): ThemeChoice {
  return isThemeChoice(value) ? value : DEFAULT_THEME_CHOICE;
}

export function resolveTheme(choice: ThemeChoice, systemPrefersDark: boolean): ResolvedTheme {
  if (choice === 'system') return systemPrefersDark ? 'dark' : 'light';
  return choice;
}

export function readStoredThemeChoice(): ThemeChoice {
  try {
    return parseThemeChoice(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME_CHOICE;
  }
}

export function writeStoredThemeChoice(choice: ThemeChoice): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    return;
  }
}

function systemPrefersDark(): boolean {
  return window.matchMedia(DARK_SCHEME_QUERY).matches;
}

export function applyThemeChoice(choice: ThemeChoice): void {
  const isDark = resolveTheme(choice, systemPrefersDark()) === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
}

export function subscribeToSystemTheme(onChange: () => void): () => void {
  const query = window.matchMedia(DARK_SCHEME_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

export const THEME_INIT_SCRIPT = `(function () {
  try {
    var choice = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    var prefersDark = window.matchMedia(${JSON.stringify(DARK_SCHEME_QUERY)}).matches;
    var isDark = choice === 'light' ? false : choice === 'system' ? prefersDark : true;
    document.documentElement.classList.toggle('dark', isDark);
  } catch {}
})();`;
