import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  DEFAULT_THEME_CHOICE,
  THEME_INIT_SCRIPT,
  THEME_STORAGE_KEY,
  parseThemeChoice,
  resolveTheme,
} from './theme';

describe('resolveTheme', () => {
  it('uses the explicit choice regardless of the system setting', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('light', false)).toBe('light');
    expect(resolveTheme('dark', true)).toBe('dark');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('follows the system setting when the choice is system', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });
});

describe('parseThemeChoice', () => {
  it('accepts the three choices', () => {
    expect(parseThemeChoice('system')).toBe('system');
    expect(parseThemeChoice('light')).toBe('light');
    expect(parseThemeChoice('dark')).toBe('dark');
  });

  it('falls back to the default for anything else', () => {
    expect(parseThemeChoice(null)).toBe(DEFAULT_THEME_CHOICE);
    expect(parseThemeChoice('sepia')).toBe(DEFAULT_THEME_CHOICE);
  });
});

describe('THEME_INIT_SCRIPT', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function runInitScript(stored: string | null, systemPrefersDark: boolean): boolean | undefined {
    const toggle = vi.fn();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => (key === THEME_STORAGE_KEY ? stored : null),
    });
    vi.stubGlobal('window', { matchMedia: () => ({ matches: systemPrefersDark }) });
    vi.stubGlobal('document', { documentElement: { classList: { toggle } } });
    new Function(THEME_INIT_SCRIPT)();
    return toggle.mock.calls[0]?.[1];
  }

  it('paints dark when the choice is dark', () => {
    expect(runInitScript('dark', false)).toBe(true);
  });

  it('paints light when the choice is light', () => {
    expect(runInitScript('light', true)).toBe(false);
  });

  it('follows the system when the choice is system', () => {
    expect(runInitScript('system', true)).toBe(true);
    expect(runInitScript('system', false)).toBe(false);
  });

  it('paints dark when nothing is stored', () => {
    expect(runInitScript(null, false)).toBe(true);
  });
});
