export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
export const DOB_OLDEST_YEAR = 1920;

const USERNAME_CHARACTER = /^[a-z0-9_]$/;
const WHITESPACE = /\s/;
const DIACRITICS = /[̀-ͯ]/g;
const NON_USERNAME_RUN = /[^a-z0-9]+/g;
const EDGE_UNDERSCORES = /^_+|_+$/g;

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export interface UsernameKeystroke {
  value: string;
  rejection: string | null;
}

export function usernameKeystroke(raw: string): UsernameKeystroke {
  const lowered = raw.toLowerCase();
  const kept = Array.from(lowered).filter((char) => USERNAME_CHARACTER.test(char)).join('');
  const hadSpace = WHITESPACE.test(raw);
  const hadOther = kept.length !== lowered.replace(WHITESPACE, '').length;
  const capped = kept.slice(0, USERNAME_MAX_LENGTH);
  const tooLong = kept.length > USERNAME_MAX_LENGTH;

  if (hadSpace) return { value: capped, rejection: "Spaces aren't allowed in usernames" };
  if (hadOther) return { value: capped, rejection: 'Only letters, numbers and _ are allowed' };
  if (tooLong) return { value: capped, rejection: `Usernames can be up to ${USERNAME_MAX_LENGTH} characters` };
  return { value: capped, rejection: null };
}

export function usernameFormatError(value: string): string | null {
  if (value.length === 0) return 'Pick a username';
  if (value.length < USERNAME_MIN_LENGTH) return `At least ${USERNAME_MIN_LENGTH} characters`;
  if (value.length > USERNAME_MAX_LENGTH) return `Up to ${USERNAME_MAX_LENGTH} characters`;
  if (!/^[a-z0-9_]+$/.test(value)) return 'Only letters, numbers and _ are allowed';
  return null;
}

export function suggestUsername(name: string): string {
  const base = name
    .normalize('NFKD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .replace(NON_USERNAME_RUN, '_')
    .replace(EDGE_UNDERSCORES, '')
    .slice(0, USERNAME_MAX_LENGTH)
    .replace(EDGE_UNDERSCORES, '');
  return usernameFormatError(base) === null ? base : '';
}

export function usernameAlternatives(base: string): string[] {
  if (!base) return [];
  const candidates = [
    base.replace(/_/g, ''),
    `${base}1`,
    `${base}_1`,
    `${base}2`,
    `${base}_2`,
    `${base}_${new Date().getFullYear() % 100}`,
  ];
  return Array.from(new Set(candidates))
    .filter((candidate) => candidate !== base && usernameFormatError(candidate) === null)
    .slice(0, 3);
}

export function daysInMonth(month: number, year: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export interface DobParts {
  day: string;
  month: string;
  year: string;
}

export function buildDob({ day, month, year }: DobParts): string {
  if (!day || !month || !year) return '';
  const dayNumber = Number(day);
  const monthNumber = Number(month);
  const yearNumber = Number(year);
  if (dayNumber > daysInMonth(monthNumber, yearNumber)) return '';
  return [
    String(yearNumber).padStart(4, '0'),
    String(monthNumber).padStart(2, '0'),
    String(dayNumber).padStart(2, '0'),
  ].join('-');
}

export function dobPartsOf(dob: string): DobParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (!match) return { day: '', month: '', year: '' };
  return { year: match[1], month: String(Number(match[2])), day: String(Number(match[3])) };
}

export function phoneKeystroke(raw: string): string {
  const leadingPlus = raw.trimStart().startsWith('+') ? '+' : '';
  return leadingPlus + raw.replace(/\D/g, '');
}

export function phoneError(value: string): string | null {
  if (!value) return 'Enter your phone number';
  return /^\+?[0-9]{10,}$/.test(value) ? null : 'Enter at least 10 digits';
}

export function emailError(value: string): string | null {
  if (!value) return 'Enter your email';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Enter a valid email';
}

export interface PasswordCheck {
  label: string;
  passed: boolean;
}

export function passwordChecks(password: string): PasswordCheck[] {
  return [
    { label: '8+ characters', passed: password.length >= 8 },
    { label: 'A number', passed: /[0-9]/.test(password) },
    { label: 'A symbol (!@#$%^&*)', passed: /[!@#$%^&*]/.test(password) },
  ];
}

export function passwordIsStrongEnough(password: string): boolean {
  return passwordChecks(password).every((check) => check.passed);
}

export type UsernameAvailabilityState = 'idle' | 'checking' | 'available' | 'taken' | 'unknown';

export interface SignupDraft {
  name: string;
  username: string;
  email: string;
  phone: string;
  dobParts: DobParts;
  password: string;
  confirmPassword: string;
}

export interface SignupPayload {
  name: string;
  username: string;
  email: string;
  phone: string;
  dob: string;
  password: string;
}

export type SignupField = 'name' | 'username' | 'email' | 'phone' | 'dob' | 'password' | 'confirmPassword';

export type SignupProblems = Record<SignupField, string | null>;

export function signupPayload(draft: SignupDraft): SignupPayload {
  return {
    name: draft.name.trim(),
    username: draft.username,
    email: draft.email.trim(),
    phone: draft.phone,
    dob: buildDob(draft.dobParts),
    password: draft.password,
  };
}

export function signupProblems(
  draft: SignupDraft,
  availability: UsernameAvailabilityState,
  acceptsField: (field: keyof SignupPayload, value: string) => boolean
): SignupProblems {
  const payload = signupPayload(draft);
  const rejected = (field: keyof SignupPayload) => !acceptsField(field, payload[field]);

  return {
    name: rejected('name') ? 'Enter your name' : null,
    username:
      usernameFormatError(payload.username) ??
      (rejected('username') ? 'Only letters, numbers and _ are allowed' : null) ??
      (availability === 'taken' ? 'That username is taken' : null),
    email: rejected('email') ? emailError(payload.email) ?? 'Enter a valid email' : null,
    phone: rejected('phone') ? phoneError(payload.phone) ?? 'Enter a valid phone number' : null,
    dob: rejected('dob') ? 'Pick your date of birth' : null,
    password: rejected('password') ? 'Password needs all three checks' : null,
    confirmPassword: draft.confirmPassword && draft.confirmPassword === draft.password ? null : 'Passwords must match',
  };
}

export function hasNoProblems(problems: SignupProblems): boolean {
  return Object.values(problems).every((problem) => problem === null);
}
