import { describe, it, expect } from 'vitest';
import { signupSchema } from '@/lib/schemas/auth';
import {
  hasNoProblems,
  phoneKeystroke,
  signupPayload,
  signupProblems,
  suggestUsername,
  usernameKeystroke,
  type SignupDraft,
} from './signupForm';

function serverAccepts(field: keyof typeof signupSchema.shape, value: string): boolean {
  return signupSchema.shape[field].safeParse(value).success;
}

function draftLikeARealUser(): SignupDraft {
  return {
    name: '  Harsh Vardhan ',
    username: suggestUsername('Harsh Vardhan'),
    email: 'harsh@example.com',
    phone: phoneKeystroke('+91 93914 02634'),
    dobParts: { day: '16', month: '8', year: '2002' },
    password: 'cards4life!',
    confirmPassword: 'cards4life!',
  };
}

describe('signup submission', () => {
  it('lets a typical autofilled form through and the server schema accepts the payload', () => {
    const draft = draftLikeARealUser();
    expect(hasNoProblems(signupProblems(draft, 'available', serverAccepts))).toBe(true);
    const parsed = signupSchema.safeParse(signupPayload(draft));
    expect(parsed.success).toBe(true);
  });

  it('builds the exact payload the API expects', () => {
    expect(signupPayload(draftLikeARealUser())).toEqual({
      name: 'Harsh Vardhan',
      username: 'harsh_vardhan',
      email: 'harsh@example.com',
      phone: '+919391402634',
      dob: '2002-08-16',
      password: 'cards4life!',
    });
  });

  it('never blocks submission while availability is still loading or could not be checked', () => {
    for (const availability of ['idle', 'checking', 'unknown'] as const) {
      expect(hasNoProblems(signupProblems(draftLikeARealUser(), availability, serverAccepts))).toBe(true);
    }
  });

  it('blocks a username the server already has', () => {
    const problems = signupProblems(draftLikeARealUser(), 'taken', serverAccepts);
    expect(problems.username).toBe('That username is taken');
  });

  it('accepts a hand-typed username with a space once the space is stripped', () => {
    const draft = { ...draftLikeARealUser(), username: usernameKeystroke('harsh v').value };
    expect(hasNoProblems(signupProblems(draft, 'available', serverAccepts))).toBe(true);
    expect(signupSchema.safeParse(signupPayload(draft)).success).toBe(true);
  });

  it('flags every field the server would reject, so the form never posts a doomed request', () => {
    const problems = signupProblems(
      {
        name: '   ',
        username: 'ab',
        email: 'a@b.c',
        phone: '12345',
        dobParts: { day: '31', month: '2', year: '2001' },
        password: 'short',
        confirmPassword: 'other',
      },
      'idle',
      serverAccepts
    );
    expect(Object.entries(problems).filter(([, problem]) => problem === null)).toEqual([]);
  });

  it('matches the server on emails the loose client regex would allow', () => {
    const draft = { ...draftLikeARealUser(), email: 'a@b.c' };
    expect(signupSchema.shape.email.safeParse('a@b.c').success).toBe(false);
    expect(signupProblems(draft, 'available', serverAccepts).email).not.toBeNull();
  });
});
