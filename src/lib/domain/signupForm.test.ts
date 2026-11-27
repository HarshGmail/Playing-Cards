import { describe, it, expect } from 'vitest';
import {
  buildDob,
  daysInMonth,
  dobPartsOf,
  emailError,
  passwordChecks,
  passwordIsStrongEnough,
  phoneError,
  phoneKeystroke,
  suggestUsername,
  usernameAlternatives,
  usernameFormatError,
  usernameKeystroke,
} from './signupForm';

describe('usernameKeystroke', () => {
  it('rejects a space and keeps what was typed before it', () => {
    expect(usernameKeystroke('john doe')).toEqual({
      value: 'johndoe',
      rejection: "Spaces aren't allowed in usernames",
    });
  });

  it('drops other symbols and explains why', () => {
    expect(usernameKeystroke('ja$on')).toEqual({
      value: 'jaon',
      rejection: 'Only letters, numbers and _ are allowed',
    });
  });

  it('lowercases silently', () => {
    expect(usernameKeystroke('JohnDoe')).toEqual({ value: 'johndoe', rejection: null });
  });

  it('caps the length and says so', () => {
    const result = usernameKeystroke('a'.repeat(25));
    expect(result.value).toHaveLength(20);
    expect(result.rejection).toMatch(/up to 20/);
  });
});

describe('usernameFormatError', () => {
  it('asks for a name when empty and enforces the minimum length', () => {
    expect(usernameFormatError('')).toBe('Pick a username');
    expect(usernameFormatError('ab')).toBe('At least 3 characters');
    expect(usernameFormatError('abc')).toBeNull();
  });
});

describe('suggestUsername', () => {
  it('builds a username from a full name', () => {
    expect(suggestUsername('John Doe')).toBe('john_doe');
  });

  it('strips accents, punctuation and extra spaces', () => {
    expect(suggestUsername('  Zoë   O\'Brien-Smith ')).toBe('zoe_o_brien_smith');
  });

  it('returns nothing usable for names too short to form a username', () => {
    expect(suggestUsername('A')).toBe('');
    expect(suggestUsername('ОЛЯ')).toBe('');
  });
});

describe('usernameAlternatives', () => {
  it('offers short variants that are valid and different from the base', () => {
    const alternatives = usernameAlternatives('john_doe');
    expect(alternatives.length).toBeGreaterThan(0);
    expect(alternatives).not.toContain('john_doe');
    alternatives.forEach((candidate) => expect(usernameFormatError(candidate)).toBeNull());
  });

  it('returns none for an empty base', () => {
    expect(usernameAlternatives('')).toEqual([]);
  });
});

describe('date of birth', () => {
  it('knows February length in leap and common years', () => {
    expect(daysInMonth(2, 2024)).toBe(29);
    expect(daysInMonth(2, 2023)).toBe(28);
    expect(daysInMonth(4, 2023)).toBe(30);
  });

  it('builds YYYY-MM-DD from dropdown values', () => {
    expect(buildDob({ day: '5', month: '3', year: '1999' })).toBe('1999-03-05');
  });

  it('refuses a day that does not exist in that month', () => {
    expect(buildDob({ day: '31', month: '4', year: '2000' })).toBe('');
    expect(buildDob({ day: '29', month: '2', year: '2023' })).toBe('');
  });

  it('is empty until every part is picked', () => {
    expect(buildDob({ day: '', month: '3', year: '1999' })).toBe('');
  });

  it('splits a stored date back into dropdown values', () => {
    expect(dobPartsOf('1999-03-05')).toEqual({ day: '5', month: '3', year: '1999' });
    expect(dobPartsOf('')).toEqual({ day: '', month: '', year: '' });
  });
});

describe('phone and email', () => {
  it('keeps only digits and a leading plus', () => {
    expect(phoneKeystroke('+91 98-765 43210')).toBe('+919876543210');
    expect(phoneKeystroke('98a7')).toBe('987');
  });

  it('asks for at least ten digits', () => {
    expect(phoneError('')).toBe('Enter your phone number');
    expect(phoneError('12345')).toBe('Enter at least 10 digits');
    expect(phoneError('+919876543210')).toBeNull();
  });

  it('checks the email shape', () => {
    expect(emailError('')).toBe('Enter your email');
    expect(emailError('a@b')).toBe('Enter a valid email');
    expect(emailError('a@b.co')).toBeNull();
  });
});

describe('password checks', () => {
  it('reports each rule separately', () => {
    expect(passwordChecks('abc').map((c) => c.passed)).toEqual([false, false, false]);
    expect(passwordChecks('abcdef1!').map((c) => c.passed)).toEqual([true, true, true]);
  });

  it('is strong enough only when every rule passes', () => {
    expect(passwordIsStrongEnough('abcdefg1')).toBe(false);
    expect(passwordIsStrongEnough('abcdefg1!')).toBe(true);
  });
});
